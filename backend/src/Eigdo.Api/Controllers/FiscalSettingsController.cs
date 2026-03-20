using System.Security.Cryptography.X509Certificates;
using Eigdo.Application.DTOs;
using Eigdo.Application.DTOs.Fiscal;
using Eigdo.Application.Interfaces;
using Eigdo.Application.Services;
using Eigdo.Domain.Entities.Fiscal;
using Eigdo.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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

    private const long MaxCertificateSize = 10 * 1024 * 1024; // 10 MB
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase) { ".p12", ".pfx" };

    public FiscalSettingsController(
        FiscalSettingsService fiscalSettingsService,
        IEigdoDbContext db,
        IDataProtectionProvider dataProtection,
        IAuditService audit)
    {
        _fiscalSettingsService = fiscalSettingsService;
        _db = db;
        _protector = dataProtection.CreateProtector("Eigdo.Certificate");
        _audit = audit;
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
}
