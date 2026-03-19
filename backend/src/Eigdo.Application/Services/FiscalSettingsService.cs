using Eigdo.Application.DTOs.Fiscal;
using Eigdo.Application.Interfaces;
using Eigdo.Domain.Entities.Fiscal;
using Eigdo.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Eigdo.Application.Services;

public class FiscalSettingsService
{
    private readonly IEigdoDbContext _db;
    private readonly IAuditService _audit;

    public FiscalSettingsService(IEigdoDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<(FiscalSettingsResponse? Result, string? Error)> GetFiscalSettingsAsync(
        Guid companyId, CancellationToken ct = default)
    {
        var fs = await _db.FiscalSettings
            .FirstOrDefaultAsync(f => f.CompanyId == companyId, ct);

        if (fs == null)
            return (null, "Fiscal settings not found for this company.");

        return (MapToResponse(fs), null);
    }

    public async Task<(FiscalSettingsResponse? Result, string? Error)> GetAsync(
        Guid companyId, CancellationToken ct = default)
    {
        return await GetFiscalSettingsAsync(companyId, ct);
    }

    public async Task<(FiscalSettingsResponse? Result, string? Error)> CreateOrUpdateFiscalSettingsAsync(
        Guid companyId, UpdateFiscalSettingsRequest request, CancellationToken ct = default)
    {
        var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == companyId, ct);
        if (company == null)
            return (null, "Company not found.");

        var fs = await _db.FiscalSettings
            .FirstOrDefaultAsync(f => f.CompanyId == companyId, ct);

        var isNew = fs == null;

        if (isNew)
        {
            fs = new FiscalSettings { CompanyId = companyId };
            _db.FiscalSettings.Add(fs);
        }

        fs!.Rnc = request.Rnc;
        fs.RazonSocial = request.RazonSocial;
        fs.NombreComercial = request.NombreComercial;
        fs.Direccion = request.Direccion;
        fs.ProvinciaDgiiId = request.ProvinciaDgiiId;
        fs.MunicipioDgiiId = request.MunicipioDgiiId;
        fs.Telefono = request.Telefono;
        fs.Email = request.Email;
        fs.DefaultIncomeType = request.DefaultIncomeType;
        fs.DefaultUnitMeasure = request.DefaultUnitMeasure;
        fs.DefaultGoodServiceIndicator = request.DefaultGoodServiceIndicator;
        fs.TaxAmountIndicator = request.TaxAmountIndicator;
        fs.DefaultNoTaxCodeBillingIndicator = request.DefaultNoTaxCodeBillingIndicator;
        fs.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        var action = isNew ? "fiscal_settings.created" : "fiscal_settings.updated";
        await _audit.LogAsync(companyId, null, action, "FiscalSettings", fs.Id.ToString(), ct: ct);

        return (MapToResponse(fs), null);
    }

    public async Task<(FiscalSettingsResponse? Result, string? Error)> CreateOrUpdateAsync(
        Guid companyId, UpdateFiscalSettingsRequest request, CancellationToken ct = default)
    {
        return await CreateOrUpdateFiscalSettingsAsync(companyId, request, ct);
    }

    public async Task<(List<PaymentMethodMappingResponse>? Result, string? Error)> GetPaymentMethodMappingsAsync(
        Guid companyId, CancellationToken ct = default)
    {
        var fs = await _db.FiscalSettings
            .FirstOrDefaultAsync(f => f.CompanyId == companyId, ct);

        if (fs == null)
            return (null, "Fiscal settings not found for this company.");

        var mappings = await _db.PaymentMethodMappings
            .Where(m => m.FiscalSettingsId == fs.Id)
            .OrderBy(m => m.QboPaymentMethodName)
            .ToListAsync(ct);

        var dtos = mappings.Select(MapPaymentMethodToResponse).ToList();
        return (dtos, null);
    }

    public async Task<(PaymentMethodMappingResponse? Result, string? Error)> UpdatePaymentMethodMappingAsync(
        Guid companyId, UpdatePaymentMethodMappingRequest request, CancellationToken ct = default)
    {
        var fs = await _db.FiscalSettings
            .FirstOrDefaultAsync(f => f.CompanyId == companyId, ct);

        if (fs == null)
            return (null, "Fiscal settings not found for this company.");

        var mapping = await _db.PaymentMethodMappings
            .FirstOrDefaultAsync(m => m.FiscalSettingsId == fs.Id
                && m.QboPaymentMethodId == request.QboPaymentMethodId, ct);

        var isNew = mapping == null;

        if (isNew)
        {
            mapping = new PaymentMethodMapping
            {
                FiscalSettingsId = fs.Id,
                QboPaymentMethodId = request.QboPaymentMethodId
            };
            _db.PaymentMethodMappings.Add(mapping);
        }

        mapping!.QboPaymentMethodName = request.QboPaymentMethodName;
        mapping.DgiiPaymentMethod = request.DgiiPaymentMethod;
        mapping.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        var action = isNew ? "payment_method_mapping.created" : "payment_method_mapping.updated";
        await _audit.LogAsync(companyId, null, action, "PaymentMethodMapping", mapping.Id.ToString(), ct: ct);

        return (MapPaymentMethodToResponse(mapping), null);
    }

