using Eigdo.Application.Interfaces;
using Eigdo.Domain.Entities.Emission;
using Eigdo.Domain.Enums;
using Eigdo.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Eigdo.Worker;

public class EmissionWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<EmissionWorker> _logger;
    private const int PollIntervalMs = 3000;
    private const int MaxRetries = 3;
    private const int BatchSize = 10;

    public EmissionWorker(IServiceScopeFactory scopeFactory, ILogger<EmissionWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("EmissionWorker started. Polling every {Interval}ms, batch size {Batch}", PollIntervalMs, BatchSize);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var processed = await ProcessQueuedDocumentsAsync(stoppingToken);
                if (processed == 0)
                {
                    await Task.Delay(PollIntervalMs, stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled error in EmissionWorker loop");
                await Task.Delay(PollIntervalMs * 2, stoppingToken);
            }
        }

        _logger.LogInformation("EmissionWorker stopped");
    }

    private async Task<int> ProcessQueuedDocumentsAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IEigdoDbContext>();
        var fiscalProvider = scope.ServiceProvider.GetRequiredService<IFiscalProvider>();

        // Fetch queued documents
        var documents = await db.EcfDocuments
            .Where(d => d.Status == EcfDocumentStatus.Queued || d.Status == EcfDocumentStatus.RetryPending)
            .Where(d => d.RetryCount < MaxRetries)
            .OrderBy(d => d.CreatedAtUtc)
            .Take(BatchSize)
            .ToListAsync(ct);

        if (documents.Count == 0) return 0;

        _logger.LogInformation("Processing {Count} queued documents", documents.Count);

        foreach (var doc in documents)
        {
            try
            {
                await ProcessDocumentAsync(db, fiscalProvider, doc, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing document {DocId} (e-NCF: {Encf})", doc.Id, doc.Encf);
                await HandleFailure(db, doc, ex.Message, ct);
            }
        }

        return documents.Count;
    }

    private async Task ProcessDocumentAsync(IEigdoDbContext db, IFiscalProvider provider, EcfDocument doc, CancellationToken ct)
    {
        _logger.LogInformation("Submitting document {DocId} type {EcfType} e-NCF {Encf}", doc.Id, doc.EcfType, doc.Encf);

        // Transition to Submitted
        var previousStatus = doc.Status;
        doc.Status = EcfDocumentStatus.Submitted;
        doc.SubmittedAtUtc = DateTime.UtcNow;
        doc.RetryCount++;
        doc.LastRetryUtc = DateTime.UtcNow;

        AddEvent(db, doc, previousStatus, EcfDocumentStatus.Submitted, "Submitting to fiscal provider");
        await db.SaveChangesAsync(ct);

        // Submit to Alanube
        var result = await provider.SubmitAsync(doc, doc.AlanubePayloadJson ?? "{}", ct);

        if (result.Success && result.TrackId != null)
        {
            doc.TrackId = result.TrackId;
            doc.AlanubeResponseJson = result.ResponseJson;

            // Poll for status (Alanube processes async)
            await PollForStatusAsync(db, provider, doc, ct);
        }
        else
        {
            // Submission failed
            await HandleFailure(db, doc, result.ErrorMessage ?? "Unknown submission error", ct);
        }
    }

    private async Task PollForStatusAsync(IEigdoDbContext db, IFiscalProvider provider, EcfDocument doc, CancellationToken ct)
    {
        const int maxPolls = 10;
        const int pollDelayMs = 2000;

        for (int i = 0; i < maxPolls; i++)
        {
            await Task.Delay(pollDelayMs, ct);

            var status = await provider.GetStatusAsync(doc.TrackId!, ct);

            if (status.IsAccepted)
            {
                doc.Status = EcfDocumentStatus.Accepted;
                doc.AcceptedAtUtc = DateTime.UtcNow;
                doc.AlanubeResponseJson = status.ResponseJson;
                AddEvent(db, doc, EcfDocumentStatus.Submitted, EcfDocumentStatus.Accepted, status.Message ?? "Document accepted by DGII");

                _logger.LogInformation("Document {DocId} ACCEPTED. e-NCF: {Encf}, TrackId: {TrackId}", doc.Id, doc.Encf, doc.TrackId);
                await db.SaveChangesAsync(ct);
                return;
            }

            if (status.IsRejected)
            {
                doc.Status = EcfDocumentStatus.Rejected;
                doc.ErrorMessage = status.Message;
                doc.AlanubeResponseJson = status.ResponseJson;
                AddEvent(db, doc, EcfDocumentStatus.Submitted, EcfDocumentStatus.Rejected, status.Message ?? "Document rejected");

                _logger.LogWarning("Document {DocId} REJECTED. e-NCF: {Encf}, Reason: {Reason}", doc.Id, doc.Encf, status.Message);
                await db.SaveChangesAsync(ct);
                return;
            }

            // Still pending, continue polling
            _logger.LogDebug("Document {DocId} still pending (poll {Poll}/{Max})", doc.Id, i + 1, maxPolls);
        }

        // Max polls reached, mark for retry
        doc.Status = EcfDocumentStatus.RetryPending;
        doc.ErrorMessage = "Status polling timeout - will retry";
        AddEvent(db, doc, EcfDocumentStatus.Submitted, EcfDocumentStatus.RetryPending, "Polling timeout");

        _logger.LogWarning("Document {DocId} polling timeout after {Max} attempts. Will retry.", doc.Id, maxPolls);
        await db.SaveChangesAsync(ct);
    }

    private async Task HandleFailure(IEigdoDbContext db, EcfDocument doc, string error, CancellationToken ct)
    {
        if (doc.RetryCount >= MaxRetries)
        {
            doc.Status = EcfDocumentStatus.Rejected;
            doc.ErrorMessage = $"Max retries ({MaxRetries}) exceeded. Last error: {error}";
            AddEvent(db, doc, doc.Status, EcfDocumentStatus.Rejected, doc.ErrorMessage);
            _logger.LogError("Document {DocId} FAILED permanently after {Retries} retries: {Error}", doc.Id, MaxRetries, error);
        }
        else
        {
            doc.Status = EcfDocumentStatus.RetryPending;
            doc.ErrorMessage = error;
            AddEvent(db, doc, doc.Status, EcfDocumentStatus.RetryPending, $"Retry {doc.RetryCount}/{MaxRetries}: {error}");
            _logger.LogWarning("Document {DocId} retry {Count}/{Max}: {Error}", doc.Id, doc.RetryCount, MaxRetries, error);
        }

        await db.SaveChangesAsync(ct);
    }

    private static void AddEvent(IEigdoDbContext db, EcfDocument doc, EcfDocumentStatus from, EcfDocumentStatus to, string? message)
    {
        db.EcfEvents.Add(new EcfEvent
        {
            EcfDocumentId = doc.Id,
            FromStatus = from,
            ToStatus = to,
            Message = message
        });
    }
}
