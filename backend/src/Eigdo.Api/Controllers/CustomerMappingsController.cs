using Eigdo.Application.DTOs;
using Eigdo.Application.DTOs.Mapping;
using Eigdo.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Eigdo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomerMappingsController : EigdoControllerBase
{
    private readonly CustomerMappingService _customerMappingService;

    public CustomerMappingsController(CustomerMappingService customerMappingService)
    {
        _customerMappingService = customerMappingService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        var (result, error) = await _customerMappingService.GetAllAsync(companyId.Value, ct);

        if (error is not null)
            return BadRequest(ApiResponse<List<CustomerMappingResponse>>.Fail(error));

        return Ok(ApiResponse<List<CustomerMappingResponse>>.Ok(result!));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        var (result, error) = await _customerMappingService.GetByIdAsync(companyId.Value, id, ct);

        if (error is not null)
            return NotFound(ApiResponse<CustomerMappingResponse>.Fail(error));

        return Ok(ApiResponse<CustomerMappingResponse>.Ok(result!));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCustomerMappingRequest request, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        var (result, error) = await _customerMappingService.CreateAsync(companyId.Value, request, ct);

        if (error is not null)
            return BadRequest(ApiResponse<CustomerMappingResponse>.Fail(error));

        return CreatedAtAction(nameof(GetById), new { id = result!.Id }, ApiResponse<CustomerMappingResponse>.Ok(result));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCustomerMappingRequest request, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        var (result, error) = await _customerMappingService.UpdateAsync(companyId.Value, id, request, ct);

        if (error is not null)
            return BadRequest(ApiResponse<CustomerMappingResponse>.Fail(error));

        return Ok(ApiResponse<CustomerMappingResponse>.Ok(result!));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        var error = await _customerMappingService.DeleteAsync(companyId.Value, id, ct);

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

        var (result, error) = await _customerMappingService.GetUnmappedCountAsync(companyId.Value, ct);

        if (error is not null)
            return BadRequest(ApiResponse<int>.Fail(error));

        return Ok(ApiResponse<int>.Ok(result));
    }
}
