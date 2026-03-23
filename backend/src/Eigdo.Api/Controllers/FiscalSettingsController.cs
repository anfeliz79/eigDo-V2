using System.Security.Cryptography.X509Certificates;
using Eigdo.Application.DTOs;
using Eigdo.Application.DTOs.Fiscal;
using Eigdo.Application.Interfaces;
using Eigdo.Application.Services;
using Eigdo.Domain.Entities.Fiscal;
using Eigdo.Domain.Interfaces;
using Eigdo.Infrastructure.Fiscal;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Eigdo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FiscalSettingsController : EigdoControllerBase
{
    private readonly FiscalSettingsService _fiscalSettingsService;
    private readonly IEigdoDbContext _db;
    private readonly IDataProtector _protector;
    private readonly IAuditService _audit;
    private readonly AlanubeClient _alanubeClient;
    private readonly ILogger<FiscalSettingsController> _logger;

    private const long MaxCertificateSize = 10 * 1024 * 1024; // 10 MB
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase) { ".p12", ".pfx" };

    public FiscalSettingsController(
        FiscalSettingsService fiscalSettingsService,
        IEigdoDbContext db,
        IDataProtectionProvider dataProtection,
        IAuditService audit,
        AlanubeClient alanubeClient,
        ILogger<FiscalSettingsController> logger)
    {
        _fiscalSettingsService = fiscalSettingsService;
        _db = db;
        _protector = dataProtection.CreateProtector("Eigdo.Certificate");
        _audit = audit;
        _alanubeClient = alanubeClient;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetFiscalSettings(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

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
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

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
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

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
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

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
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

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
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        var (result, error) = await _fiscalSettingsService.UpdatePaymentConditionMappingAsync(companyId.Value, request, ct);

        if (error is not null)
            return BadRequest(ApiResponse<PaymentConditionMappingResponse>.Fail(error));

        return Ok(ApiResponse<PaymentConditionMappingResponse>.Ok(result!));
    }

    [HttpPost("certificate")]
    [RequestSizeLimit(MaxCertificateSize)]
    public async Task<IActionResult> UploadCertificate([FromForm] IFormFile certificate, [FromForm] string password, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        // Validate extension
        var ext = Path.GetExtension(certificate.FileName);
        if (!AllowedExtensions.Contains(ext))
            return BadRequest(ApiResponse<object>.Fail("Solo se permiten archivos .p12 o .pfx"));

        // Validate size
        if (certificate.Length > MaxCertificateSize)
            return BadRequest(ApiResponse<object>.Fail("El archivo no puede exceder 10 MB."));

        // Read file bytes
        byte[] certBytes;
        using (var ms = new MemoryStream())
        {
            await certificate.CopyToAsync(ms, ct);
            certBytes = ms.ToArray();
        }

        // Try to load the certificate with the provided password
        X509Certificate2 x509;
        try
        {
            x509 = new X509Certificate2(certBytes, password, X509KeyStorageFlags.EphemeralKeySet);
        }
        catch (Exception)
        {
            return BadRequest(ApiResponse<object>.Fail("No se pudo abrir el certificado. Verifique que la contrasena sea correcta y que el archivo sea un certificado valido."));
        }

        using (x509)
        {
            // Encrypt and store
            var encryptedData = _protector.Protect(certBytes);
            var encryptedPassword = _protector.Protect(System.Text.Encoding.UTF8.GetBytes(password));

            // Deactivate any existing certificate
            var existing = await _db.CertificateStores
                .Where(c => c.CompanyId == companyId.Value && c.IsActive)
                .ToListAsync(ct);
            foreach (var old in existing)
                old.IsActive = false;

            // Create new store entry
            var store = new CertificateStore
            {
                CompanyId = companyId.Value,
                EncryptedCertificateData = encryptedData,
                EncryptedPassword = Convert.ToBase64String(encryptedPassword),
                SubjectName = x509.SubjectName.Name,
                IssuerName = x509.IssuerName.Name,
                SerialNumber = x509.SerialNumber,
                ValidFromUtc = x509.NotBefore.ToUniversalTime(),
                ValidToUtc = x509.NotAfter.ToUniversalTime(),
                IsActive = true,
            };
            _db.CertificateStores.Add(store);

            // Update FiscalSettings flags
            var fs = await _db.FiscalSettings.FirstOrDefaultAsync(f => f.CompanyId == companyId.Value, ct);
            if (fs != null)
            {
                fs.CertificateConfigured = true;
                fs.CertificateExpiresUtc = x509.NotAfter.ToUniversalTime();
                fs.UpdatedAtUtc = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync(ct);
            await _audit.LogAsync(companyId.Value, null, "certificate.uploaded", "CertificateStore", store.Id.ToString(), ct: ct);

            // Auto-register in Alanube if not already registered
            await TryRegisterInAlanubeAsync(companyId.Value, certBytes, password, ct);

            var daysUntilExpiry = (int)(x509.NotAfter.ToUniversalTime() - DateTime.UtcNow).TotalDays;

            var info = new CertificateInfoResponse
            {
                Configured = true,
                Subject = x509.SubjectName.Name,
                Issuer = x509.IssuerName.Name,
                ExpiresUtc = x509.NotAfter.ToUniversalTime(),
                DaysUntilExpiry = daysUntilExpiry
            };

            return Ok(ApiResponse<CertificateInfoResponse>.Ok(info));
        }
    }

    [HttpGet("certificate")]
    public async Task<IActionResult> GetCertificateStatus(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        var store = await _db.CertificateStores
            .Where(c => c.CompanyId == companyId.Value && c.IsActive)
            .OrderByDescending(c => c.CreatedAtUtc)
            .FirstOrDefaultAsync(ct);

        if (store == null)
        {
            return Ok(ApiResponse<CertificateInfoResponse>.Ok(new CertificateInfoResponse
            {
                Configured = false
            }));
        }

        var daysUntilExpiry = store.ValidToUtc.HasValue
            ? (int)(store.ValidToUtc.Value - DateTime.UtcNow).TotalDays
            : (int?)null;

        return Ok(ApiResponse<CertificateInfoResponse>.Ok(new CertificateInfoResponse
        {
            Configured = true,
            Subject = store.SubjectName,
            Issuer = store.IssuerName,
            ExpiresUtc = store.ValidToUtc,
            DaysUntilExpiry = daysUntilExpiry
        }));
    }

    /// <summary>
    /// Intenta registrar la empresa en Alanube como empresa asociada (reseller model).
    /// Si la empresa ya tiene AlanubeCompanyId, actualiza solo el certificado.
    /// Falla silenciosamente si Alanube no esta configurado o si faltan datos fiscales.
    /// </summary>
    private async Task TryRegisterInAlanubeAsync(Guid companyId, byte[] certBytes, string certPassword, CancellationToken ct)
    {
        try
        {
            var company = await _db.Companies
                .Include(c => c.FiscalSettings)
                .FirstOrDefaultAsync(c => c.Id == companyId, ct);

            if (company?.FiscalSettings == null)
                return;

            var fs = company.FiscalSettings;

            // Need at least RNC to register
            if (string.IsNullOrEmpty(fs.Rnc))
                return;

            // If already registered, update the certificate
            if (!string.IsNullOrEmpty(company.AlanubeCompanyId))
            {
                _logger.LogInformation(
                    "Empresa {CompanyId} ya registrada en Alanube ({AlanubeId}). Actualizando certificado.",
                    companyId, company.AlanubeCompanyId);

                var (success, error) = await _alanubeClient.UpdateCompanyCertificateAsync(
                    company.AlanubeCompanyId, certBytes, certPassword);

                if (!success)
                    _logger.LogWarning("No se pudo actualizar certificado en Alanube: {Error}", error);

                return;
            }

            // Resolve province and municipality names
            string provinceName = "";
            string municipalityName = "";

            if (fs.ProvinciaDgiiId.HasValue)
            {
                var prov = await _db.DgiiProvinces
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id == fs.ProvinciaDgiiId.Value, ct);
                provinceName = prov?.Name ?? "";
            }

            if (fs.MunicipioDgiiId.HasValue)
            {
                var mun = await _db.DgiiMunicipalities
                    .AsNoTracking()
                    .FirstOrDefaultAsync(m => m.Id == fs.MunicipioDgiiId.Value, ct);
                municipalityName = mun?.Name ?? "";
            }

            var (alanubeCompanyId, regError) = await _alanubeClient.CreateAssociatedCompanyAsync(
                rnc: fs.Rnc,
                companyName: fs.RazonSocial ?? company.Name,
                tradeName: fs.NombreComercial ?? company.Name,
                address: fs.Direccion ?? "",
                province: provinceName,
                municipality: municipalityName,
                phone: fs.Telefono ?? "",
                email: fs.Email ?? "",
                certificateP12: certBytes,
                certificatePassword: certPassword);

            if (!string.IsNullOrEmpty(alanubeCompanyId))
            {
                company.AlanubeCompanyId = alanubeCompanyId;
                company.UpdatedAtUtc = DateTime.UtcNow;
                await _db.SaveChangesAsync(ct);

                _logger.LogInformation(
                    "Empresa {CompanyId} registrada en Alanube como empresa asociada. AlanubeCompanyId={AlanubeId}",
                    companyId, alanubeCompanyId);
            }
            else
            {
                _logger.LogWarning(
                    "No se pudo registrar empresa {CompanyId} en Alanube: {Error}",
                    companyId, regError);
            }
        }
        catch (Exception ex)
        {
            // Do not fail the certificate upload if Alanube registration fails
            _logger.LogError(ex, "Error durante el registro automatico en Alanube para empresa {CompanyId}", companyId);
        }
    }
}
