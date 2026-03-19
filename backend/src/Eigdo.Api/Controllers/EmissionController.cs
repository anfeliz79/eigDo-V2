using System.Text.Json;
using Eigdo.Application.Services;
using Eigdo.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Eigdo.Api.Controllers;

/// <summary>
/// Handles manual and webhook-triggered e-CF emission.
/// Full flow: PayloadTransformer (5 cycles) → EmissionOrchestrator (validate + e-NCF + queue)
/// </summary>
[Authorize]
[Route("api/emission")]
public class EmissionController : EigdoControllerBase
{
    private readonly PayloadTransformer _transformer;
    private readonly EmissionOrchestrator _orchestrator;
    private readonly ILogger<EmissionController> _logger;

    public EmissionController(
        PayloadTransformer transformer,
        EmissionOrchestrator orchestrator,
        ILogger<EmissionController> logger)
    {
        _transformer = transformer;
        _orchestrator = orchestrator;
        _logger = logger;
    }

    /// <summary>
    /// POST /api/emission/transform-and-queue
    /// Takes a raw QBO document JSON, transforms it through the 5 cycles, then queues for Alanube submission.
    /// </summary>
    [HttpPost("transform-and-queue")]
    public async Task<IActionResult> TransformAndQueue([FromBody] TransformAndQueueRequest request, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(new { message = "Company not found in token" });

        if (!Enum.TryParse<EcfType>(request.EcfType, true, out var ecfType))
            return BadRequest(new { message = $"Invalid e-CF type: {request.EcfType}" });

        if (string.IsNullOrEmpty(request.QboDocumentJson))
            return BadRequest(new { message = "QBO document JSON is required" });

        // Step 1: Transform QBO data → Alanube payload using 5 mapping cycles
        try
        {
            var payload = await _transformer.TransformAsync(
                companyId.Value, ecfType, request.QboDocumentJson, ct);

            var payloadJson = JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
            });

            // Step 2: Validate + assign e-NCF + queue for worker submission
            var (document, error) = await _orchestrator.PrepareAndQueueAsync(
                companyId.Value,
                ecfType,
                request.QboSourceId ?? "",
                request.QboDocNumber ?? "",
                payloadJson,
                payload.Ecf.Totales.MontoTotal,
                payload.Ecf.Totales.TotalItbis,
                request.OriginalEcfDocumentId,
                ct);

            if (error is not null && document?.Status == EcfDocumentStatus.BlockedByConfig)
            {
                return UnprocessableEntity(new
                {
                    message = error,
                    documentId = document.Id,
                    status = "BlockedByConfig"
                });
            }

            if (error is not null)
            {
                return BadRequest(new { message = error });
            }

            return Ok(new
            {
                message = "Document queued for emission",
                documentId = document!.Id,
                encf = document.Encf,
                status = document.Status.ToString(),
                totalAmount = document.TotalAmount,
                taxAmount = document.TaxAmount
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Emission failed for company {CompanyId}", companyId);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during emission for company {CompanyId}", companyId);
            return StatusCode(500, new { message = "Internal error during emission" });
        }
    }

    /// <summary>
    /// POST /api/emission/preview
    /// Transforms a QBO document but does NOT queue it — preview only (dry run).
    /// </summary>
    [HttpPost("preview")]
    public async Task<IActionResult> Preview([FromBody] PreviewRequest request, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null) return Unauthorized();

        if (!Enum.TryParse<EcfType>(request.EcfType, true, out var ecfType))
            return BadRequest(new { message = $"Invalid e-CF type: {request.EcfType}" });

        try
        {
            var payload = await _transformer.TransformAsync(
                companyId.Value, ecfType, request.QboDocumentJson, ct);

            return Ok(new
            {
                message = "Preview generated (not queued)",
                ecfType = ecfType.ToString(),
                totals = new
                {
                    payload.Ecf.Totales.MontoGravadoTotal,
                    payload.Ecf.Totales.TotalItbis,
                    payload.Ecf.Totales.MontoTotal,
                    payload.Ecf.Totales.TotalDescuento,
                    payload.Ecf.Totales.ItbisRetenido,
                    payload.Ecf.Totales.IsrRetenido,
                },
                lineCount = payload.Ecf.DetallesItems.Item.Count,
                emisor = payload.Ecf.Emisor.RazonSocial,
                comprador = payload.Ecf.Comprador?.RazonSocial
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

public record TransformAndQueueRequest(
    string EcfType,
    string QboDocumentJson,
    string? QboSourceId = null,
    string? QboDocNumber = null,
    Guid? OriginalEcfDocumentId = null);

public record PreviewRequest(
    string EcfType,
    string QboDocumentJson);
