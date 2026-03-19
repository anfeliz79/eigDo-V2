using Eigdo.Domain.Enums;

namespace Eigdo.Domain.Entities.Billing;

public class PaymentTransaction : BaseEntity
{
    public Guid BillingAccountId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "DOP";
    public string Status { get; set; } = string.Empty; // succeeded, failed, pending
    public PaymentGateway Gateway { get; set; }
    public string? GatewayTransactionId { get; set; }
    public string? GatewayResponse { get; set; }

    // Navigation
    public BillingAccount BillingAccount { get; set; } = null!;
}
