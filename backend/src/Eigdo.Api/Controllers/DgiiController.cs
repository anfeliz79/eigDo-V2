using System.Text.Json;
using System.Text.RegularExpressions;
using Eigdo.Application.DTOs;
using Eigdo.Application.DTOs.Dgii;
using Eigdo.Application.DTOs.Support;
using Eigdo.Application.Interfaces;
using Eigdo.Infrastructure.Integration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Eigdo.Api.Controllers;

public class ResolveRncRequest
{
    public string Name { get; set; } = string.Empty;
    public string? MaskedTaxId { get; set; }
}

public class ResolveRncResponse
{
    public bool Resolved { get; set; }
    public string? ResolvedRnc { get; set; }
    public string? ResolvedRazonSocial { get; set; }
    public List<DgiiRncResultDto> Candidates { get; set; } = new();
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DgiiController : ControllerBase
{
    private readonly IDgiiRncService _dgiiService;
    private readonly IEigdoDbContext _db;

    public DgiiController(IDgiiRncService dgiiService, IEigdoDbContext db)
    {
        _dgiiService = dgiiService;
        _db = db;
    }

    /// <summary>
    /// Validates an RNC against the DGII database.
    /// Returns contributor info including razón social, estado, actividad económica.
    /// </summary>
    [HttpGet("rnc/{rnc}")]
    public async Task<IActionResult> LookupRnc(string rnc, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(rnc) || rnc.Replace("-", "").Trim().Length < 9)
            return BadRequest(ApiResponse<string>.Fail("El RNC debe tener al menos 9 digitos."));

        var result = await _dgiiService.LookupRncAsync(rnc, ct);

        if (result == null)
            return NotFound(ApiResponse<string>.Fail("No se encontro el RNC en la base de datos de la DGII."));

        return Ok(ApiResponse<DgiiRncResultDto>.Ok(result));
    }

    /// <summary>
    /// Attempts to resolve a full RNC from DGII by searching the company name and matching
    /// the visible suffix of the masked QBO TaxIdentifier (e.g. "XXXX21430019" → suffix "21430019").
    /// Returns a list of candidates sorted by confidence (unique match first).
    /// </summary>
    [HttpPost("resolve-rnc")]
    public async Task<IActionResult> ResolveRnc([FromBody] ResolveRncRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length < 4)
            return BadRequest(ApiResponse<string>.Fail("El nombre debe tener al menos 4 caracteres."));

        var candidates = await _dgiiService.SearchByNameAsync(request.Name, ct);

        if (candidates.Count == 0)
            return Ok(ApiResponse<ResolveRncResponse>.Ok(new ResolveRncResponse
            {
                Resolved = false,
                Candidates = new()
            }));

        // Extract visible suffix from masked TaxId (e.g. "XXXX21430019" → "21430019", "XXXX-1234" → "1234")
        var suffix = ExtractVisibleSuffix(request.MaskedTaxId);

        List<DgiiRncResultDto> matches;
        if (!string.IsNullOrEmpty(suffix) && suffix.Length >= 4)
        {
            matches = candidates.Where(c => c.Rnc.EndsWith(suffix, StringComparison.OrdinalIgnoreCase)).ToList();
        }
        else
        {
            // No suffix available — return all candidates
            matches = candidates;
        }

        return Ok(ApiResponse<ResolveRncResponse>.Ok(new ResolveRncResponse
        {
            Resolved = matches.Count == 1,
            ResolvedRnc = matches.Count == 1 ? matches[0].Rnc : null,
            ResolvedRazonSocial = matches.Count == 1 ? matches[0].RazonSocial : null,
            Candidates = matches.Count == 1 ? matches : candidates
        }));
    }

    private static string? ExtractVisibleSuffix(string? maskedTaxId)
    {
        if (string.IsNullOrWhiteSpace(maskedTaxId)) return null;
        // Remove spaces, dashes, X characters from the start to get the visible digits
        // e.g. "XXXX 21430019" → "21430019", "XXXX-1234" → "1234", "XX63898" → "63898"
        var digits = Regex.Replace(maskedTaxId, @"[Xx\s\-]+", "");
        return digits.Length >= 4 ? digits : null;
    }

    /// <summary>
    /// Returns the certification assistance service configuration (public for authenticated users).
    /// </summary>
    [HttpGet("certification-assistance")]
    public async Task<IActionResult> GetCertificationAssistance(CancellationToken ct)
    {
        var config = await _db.CertificationAssistanceConfigs.FirstOrDefaultAsync(ct);

        if (config == null || !config.IsEnabled)
        {
            return Ok(ApiResponse<CertificationAssistanceConfigResponse>.Ok(new CertificationAssistanceConfigResponse
            {
                IsEnabled = false,
            }));
        }

        var response = new CertificationAssistanceConfigResponse
        {
            Id = config.Id,
            IsEnabled = config.IsEnabled,
            Price = config.Price,
            Currency = config.Currency,
            Title = config.Title,
            Description = config.Description,
            IncludedItems = TryDeserializeList(config.IncludedItems),
            Requirements = TryDeserializeList(config.Requirements),
            ChargeOnNextBillingCycle = config.ChargeOnNextBillingCycle,
            EstimatedDays = config.EstimatedDays,
        };

        return Ok(ApiResponse<CertificationAssistanceConfigResponse>.Ok(response));
    }

    private static List<string> TryDeserializeList(string json)
    {
        try { return JsonSerializer.Deserialize<List<string>>(json) ?? new(); }
        catch { return new(); }
    }
}
