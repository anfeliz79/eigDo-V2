using Eigdo.Domain.Entities.Tenancy;
using Eigdo.Domain.Enums;

namespace Eigdo.Domain.Entities.Mapping;

public class TaxCodeMapping : BaseEntity
{
    public Guid CompanyId { get; set; }
    public string QboTaxCodeId { get; set; } = string.Empty;
    public string QboTaxCodeName { get; set; } = string.Empty;
    public decimal? QboTaxRate { get; set; }
    public BillingIndicator BillingIndicator { get; set; }

    // Navigation
    public Company Company { get; set; } = null!;
}