    public async Task<(List<PaymentConditionMappingResponse>? Result, string? Error)> GetPaymentConditionMappingsAsync(
        Guid companyId, CancellationToken ct = default)
    {
        var fs = await _db.FiscalSettings
            .FirstOrDefaultAsync(f => f.CompanyId == companyId, ct);

        if (fs == null)
            return (null, "Fiscal settings not found for this company.");

        var mappings = await _db.PaymentConditionMappings
            .Where(m => m.FiscalSettingsId == fs.Id)
            .OrderBy(m => m.QboSalesTermName)
            .ToListAsync(ct);

        var dtos = mappings.Select(MapPaymentConditionToResponse).ToList();
        return (dtos, null);
    }

    public async Task<(PaymentConditionMappingResponse? Result, string? Error)> UpdatePaymentConditionMappingAsync(
        Guid companyId, UpdatePaymentConditionMappingRequest request, CancellationToken ct = default)
    {
        var fs = await _db.FiscalSettings
            .FirstOrDefaultAsync(f => f.CompanyId == companyId, ct);

        if (fs == null)
            return (null, "Fiscal settings not found for this company.");

        var mapping = await _db.PaymentConditionMappings
            .FirstOrDefaultAsync(m => m.FiscalSettingsId == fs.Id
                && m.QboSalesTermId == request.QboSalesTermId, ct);

        var isNew = mapping == null;

        if (isNew)
        {
            mapping = new PaymentConditionMapping
            {
                FiscalSettingsId = fs.Id,
                QboSalesTermId = request.QboSalesTermId
            };
            _db.PaymentConditionMappings.Add(mapping);
        }

        mapping!.QboSalesTermName = request.QboSalesTermName;
        mapping.DgiiPaymentType = request.DgiiPaymentType;
        mapping.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        var action = isNew ? "payment_condition_mapping.created" : "payment_condition_mapping.updated";
        await _audit.LogAsync(companyId, null, action, "PaymentConditionMapping", mapping.Id.ToString(), ct: ct);

        return (MapPaymentConditionToResponse(mapping), null);
    }

    private static FiscalSettingsResponse MapToResponse(FiscalSettings fs) => new()
    {
        Id = fs.Id,
        CompanyId = fs.CompanyId,
        Rnc = fs.Rnc,
        RazonSocial = fs.RazonSocial,
        NombreComercial = fs.NombreComercial,
        Direccion = fs.Direccion,
        ProvinciaDgiiId = fs.ProvinciaDgiiId,
        MunicipioDgiiId = fs.MunicipioDgiiId,
        Telefono = fs.Telefono,
        Email = fs.Email,
        DefaultIncomeType = fs.DefaultIncomeType,
        DefaultUnitMeasure = fs.DefaultUnitMeasure,
        DefaultGoodServiceIndicator = fs.DefaultGoodServiceIndicator,
        TaxAmountIndicator = fs.TaxAmountIndicator,
        DefaultNoTaxCodeBillingIndicator = fs.DefaultNoTaxCodeBillingIndicator,
        CertificateConfigured = fs.CertificateConfigured,
        CertificateExpiresUtc = fs.CertificateExpiresUtc,
        CreatedAtUtc = fs.CreatedAtUtc,
        UpdatedAtUtc = fs.UpdatedAtUtc
    };

    private static PaymentMethodMappingResponse MapPaymentMethodToResponse(PaymentMethodMapping m) => new()
    {
        Id = m.Id,
        FiscalSettingsId = m.FiscalSettingsId,
        QboPaymentMethodId = m.QboPaymentMethodId,
        QboPaymentMethodName = m.QboPaymentMethodName,
        DgiiPaymentMethod = m.DgiiPaymentMethod,
        CreatedAtUtc = m.CreatedAtUtc,
        UpdatedAtUtc = m.UpdatedAtUtc
    };

    private static PaymentConditionMappingResponse MapPaymentConditionToResponse(PaymentConditionMapping m) => new()
    {
        Id = m.Id,
        FiscalSettingsId = m.FiscalSettingsId,
        QboSalesTermId = m.QboSalesTermId,
        QboSalesTermName = m.QboSalesTermName,
        DgiiPaymentType = m.DgiiPaymentType,
        CreatedAtUtc = m.CreatedAtUtc,
        UpdatedAtUtc = m.UpdatedAtUtc
    };
}
