using Eigdo.Application.DTOs;
using Eigdo.Application.DTOs.Mapping;
using Eigdo.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Eigdo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ItemOverridesController : EigdoControllerBase
{
    private readonly ItemOverrideService _itemOverrideService;

    public ItemOverridesController(ItemOverrideService itemOverrideService)
    {
        _itemOverrideService = itemOverrideService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Company claim not found in token."));

        var (result, error) = await _itemOverrideService.GetAllAsync(companyId.Value, ct);

        if (error is not null)
            return BadRequest(ApiResponse<List<ItemOverrideResponse>>.Fail(error));

        return Ok(ApiResponse<List<ItemOverrideResponse>>.Ok(result!));
    }

    [HttpPut]
    public async Task<IActionResult> CreateOrUpdate([FromBody] CreateOrUpdateItemOverrideRequest request, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Company claim not found in token."));

        var (result, error) = await _itemOverrideService.CreateOrUpdateAsync(companyId.Value, request, ct);

        if (error is not null)
            return BadRequest(ApiResponse<ItemOverrideResponse>.Fail(error));

        return Ok(ApiResponse<ItemOverrideResponse>.Ok(result!));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Company claim not found in token."));

        var error = await _itemOverrideService.DeleteAsync(companyId.Value, id, ct);

        if (error is not null)
            return BadRequest(ApiResponse.Fail(error));

        return Ok(ApiResponse.Ok());
    }
}
