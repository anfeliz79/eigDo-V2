using Eigdo.Application.Services;
using Eigdo.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Eigdo.Api.Controllers;

/// <summary>
/// Receives QuickBooks Online webhook notifications.
/// This endpoint is called by Intuit's servers when entities change in connected QBO companies.
/// </summary>
[ApiController]
[Route("api/qbo-webhook")]
[AllowAnonymous]
public class QboWebhookController : ControllerBase
{
    private readonly QboWebhookHandler _handler;
    private readonly IQboConfigProvider _qboConfig;
    private readonly ILogger<QboWebhookController> _logger;

    public QboWebhookController(QboWebhookHandler handler, IQboConfigProvider qboConfig, ILogger<QboWebhookController> logger)
    {
        _handler = handler;
        _qboConfig = qboConfig;
        _logger = logger;
    }

    /// <summary>
    /// POST api/qbo-webhook
    /// Intuit sends webhook notifications here. Must always return 200 OK quickly.
    /// The payload is HMAC-SHA256 signed with the webhook verifier token.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> ReceiveWebhook(CancellationToken ct)
    {
        // Read raw body for signature verification
        string rawBody;
        using (var reader = new StreamReader(Request.Body))
        {
            rawBody = await reader.ReadToEndAsync(ct);
        }

        if (string.IsNullOrEmpty(rawBody))
        {
            _logger.LogWarning("QBO webhook received empty body");
            return Ok();
        }

        // Verify HMAC-SHA256 signature
        var verifierToken = await _qboConfig.GetWebhookVerifierTokenAsync();
        if (string.IsNullOrEmpty(verifierToken))
        {
            _logger.LogError("QBO_WEBHOOK_VERIFIER_TOKEN is not configured");
            return Ok();
        }

        var signature = Request.Headers["intuit-signature"].FirstOrDefault();
        if (string.IsNullOrEmpty(signature))
        {
            _logger.LogWarning("QBO webhook missing intuit-signature header");
            return Ok();
        }

        if (!QboWebhookHandler.VerifySignature(rawBody, signature, verifierToken))
        {
            _logger.LogWarning("QBO webhook signature verification failed");
            return Ok();
        }

        // Process the webhook payload
        try
        {
            await _handler.ProcessAsync(rawBody, ct);
        }
        catch (Exception ex)
        {
            // Log but still return 200 — QBO will retry on non-200 responses
            _logger.LogError(ex, "Error processing QBO webhook payload");
        }

        return Ok();
    }
}
