using Eigdo.Domain.Entities.Billing;
using Eigdo.Domain.Entities.Fiscal;
using Eigdo.Domain.Entities.Integration;
using Eigdo.Domain.Enums;

namespace Eigdo.Domain.Entities.Tenancy;

public class Company : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Rnc { get; set; }
    public OnboardingStep OnboardingStep { get; set; } = OnboardingStep.NotStarted;
    public bool IsOnboardingComplete { get; set; }
    public bool IsActive { get; set; } = true;

    // Alanube reseller integration
    public string? AlanubeCompanyId { get; set; }

    // Navigation
    public ICollection<CompanyUser> CompanyUsers { get; set; } = new List<CompanyUser>();
    public FiscalSettings? FiscalSettings { get; set; }
    public BillingAccount? BillingAccount { get; set; }
    public QboConnection? QboConnection { get; set; }
}
