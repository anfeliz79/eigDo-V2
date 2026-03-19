namespace Eigdo.Domain.Entities.Billing;

public class Price : BaseEntity
{
    public Guid PlanId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "DOP";
    public string Interval { get; set; } = "monthly"; // monthly, yearly
    public string? StripeId { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public Plan Plan { get; set; } = null!;
}
