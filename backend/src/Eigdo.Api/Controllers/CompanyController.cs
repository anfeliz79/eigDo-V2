using Eigdo.Application.DTOs;
using Eigdo.Application.DTOs.Company;
using Eigdo.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Eigdo.Api.Controllers;

[ApiController]
[Route("api/companies")]
[Authorize]
public class CompanyController : EigdoControllerBase
{
    private readonly CompanyService _companyService;

    public CompanyController(CompanyService companyService)
    {
        _companyService = companyService;
    }

    /// <summary>
    /// Devuelve todas las empresas del usuario autenticado.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetMyCompanies(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<List<CompanyDto>>.Fail("Usuario no identificado."));

        var companies = await _companyService.GetUserCompaniesAsync(userId.Value, ct);

        return Ok(ApiResponse<List<CompanyDto>>.Ok(companies));
    }

    /// <summary>
    /// Crea una nueva empresa con el usuario como propietario.
    /// No requiere plan — el usuario puede suscribirse por separado.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateCompany([FromBody] CreateCompanyRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<CompanyDto>.Fail("Usuario no identificado."));

        var (company, error) = await _companyService.CreateCompanyAsync(userId.Value, request, ct);

        if (error != null)
            return BadRequest(ApiResponse<CompanyDto>.Fail(error));

        return Ok(ApiResponse<CompanyDto>.Ok(company!));
    }
}
