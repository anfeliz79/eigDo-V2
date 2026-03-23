using Eigdo.Application.DTOs;
using Eigdo.Application.DTOs.Mapping;
using Eigdo.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Eigdo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FieldMappingsController : EigdoControllerBase
{
    private readonly FieldMappingService _fieldMappingService;

    public FieldMappingsController(FieldMappingService fieldMappingService)
    {
        _fieldMappingService = fieldMappingService;
    }

    /// <summary>
    /// Obtiene los mapeos de campo para un tipo de entidad (Customer, Vendor, Item).
    /// </summary>
    [HttpGet("{entityType}")]
    public async Task<IActionResult> GetMappings(string entityType, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        var (result, error) = await _fieldMappingService.GetMappingsAsync(companyId.Value, entityType, ct);

        if (error is not null)
            return BadRequest(ApiResponse<List<FieldMappingResponse>>.Fail(error));

        return Ok(ApiResponse<List<FieldMappingResponse>>.Ok(result!));
    }

    /// <summary>
    /// Guarda/actualiza mapeos de campo en lote para un tipo de entidad.
    /// Reemplaza todos los mapeos existentes para ese tipo.
    /// </summary>
    [HttpPut("{entityType}")]
    public async Task<IActionResult> SaveMappings(string entityType, [FromBody] SaveFieldMappingsRequest request, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        var (result, error) = await _fieldMappingService.SaveMappingsAsync(companyId.Value, entityType, request.Mappings, ct);

        if (error is not null)
            return BadRequest(ApiResponse<List<FieldMappingResponse>>.Fail(error));

        return Ok(ApiResponse<List<FieldMappingResponse>>.Ok(result!));
    }
}
