using System.Text.Json;
using Eigdo.Application.DTOs;
using Eigdo.Application.DTOs.Dgii;
using Eigdo.Application.DTOs.Support;
using Eigdo.Application.Interfaces;
using Eigdo.Infrastructure.Integration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Eigdo.Api.Controllers;

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
