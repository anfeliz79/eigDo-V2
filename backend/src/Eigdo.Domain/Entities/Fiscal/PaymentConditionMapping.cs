using Eigdo.Domain.Enums;

namespace Eigdo.Domain.Entities.Fiscal;

public class PaymentConditionMapping : BaseEntity
{
    public Guid FiscalSettingsId { get; set; }
    public string QboSalesTermId { get; set; } = string.Empty;
    public string QboSalesTermName { get; set; } = string.Empty;
    public DgiiPaymentType DgiiPaymentType { get; set; }

    // Navigation
    public FiscalSettings FiscalSettings { get; set; } = null!;
}
