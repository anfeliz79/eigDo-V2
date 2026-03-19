using Eigdo.Domain.Entities.Tenancy;

namespace Eigdo.Domain.Entities.Billing;

public class BillingAccount : BaseEntity
{
    public Guid CompanyId { get; set; }
    public string? StripeCustomerId { get; set; }
    public string? AzulCustomerId { get; set; }

    // Navigation
    public Company Company { get; set; } = null!;
    public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
    public ICollection<PaymentTransaction> PaymentTransactions { get; set; } = new List<PaymentTransaction>();
}
