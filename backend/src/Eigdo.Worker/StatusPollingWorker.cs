using Eigdo.Application.Interfaces;
using Eigdo.Domain.Enums;
using Eigdo.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Eigdo.Worker;

/// <summary>
/// Periodically checks the status of submitted documents that haven't received a final status yet.
/// Handles cases where the initial polling timed out or the worker restarted.
/// </summary>
public class StatusPollingWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<StatusPollingWorker> _logger;
    private const int PollIntervalMs = 30000; // 30 seconds

    public StatusPollingWorker(IServiceScopeFactory scopeFactory, ILogger<StatusPollingWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("StatusPollingWorker started. Checking every {Interval}s", PollIntervalMs / 1000);

        // Initial delay to let the main worker start first
        await Task.Delay(5000, stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<IEigdoDbContext>();
                var provider = scope.ServiceProvider.GetRequiredService<IFiscalProvider>();

                var submittedDocs = await db.EcfDocuments
                    .Where(d => d.Status == EcfDocumentStatus.Submitted && d.TrackId != null)
                    .Where(d => d.SubmittedAtUtc < DateTime.UtcNow.AddMinutes(-1)) // At least 1 min old
                    .OrderBy(d => d.SubmittedAtUtc)
                    .Take(20)
                    .ToListAsync(stoppingToken);

                foreach (var doc in submittedDocs)
                {
                    var status = await provider.GetStatusAsync(doc.TrackId!, stoppingToken);

                    if (status.IsAccepted)
                    {
                        doc.Status = EcfDocumentStatus.Accepted;
                        doc.AcceptedAtUtc = DateTime.UtcNow;
                        doc.Encf = status.Encf;
                        doc.AlanubeResponseJson = status.ResponseJson;
                        _logger.LogInformation("StatusPoll: Document {DocId} ACCEPTED with e-NCF {Encf} (TrackId: {TrackId})", doc.Id, status.Encf, doc.TrackId);
                    }
                    else if (status.IsRejected)
                    {
                        doc.Status = EcfDocumentStatus.Rejected;
                        doc.ErrorMessage = status.Message;
                        doc.AlanubeResponseJson = status.ResponseJson;
                        _logger.LogWarning("StatusPoll: Document {DocId} REJECTED (TrackId: {TrackId})", doc.Id, doc.TrackId);
                    }
                    // else still pending, will check again next cycle
                }

                if (submittedDocs.Count > 0)
                    await db.SaveChangesAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in StatusPollingWorker");
            }

            await Task.Delay(PollIntervalMs, stoppingToken);
        }
    }
}
