using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Eigdo.Application.Interfaces;
using Eigdo.Domain.Entities.Emission;
using Eigdo.Domain.Enums;
using Eigdo.Domain.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Eigdo.Infrastructure.Fiscal;

public class AlanubeClient : IFiscalProvider
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AlanubeClient> _logger;
    private readonly IEigdoDbContext _db;
    private readonly string _jwtToken;

    private static readonly Dictionary<EcfType, string> EndpointMap = new()
    {
        { EcfType.E31, "/invoice-fiscals" },
        { EcfType.E32, "/invoices" },
        { EcfType.E33, "/debit-notes" },
        { EcfType.E34, "/credit-notes" },
        { EcfType.E41, "/purchases" },
        { EcfType.E43, "/minor-expenses" },
        { EcfType.E44, "/special-regimes" },
        { EcfType.E45, "/gubernamentals" },
        { EcfType.E46, "/export-supports" },
        { EcfType.E47, "/payment-abroad-supports" }
    };

    public AlanubeClient(IHttpClientFactory httpClientFactory, IConfiguration config, ILogger<AlanubeClient> logger, IEigdoDbContext db)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _db = db;
        _jwtToken = config.GetValue<string>("ALANUBE_JWT_TOKEN") ?? "";
    }

    public async Task<FiscalSubmitResult> SubmitAsync(EcfDocument document, string payloadJson, CancellationToken ct = default)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var client = _httpClientFactory.CreateClient("alanube");

        if (!EndpointMap.TryGetValue(document.EcfType, out var endpoint))
            return new FiscalSubmitResult(false, null, $"Unsupported e-CF type: {document.EcfType}", null);

        var content = new StringContent(payloadJson, Encoding.UTF8, "application/json");

        // Ensure authorization header is set
        if (!string.IsNullOrEmpty(_jwtToken))
        {
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _jwtToken);
        }

        HttpResponseMessage? response = null;
        string? responseBody = null;

        try
        {
            _logger.LogInformation("Alanube: Submitting {EcfType} to {Endpoint}", document.EcfType, endpoint);

            response = await client.PostAsync(endpoint, content, ct);
            responseBody = await response.Content.ReadAsStringAsync(ct);

            stopwatch.Stop();

            // Log the provider message
            await LogProviderMessage(document.Id, "POST", endpoint, payloadJson, responseBody, (int)response.StatusCode, stopwatch.ElapsedMilliseconds, ct);

            if (response.IsSuccessStatusCode)
            {
                // Parse tracking ID from response
                var trackId = ExtractTrackId(responseBody);
                _logger.LogInformation("Alanube: Submission successful. TrackId: {TrackId}", trackId);
                return new FiscalSubmitResult(true, trackId, null, responseBody);
            }
            else
            {
                var error = $"Alanube returned HTTP {(int)response.StatusCode}: {responseBody}";
                _logger.LogWarning("Alanube: Submission failed. {Error}", error);
                return new FiscalSubmitResult(false, null, error, responseBody);
            }
        }
        catch (HttpRequestException ex)
        {
            stopwatch.Stop();
            var error = $"HTTP request failed: {ex.Message}";
            _logger.LogError(ex, "Alanube: Connection error submitting {EcfType}", document.EcfType);
            await LogProviderMessage(document.Id, "POST", endpoint, payloadJson, ex.Message, 0, stopwatch.ElapsedMilliseconds, ct);
            return new FiscalSubmitResult(false, null, error, null);
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            stopwatch.Stop();
            var error = "Request timed out";
            _logger.LogWarning("Alanube: Timeout submitting {EcfType}", document.EcfType);
            await LogProviderMessage(document.Id, "POST", endpoint, payloadJson, error, 0, stopwatch.ElapsedMilliseconds, ct);
            return new FiscalSubmitResult(false, null, error, null);
        }
    }

    public async Task<FiscalStatusResult> GetStatusAsync(string trackId, CancellationToken ct = default)
    {
        var client = _httpClientFactory.CreateClient("alanube");

        if (!string.IsNullOrEmpty(_jwtToken))
        {
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _jwtToken);
        }

        try
        {
            var response = await client.GetAsync($"/documents/{trackId}/status", ct);
            var responseBody = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                return new FiscalStatusResult(false, false, true, null, $"HTTP {(int)response.StatusCode}", responseBody);
            }

            // Parse status from Alanube response
            // Alanube typically returns: { "status": "accepted" | "rejected" | "processing", "encf": "E310000000001", "message": "..." }
            using var doc = JsonDocument.Parse(responseBody);
            var root = doc.RootElement;

            var status = root.TryGetProperty("status", out var statusProp) ? statusProp.GetString() : null;
            var message = root.TryGetProperty("message", out var msgProp) ? msgProp.GetString() : null;
            var encf = root.TryGetProperty("encf", out var encfProp) ? encfProp.GetString()
                     : root.TryGetProperty("eNCF", out var encfProp2) ? encfProp2.GetString()
                     : null;

            return status?.ToLower() switch
            {
                "accepted" or "approved" or "completed" => new FiscalStatusResult(true, false, false, encf, message, responseBody),
                "rejected" or "failed" or "error" => new FiscalStatusResult(false, true, false, null, message, responseBody),
                _ => new FiscalStatusResult(false, false, true, null, message ?? "Processing", responseBody)
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error checking status for TrackId {TrackId}", trackId);
            return new FiscalStatusResult(false, false, true, null, ex.Message, null);
        }
    }

    public async Task<FiscalAnnulResult> AnnulAsync(string encf, string reason, CancellationToken ct = default)
    {
        var client = _httpClientFactory.CreateClient("alanube");

        if (!string.IsNullOrEmpty(_jwtToken))
        {
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _jwtToken);
        }

        try
        {
            var payload = JsonSerializer.Serialize(new { encf, reason });
            var content = new StringContent(payload, Encoding.UTF8, "application/json");

            var response = await client.PostAsync("/annulments", content, ct);
            var responseBody = await response.Content.ReadAsStringAsync(ct);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Alanube: Annulment submitted for {Encf}", encf);
                return new FiscalAnnulResult(true, "Annulment submitted");
            }
            else
            {
                var error = $"Annulment failed: HTTP {(int)response.StatusCode}";
                _logger.LogWarning("Alanube: {Error} for {Encf}", error, encf);
                return new FiscalAnnulResult(false, error);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Alanube: Error annulling {Encf}", encf);
            return new FiscalAnnulResult(false, ex.Message);
        }
    }

    private string? ExtractTrackId(string responseBody)
    {
        try
        {
            using var doc = JsonDocument.Parse(responseBody);
            var root = doc.RootElement;

            // Try common Alanube response fields
            if (root.TryGetProperty("trackId", out var trackIdProp))
                return trackIdProp.GetString();
            if (root.TryGetProperty("track_id", out var trackIdSnake))
                return trackIdSnake.GetString();
            if (root.TryGetProperty("id", out var idProp))
                return idProp.GetString();

            return null;
        }
        catch
        {
            return null;
        }
    }

    private async Task LogProviderMessage(Guid docId, string method, string url, string? request, string? response, int statusCode, long durationMs, CancellationToken ct)
    {
        try
        {
            _db.ProviderMessages.Add(new ProviderMessage
            {
                EcfDocumentId = docId,
                Provider = "alanube",
                Direction = "outbound",
                HttpMethod = method,
                Url = url,
                RequestJson = request,
                ResponseJson = response,
                HttpStatusCode = statusCode,
                DurationMs = durationMs
            });
            await _db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to log provider message for document {DocId}", docId);
        }
    }
}
