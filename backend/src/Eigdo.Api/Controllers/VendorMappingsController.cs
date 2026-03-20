using Eigdo.Application.DTOs;
using Eigdo.Application.DTOs.Mapping;
using Eigdo.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Eigdo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VendorMappingsController : EigdoControllerBase
{
    private readonly VendorMappingService _vendorMappingService;

    public VendorMappingsController(VendorMappingService vendorMappingService)
    {
        _vendorMappingService = vendorMappingService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        var (result, error) = await _vendorMappingService.GetAllAsync(companyId.Value, ct);

        if (error is not null)
            return BadRequest(ApiResponse<List<VendorMappingResponse>>.Fail(error));

        return Ok(ApiResponse<List<VendorMappingResponse>>.Ok(result!));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        var (result, error) = await _vendorMappingService.GetByIdAsync(companyId.Value, id, ct);

        if (error is not null)
            return NotFound(ApiResponse<VendorMappingResponse>.Fail(error));

        return Ok(ApiResponse<VendorMappingResponse>.Ok(result!));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateVendorMappingRequest request, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        var (result, error) = await _vendorMappingService.CreateAsync(companyId.Value, request, ct);

        if (error is not null)
            return BadRequest(ApiResponse<VendorMappingResponse>.Fail(error));

        return CreatedAtAction(nameof(GetById), new { id = result!.Id }, ApiResponse<VendorMappingResponse>.Ok(result));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateVendorMappingRequest request, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        var (result, error) = await _vendorMappingService.UpdateAsync(companyId.Value, id, request, ct);

        if (error is not null)
            return BadRequest(ApiResponse<VendorMappingResponse>.Fail(error));

        return Ok(ApiResponse<VendorMappingResponse>.Ok(result!));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        var error = await _vendorMappingService.DeleteAsync(companyId.Value, id, ct);

        if (error is not null)
            return BadRequest(ApiResponse.Fail(error));

        return Ok(ApiResponse.Ok());
    }

    [HttpGet("unmapped-count")]
    public async Task<IActionResult> GetUnmappedCount(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        var (result, error) = await _vendorMappingService.GetUnmappedCountAsync(companyId.Value, ct);

        if (error is not null)
            return BadRequest(ApiResponse<int>.Fail(error));

        return Ok(ApiResponse<int>.Ok(result));
    }
}
