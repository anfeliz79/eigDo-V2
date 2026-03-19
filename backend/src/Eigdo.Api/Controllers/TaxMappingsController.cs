using Eigdo.Application.DTOs;
using Eigdo.Application.DTOs.Mapping;
using Eigdo.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Eigdo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TaxMappingsController : EigdoControllerBase
{
    private readonly TaxMappingService _taxMappingService;

    public TaxMappingsController(TaxMappingService taxMappingService)
    {
        _taxMappingService = taxMappingService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Company claim not found in token."));

        var (result, error) = await _taxMappingService.GetAllAsync(companyId.Value, ct);

        if (error is not null)
            return BadRequest(ApiResponse<List<TaxMappingResponse>>.Fail(error));

        return Ok(ApiResponse<List<TaxMappingResponse>>.Ok(result!));
    }

    [HttpPut]
    public async Task<IActionResult> CreateOrUpdate([FromBody] CreateOrUpdateTaxMappingRequest request, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Company claim not found in token."));

        var (result, error) = await _taxMappingService.CreateOrUpdateAsync(companyId.Value, request, ct);

        if (error is not null)
            return BadRequest(ApiResponse<TaxMappingResponse>.Fail(error));

        return Ok(ApiResponse<TaxMappingResponse>.Ok(result!));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Company claim not found in token."));

        var error = await _taxMappingService.DeleteAsync(companyId.Value, id, ct);

        if (error is not null)
            return BadRequest(ApiResponse.Fail(error));

        return Ok(ApiResponse.Ok());
    }
}
