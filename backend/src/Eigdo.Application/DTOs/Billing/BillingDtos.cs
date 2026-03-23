namespace Eigdo.Application.DTOs.Billing;

// Plans & Pricing
public class PlanDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int IncludedDocumentsPerMonth { get; set; }
    public int SortOrder { get; set; }
    public List<PriceDto> Prices { get; set; } = new();
}

public class PriceDto
{
    public Guid Id { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "DOP";
    public string Interval { get; set; } = "monthly";
}

// Checkout
public class CreateCheckoutRequest
{
    public Guid PriceId { get; set; }
    /// <summary>
    /// Empresa destino del checkout. Si no se provee, se usa la empresa activa del usuario.
    /// </summary>
    public Guid? CompanyId { get; set; }
    public string? SuccessUrl { get; set; }
    public string? CancelUrl { get; set; }
}

public class ConfirmCheckoutRequest
{
    public string SessionId { get; set; } = string.Empty;
}

public class CheckoutSessionDto
{
    public string SessionId { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
}

// Subscription status
public class SubscriptionDto
{
    public Guid Id { get; set; }
    public string PlanName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime StartDateUtc { get; set; }
    public DateTime? EndDateUtc { get; set; }
    public DateTime CurrentPeriodStartUtc { get; set; }
    public DateTime CurrentPeriodEndUtc { get; set; }
    public int DocumentsEmittedThisPeriod { get; set; }
    public int IncludedDocumentsPerMonth { get; set; }
    public string Gateway { get; set; } = string.Empty;
    public decimal PriceAmount { get; set; }
    public string PriceInterval { get; set; } = string.Empty;
}

// Billing portal
public class BillingPortalDto
{
    public string Url { get; set; } = string.Empty;
}
