using Eigdo.Domain.Enums;

namespace Eigdo.Domain.Entities.Billing;

public class Subscription : BaseEntity
{
    public Guid BillingAccountId { get; set; }
    public Guid PlanId { get; set; }
    public Guid PriceId { get; set; }
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Trial;
    public DateTime StartDateUtc { get; set; }
    public DateTime? EndDateUtc { get; set; }
    public DateTime? TrialEndDateUtc { get; set; }
    public DateTime CurrentPeriodStartUtc { get; set; }
    public DateTime CurrentPeriodEndUtc { get; set; }
    public string? StripeSubscriptionId { get; set; }
    public int DocumentsEmittedThisPeriod { get; set; }
    public PaymentGateway Gateway { get; set; }

    // Navigation
    public BillingAccount BillingAccount { get; set; } = null!;
    public Plan Plan { get; set; } = null!;
    public Price Price { get; set; } = null!;
}
