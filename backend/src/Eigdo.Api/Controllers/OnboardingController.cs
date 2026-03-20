using Eigdo.Application.DTOs;
using Eigdo.Application.DTOs.Onboarding;
using Eigdo.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Eigdo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OnboardingController : EigdoControllerBase
{
    private readonly OnboardingService _onboardingService;

    public OnboardingController(OnboardingService onboardingService)
    {
        _onboardingService = onboardingService;
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetOnboardingStatus(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        var (result, error) = await _onboardingService.GetOnboardingStatusAsync(companyId.Value, ct);

        if (error is not null)
            return BadRequest(ApiResponse<OnboardingStatusResponse>.Fail(error));

        return Ok(ApiResponse<OnboardingStatusResponse>.Ok(result!));
    }

    [HttpPost("advance")]
    public async Task<IActionResult> AdvanceStep([FromBody] AdvanceStepRequest request, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        var (result, error) = await _onboardingService.AdvanceStepAsync(companyId.Value, request, ct);

        if (error is not null)
            return BadRequest(ApiResponse<OnboardingStatusResponse>.Fail(error));

        return Ok(ApiResponse<OnboardingStatusResponse>.Ok(result!));
    }

    [HttpPost("complete")]
    public async Task<IActionResult> CompleteOnboarding(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        var (result, error) = await _onboardingService.CompleteOnboardingAsync(companyId.Value, ct);

        if (error is not null)
            return BadRequest(ApiResponse<OnboardingStatusResponse>.Fail(error));

        return Ok(ApiResponse<OnboardingStatusResponse>.Ok(result!));
    }
}
