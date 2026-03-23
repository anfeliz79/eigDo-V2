namespace Eigdo.Application.DTOs.Company;

public class CompanyDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Rnc { get; set; }
    public bool IsOnboardingComplete { get; set; }
    public string Role { get; set; } = string.Empty;
    public string? SubscriptionStatus { get; set; }
    public string? PlanName { get; set; }
    public bool HasQboConnection { get; set; }
}

public class CreateCompanyRequest
{
    public string Name { get; set; } = string.Empty;
}
