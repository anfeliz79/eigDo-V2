using Eigdo.Domain.Entities.Tenancy;
using Eigdo.Domain.Enums;

namespace Eigdo.Domain.Entities.Fiscal;

public class FiscalSettings : BaseEntity
{
    public Guid CompanyId { get; set; }

    // Sender identity (Ciclo 1)
    public string? Rnc { get; set; }
    public string? RazonSocial { get; set; }
    public string? NombreComercial { get; set; }
    public string? Direccion { get; set; }
    public int? ProvinciaDgiiId { get; set; }
    public int? MunicipioDgiiId { get; set; }
    public string? Telefono { get; set; }
    public string? Email { get; set; }

    // Defaults operativos (Ciclo 1)
    public IncomeType? DefaultIncomeType { get; set; }
    public int? DefaultUnitMeasure { get; set; } // DGII catalog code
    public GoodServiceIndicator? DefaultGoodServiceIndicator { get; set; }
    public int? TaxAmountIndicator { get; set; } // 0=no incluye, 1=incluye
    public BillingIndicator? DefaultNoTaxCodeBillingIndicator { get; set; }

    // Certificate
    public bool CertificateConfigured { get; set; }
    public DateTime? CertificateExpiresUtc { get; set; }

    // Navigation
    public Company Company { get; set; } = null!;
    public ICollection<Sequence> Sequences { get; set; } = new List<Sequence>();
    public ICollection<PaymentMethodMapping> PaymentMethodMappings { get; set; } = new List<PaymentMethodMapping>();
    public ICollection<PaymentConditionMapping> PaymentConditionMappings { get; set; } = new List<PaymentConditionMapping>();
}
