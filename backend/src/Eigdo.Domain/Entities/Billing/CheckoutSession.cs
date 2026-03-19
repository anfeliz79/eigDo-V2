using Eigdo.Domain.Enums;

namespace Eigdo.Domain.Entities.Billing;

public class CheckoutSession : BaseEntity
{
    public Guid? UserId { get; set; }
    public Guid PlanId { get; set; }
    public Guid PriceId { get; set; }
    public PaymentGateway Gateway { get; set; }
    public string? GatewaySessionId { get; set; }
    public string Status { get; set; } = "pending"; // pending, completed, expired
    public string? Email { get; set; }
    public DateTime ExpiresUtc { get; set; }

    // Navigation
    public Plan Plan { get; set; } = null!;
    public Price Price { get; set; } = null!;
}
