using Eigdo.Domain.Enums;

namespace Eigdo.Application.DTOs.Fiscal;

public class FiscalSettingsDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string? Rnc { get; set; }
    public string? RazonSocial { get; set; }
    public string? NombreComercial { get; set; }
    public string? Direccion { get; set; }
    public int? ProvinciaDgiiId { get; set; }
    public int? MunicipioDgiiId { get; set; }
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public IncomeType? DefaultIncomeType { get; set; }
    public int? DefaultUnitMeasure { get; set; }
    public GoodServiceIndicator? DefaultGoodServiceIndicator { get; set; }
    public int? TaxAmountIndicator { get; set; }
    public BillingIndicator? DefaultNoTaxCodeBillingIndicator { get; set; }
    public bool CertificateConfigured { get; set; }
    public DateTime? CertificateExpiresUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

/// <summary>Response DTO returned by API controllers.</summary>
public class FiscalSettingsResponse : FiscalSettingsDto { }

public class UpdateFiscalSettingsRequest
{
    public string? Rnc { get; set; }
    public string? RazonSocial { get; set; }
    public string? NombreComercial { get; set; }
    public string? Direccion { get; set; }
    public int? ProvinciaDgiiId { get; set; }
    public int? MunicipioDgiiId { get; set; }
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public IncomeType? DefaultIncomeType { get; set; }
    public int? DefaultUnitMeasure { get; set; }
    public GoodServiceIndicator? DefaultGoodServiceIndicator { get; set; }
    public int? TaxAmountIndicator { get; set; }
    public BillingIndicator? DefaultNoTaxCodeBillingIndicator { get; set; }
}

public class CertificateInfoResponse
{
    public bool Configured { get; set; }
    public string? Subject { get; set; }
    public string? Issuer { get; set; }
    public DateTime? ExpiresUtc { get; set; }
    public int? DaysUntilExpiry { get; set; }
}
