using Eigdo.Application.DTOs;
using Eigdo.Application.DTOs.Fiscal;
using Eigdo.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Eigdo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SequencesController : EigdoControllerBase
{
    private readonly SequenceService _sequenceService;

    public SequencesController(SequenceService sequenceService)
    {
        _sequenceService = sequenceService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        var (result, error) = await _sequenceService.GetAllAsync(companyId.Value, ct);

        if (error is not null)
            return BadRequest(ApiResponse<List<SequenceResponse>>.Fail(error));

        return Ok(ApiResponse<List<SequenceResponse>>.Ok(result!));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSequenceRequest request, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        var (result, error) = await _sequenceService.CreateAsync(companyId.Value, request, ct);

        if (error is not null)
            return BadRequest(ApiResponse<SequenceResponse>.Fail(error));

        return Ok(ApiResponse<SequenceResponse>.Ok(result!));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSequenceRequest request, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        var (result, error) = await _sequenceService.UpdateAsync(companyId.Value, id, request, ct);

        if (error is not null)
            return BadRequest(ApiResponse<SequenceResponse>.Fail(error));

        return Ok(ApiResponse<SequenceResponse>.Ok(result!));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        var error = await _sequenceService.DeleteAsync(companyId.Value, id, ct);

        if (error is not null)
            return BadRequest(ApiResponse.Fail(error));

        return Ok(ApiResponse.Ok());
    }
}
