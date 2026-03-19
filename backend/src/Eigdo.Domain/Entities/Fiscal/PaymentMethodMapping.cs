using Eigdo.Domain.Enums;

namespace Eigdo.Domain.Entities.Fiscal;

public class PaymentMethodMapping : BaseEntity
{
    public Guid FiscalSettingsId { get; set; }
    public string QboPaymentMethodId { get; set; } = string.Empty;
    public string QboPaymentMethodName { get; set; } = string.Empty;
    public DgiiPaymentMethod DgiiPaymentMethod { get; set; }

    // Navigation
    public FiscalSettings FiscalSettings { get; set; } = null!;
}
