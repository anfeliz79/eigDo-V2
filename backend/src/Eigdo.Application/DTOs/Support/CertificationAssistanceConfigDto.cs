namespace Eigdo.Application.DTOs.Support;

public class CertificationAssistanceConfigResponse
{
    public Guid Id { get; set; }
    public bool IsEnabled { get; set; }
    public decimal Price { get; set; }
    public string Currency { get; set; } = "DOP";
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> IncludedItems { get; set; } = new();
    public List<string> Requirements { get; set; } = new();
    public bool ChargeOnNextBillingCycle { get; set; }
    public int EstimatedDays { get; set; }
}

public class UpdateCertificationAssistanceConfigRequest
{
    public bool IsEnabled { get; set; }
    public decimal Price { get; set; }
    public string Currency { get; set; } = "DOP";
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> IncludedItems { get; set; } = new();
    public List<string> Requirements { get; set; } = new();
    public bool ChargeOnNextBillingCycle { get; set; }
    public int EstimatedDays { get; set; }
}
