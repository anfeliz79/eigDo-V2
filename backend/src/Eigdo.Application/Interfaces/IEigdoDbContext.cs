using Eigdo.Domain.Entities;
using Eigdo.Domain.Entities.Billing;
using Eigdo.Domain.Entities.Emission;
using Eigdo.Domain.Entities.Fiscal;
using Eigdo.Domain.Entities.Identity;
using Eigdo.Domain.Entities.Integration;
using Eigdo.Domain.Entities.Mapping;
using Eigdo.Domain.Entities.Support;
using Eigdo.Domain.Entities.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace Eigdo.Application.Interfaces;

/// <summary>
/// Abstraction over EigdoDbContext so Application services don't depend on Infrastructure.
/// </summary>
public interface IEigdoDbContext
{
    // Identity
    DbSet<User> Users { get; }
    DbSet<RefreshToken> RefreshTokens { get; }

    // Tenancy
    DbSet<Company> Companies { get; }
    DbSet<CompanyUser> CompanyUsers { get; }

    // Billing
    DbSet<BillingAccount> BillingAccounts { get; }
    DbSet<Plan> Plans { get; }
    DbSet<Price> Prices { get; }
    DbSet<Subscription> Subscriptions { get; }
    DbSet<PaymentTransaction> PaymentTransactions { get; }
    DbSet<CheckoutSession> CheckoutSessions { get; }

    // Integration
    DbSet<QboConnection> QboConnections { get; }
    DbSet<QboSyncEvent> QboSyncEvents { get; }

    // Fiscal
    DbSet<FiscalSettings> FiscalSettings { get; }
    DbSet<Sequence> Sequences { get; }
    DbSet<PaymentMethodMapping> PaymentMethodMappings { get; }
    DbSet<PaymentConditionMapping> PaymentConditionMappings { get; }
    DbSet<CertificateStore> CertificateStores { get; }
    DbSet<DgiiProvince> DgiiProvinces { get; }
    DbSet<DgiiMunicipality> DgiiMunicipalities { get; }
    DbSet<DgiiUnitMeasure> DgiiUnitMeasures { get; }

    // Mapping
    DbSet<CustomerMapping> CustomerMappings { get; }
    DbSet<VendorMapping> VendorMappings { get; }
    DbSet<TaxCodeMapping> TaxCodeMappings { get; }
    DbSet<ItemOverride> ItemOverrides { get; }

    // Emission
    DbSet<EcfDocument> EcfDocuments { get; }
    DbSet<EcfEvent> EcfEvents { get; }
    DbSet<ProviderMessage> ProviderMessages { get; }

    // Support
    DbSet<AuditLog> AuditLogs { get; }
    DbSet<SupportTicket> SupportTickets { get; }
    DbSet<SupportTicketMessage> SupportTicketMessages { get; }
    DbSet<CertificationAssistanceConfig> CertificationAssistanceConfigs { get; }

    // DbContext operations
    EntityEntry<TEntity> Entry<TEntity>(TEntity entity) where TEntity : class;
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
