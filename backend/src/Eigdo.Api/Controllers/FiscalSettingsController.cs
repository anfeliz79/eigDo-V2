using Eigdo.Application.DTOs;
using Eigdo.Application.DTOs.Fiscal;
using Eigdo.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Eigdo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FiscalSettingsController : EigdoControllerBase
{
    private readonly FiscalSettingsService _fiscalSettingsService;

    public FiscalSettingsController(FiscalSettingsService fiscalSettingsService)
    {
        _fiscalSettingsService = fiscalSettingsService;
    }

    [HttpGet]
    public async Task<IActionResult> GetFiscalSettings(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Company claim not found in token."));

        var (result, error) = await _fiscalSettingsService.GetFiscalSettingsAsync(companyId.Value, ct);

        if (error is not null)
            return BadRequest(ApiResponse<FiscalSettingsResponse>.Fail(error));

        return Ok(ApiResponse<FiscalSettingsResponse>.Ok(result!));
    }

    [HttpPut]
    public async Task<IActionResult> UpdateFiscalSettings([FromBody] UpdateFiscalSettingsRequest request, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Company claim not found in token."));

        var (result, error) = await _fiscalSettingsService.CreateOrUpdateFiscalSettingsAsync(companyId.Value, request, ct);

        if (error is not null)
            return BadRequest(ApiResponse<FiscalSettingsResponse>.Fail(error));

        return Ok(ApiResponse<FiscalSettingsResponse>.Ok(result!));
    }

    [HttpGet("payment-methods")]
    public async Task<IActionResult> GetPaymentMethodMappings(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Company claim not found in token."));

        var (result, error) = await _fiscalSettingsService.GetPaymentMethodMappingsAsync(companyId.Value, ct);

        if (error is not null)
            return BadRequest(ApiResponse<List<PaymentMethodMappingResponse>>.Fail(error));

        return Ok(ApiResponse<List<PaymentMethodMappingResponse>>.Ok(result!));
    }

    [HttpPut("payment-methods")]
    public async Task<IActionResult> UpdatePaymentMethodMapping([FromBody] UpdatePaymentMethodMappingRequest request, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Company claim not found in token."));

        var (result, error) = await _fiscalSettingsService.UpdatePaymentMethodMappingAsync(companyId.Value, request, ct);

        if (error is not null)
            return BadRequest(ApiResponse<PaymentMethodMappingResponse>.Fail(error));

        return Ok(ApiResponse<PaymentMethodMappingResponse>.Ok(result!));
    }

    [HttpGet("payment-conditions")]
    public async Task<IActionResult> GetPaymentConditionMappings(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Company claim not found in token."));

        var (result, error) = await _fiscalSettingsService.GetPaymentConditionMappingsAsync(companyId.Value, ct);

        if (error is not null)
            return BadRequest(ApiResponse<List<PaymentConditionMappingResponse>>.Fail(error));

        return Ok(ApiResponse<List<PaymentConditionMappingResponse>>.Ok(result!));
    }

    [HttpPut("payment-conditions")]
    public async Task<IActionResult> UpdatePaymentConditionMapping([FromBody] UpdatePaymentConditionMappingRequest request, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Company claim not found in token."));

        var (result, error) = await _fiscalSettingsService.UpdatePaymentConditionMappingAsync(companyId.Value, request, ct);

        if (error is not null)
            return BadRequest(ApiResponse<PaymentConditionMappingResponse>.Fail(error));

        return Ok(ApiResponse<PaymentConditionMappingResponse>.Ok(result!));
    }
}
