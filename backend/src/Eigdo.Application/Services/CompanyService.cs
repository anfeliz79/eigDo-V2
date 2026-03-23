using Eigdo.Application.DTOs.Company;
using Eigdo.Application.Interfaces;
using Eigdo.Domain.Entities.Billing;
using Eigdo.Domain.Entities.Tenancy;
using Eigdo.Domain.Enums;
using Eigdo.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Eigdo.Application.Services;

public class CompanyService
{
    private readonly IEigdoDbContext _db;
    private readonly IAuditService _audit;

    public CompanyService(IEigdoDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    /// <summary>
    /// Devuelve todas las empresas a las que pertenece el usuario.
    /// </summary>
    public async Task<List<CompanyDto>> GetUserCompaniesAsync(Guid userId, CancellationToken ct = default)
    {
        var companyUsers = await _db.CompanyUsers
            .Include(cu => cu.Company)
                .ThenInclude(c => c.BillingAccount!)
                    .ThenInclude(ba => ba.Subscriptions)
                        .ThenInclude(s => s.Plan)
            .Include(cu => cu.Company)
                .ThenInclude(c => c.QboConnection)
            .Where(cu => cu.UserId == userId && cu.IsActive && cu.Company.IsActive)
            .OrderBy(cu => cu.CreatedAtUtc)
            .ToListAsync(ct);

        return companyUsers.Select(cu =>
        {
            var activeSub = cu.Company.BillingAccount?.Subscriptions
                .FirstOrDefault(s => s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trial);

            return new CompanyDto
            {
                Id = cu.Company.Id,
                Name = cu.Company.Name,
                Rnc = cu.Company.Rnc,
                IsOnboardingComplete = cu.Company.IsOnboardingComplete,
                Role = cu.Role.ToString(),
                SubscriptionStatus = activeSub?.Status.ToString(),
                PlanName = activeSub?.Plan?.Name,
                HasQboConnection = cu.Company.QboConnection != null
            };
        }).ToList();
    }

    /// <summary>
    /// Crea una nueva empresa con el usuario como propietario y una cuenta de facturacion.
    /// </summary>
    public async Task<(CompanyDto? Company, string? Error)> CreateCompanyAsync(
        Guid userId, CreateCompanyRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return (null, "El nombre de la empresa es requerido.");

        var company = new Company
        {
            Name = request.Name.Trim(),
            IsActive = true,
            OnboardingStep = OnboardingStep.NotStarted,
            IsOnboardingComplete = false
        };

        _db.Companies.Add(company);

        var companyUser = new CompanyUser
        {
            CompanyId = company.Id,
            UserId = userId,
            Role = CompanyRole.Owner,
            IsActive = true
        };

        _db.CompanyUsers.Add(companyUser);

        var billingAccount = new BillingAccount
        {
            CompanyId = company.Id
        };

        _db.BillingAccounts.Add(billingAccount);

        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(company.Id, userId, "company.created", "Company", company.Id.ToString(), ct: ct);

        return (new CompanyDto
        {
            Id = company.Id,
            Name = company.Name,
            IsOnboardingComplete = false,
            Role = CompanyRole.Owner.ToString(),
            SubscriptionStatus = null,
            PlanName = null,
            HasQboConnection = false
        }, null);
    }

    /// <summary>
    /// Valida que el usuario tiene acceso a la empresa especificada.
    /// </summary>
    public async Task<bool> UserHasAccessAsync(Guid userId, Guid companyId, CancellationToken ct = default)
    {
        return await _db.CompanyUsers
            .AnyAsync(cu => cu.UserId == userId && cu.CompanyId == companyId && cu.IsActive, ct);
    }
}
