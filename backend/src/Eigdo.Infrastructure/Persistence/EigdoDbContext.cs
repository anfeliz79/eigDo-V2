using Eigdo.Application.Interfaces;
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

namespace Eigdo.Infrastructure.Persistence;

public class EigdoDbContext : DbContext, IEigdoDbContext
{
    public EigdoDbContext(DbContextOptions<EigdoDbContext> options) : base(options) { }

    // Identity
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    // Tenancy
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<CompanyUser> CompanyUsers => Set<CompanyUser>();

    // Billing
    public DbSet<BillingAccount> BillingAccounts => Set<BillingAccount>();
    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<Price> Prices => Set<Price>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<PaymentTransaction> PaymentTransactions => Set<PaymentTransaction>();
    public DbSet<CheckoutSession> CheckoutSessions => Set<CheckoutSession>();

    // Integration
    public DbSet<QboConnection> QboConnections => Set<QboConnection>();
    public DbSet<QboSyncEvent> QboSyncEvents => Set<QboSyncEvent>();

    // Fiscal
    public DbSet<FiscalSettings> FiscalSettings => Set<FiscalSettings>();
    public DbSet<Sequence> Sequences => Set<Sequence>();
    public DbSet<PaymentMethodMapping> PaymentMethodMappings => Set<PaymentMethodMapping>();
    public DbSet<PaymentConditionMapping> PaymentConditionMappings => Set<PaymentConditionMapping>();
    public DbSet<CertificateStore> CertificateStores => Set<CertificateStore>();
    public DbSet<DgiiProvince> DgiiProvinces => Set<DgiiProvince>();
    public DbSet<DgiiMunicipality> DgiiMunicipalities => Set<DgiiMunicipality>();
    public DbSet<DgiiUnitMeasure> DgiiUnitMeasures => Set<DgiiUnitMeasure>();

    // Mapping
    public DbSet<CustomerMapping> CustomerMappings => Set<CustomerMapping>();
    public DbSet<VendorMapping> VendorMappings => Set<VendorMapping>();
    public DbSet<TaxCodeMapping> TaxCodeMappings => Set<TaxCodeMapping>();
    public DbSet<ItemOverride> ItemOverrides => Set<ItemOverride>();

    // Emission
    public DbSet<EcfDocument> EcfDocuments => Set<EcfDocument>();
    public DbSet<EcfEvent> EcfEvents => Set<EcfEvent>();
    public DbSet<ProviderMessage> ProviderMessages => Set<ProviderMessage>();

    // Support
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<SupportTicket> SupportTickets => Set<SupportTicket>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Use snake_case naming convention for PostgreSQL
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            // Table name
            entity.SetTableName(ToSnakeCase(entity.GetTableName()!));

            // Column names
            foreach (var property in entity.GetProperties())
            {
                property.SetColumnName(ToSnakeCase(property.GetColumnName()));
            }

            // Key names
            foreach (var key in entity.GetKeys())
            {
                key.SetName(ToSnakeCase(key.GetName()!));
            }

            // Foreign key names
            foreach (var fk in entity.GetForeignKeys())
            {
                fk.SetConstraintName(ToSnakeCase(fk.GetConstraintName()!));
            }

            // Index names
            foreach (var index in entity.GetIndexes())
            {
                index.SetDatabaseName(ToSnakeCase(index.GetDatabaseName()!));
            }
        }

        // === Identity ===
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Email).HasMaxLength(256);
            e.Property(u => u.FirstName).HasMaxLength(100);
            e.Property(u => u.LastName).HasMaxLength(100);
            e.Property(u => u.Phone).HasMaxLength(20);
        });

        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.HasIndex(rt => rt.Token).IsUnique();
            e.HasOne(rt => rt.User).WithMany(u => u.RefreshTokens).HasForeignKey(rt => rt.UserId);
        });

        // === Tenancy ===
        modelBuilder.Entity<Company>(e =>
        {
            e.Property(c => c.Name).HasMaxLength(256);
            e.Property(c => c.Rnc).HasMaxLength(11);
        });

        modelBuilder.Entity<CompanyUser>(e =>
        {
            e.HasIndex(cu => new { cu.CompanyId, cu.UserId }).IsUnique();
            e.HasOne(cu => cu.Company).WithMany(c => c.CompanyUsers).HasForeignKey(cu => cu.CompanyId);
            e.HasOne(cu => cu.User).WithMany(u => u.CompanyUsers).HasForeignKey(cu => cu.UserId);
        });

        // === Billing ===
        modelBuilder.Entity<BillingAccount>(e =>
        {
            e.HasIndex(ba => ba.CompanyId).IsUnique();
            e.HasOne(ba => ba.Company).WithOne(c => c.BillingAccount).HasForeignKey<BillingAccount>(ba => ba.CompanyId);
        });

        modelBuilder.Entity<Plan>(e =>
        {
            e.Property(p => p.Name).HasMaxLength(100);
        });

        modelBuilder.Entity<Price>(e =>
        {
            e.Property(p => p.Amount).HasPrecision(18, 2);
            e.Property(p => p.Currency).HasMaxLength(3);
            e.Property(p => p.Interval).HasMaxLength(20);
            e.HasOne(p => p.Plan).WithMany(pl => pl.Prices).HasForeignKey(p => p.PlanId);
        });

        modelBuilder.Entity<Subscription>(e =>
        {
            e.HasOne(s => s.BillingAccount).WithMany(ba => ba.Subscriptions).HasForeignKey(s => s.BillingAccountId);
            e.HasOne(s => s.Plan).WithMany().HasForeignKey(s => s.PlanId);
            e.HasOne(s => s.Price).WithMany().HasForeignKey(s => s.PriceId);
        });

        modelBuilder.Entity<PaymentTransaction>(e =>
        {
            e.Property(pt => pt.Amount).HasPrecision(18, 2);
            e.Property(pt => pt.Currency).HasMaxLength(3);
            e.HasOne(pt => pt.BillingAccount).WithMany(ba => ba.PaymentTransactions).HasForeignKey(pt => pt.BillingAccountId);
        });

        modelBuilder.Entity<CheckoutSession>(e =>
        {
            e.HasOne(cs => cs.Plan).WithMany().HasForeignKey(cs => cs.PlanId);
            e.HasOne(cs => cs.Price).WithMany().HasForeignKey(cs => cs.PriceId);
        });

        // === Integration ===
        modelBuilder.Entity<QboConnection>(e =>
        {
            e.HasIndex(qc => qc.CompanyId).IsUnique();
            e.HasOne(qc => qc.Company).WithOne(c => c.QboConnection).HasForeignKey<QboConnection>(qc => qc.CompanyId);
            e.Property(qc => qc.RealmId).HasMaxLength(50);
        });

        modelBuilder.Entity<QboSyncEvent>(e =>
        {
            e.HasIndex(qse => new { qse.CompanyId, qse.Processed });
            e.HasOne(qse => qse.Company).WithMany().HasForeignKey(qse => qse.CompanyId);
        });

        // === Fiscal ===
        modelBuilder.Entity<FiscalSettings>(e =>
        {
            e.HasIndex(fs => fs.CompanyId).IsUnique();
            e.HasOne(fs => fs.Company).WithOne(c => c.FiscalSettings).HasForeignKey<FiscalSettings>(fs => fs.CompanyId);
            e.Property(fs => fs.Rnc).HasMaxLength(11);
            e.Property(fs => fs.RazonSocial).HasMaxLength(256);
            e.Property(fs => fs.NombreComercial).HasMaxLength(256);
            e.Property(fs => fs.Direccion).HasMaxLength(500);
            e.Property(fs => fs.Telefono).HasMaxLength(20);
            e.Property(fs => fs.Email).HasMaxLength(256);
        });

        modelBuilder.Entity<Sequence>(e =>
        {
            e.HasIndex(s => new { s.FiscalSettingsId, s.EcfType, s.IsActive });
            e.HasOne(s => s.FiscalSettings).WithMany(fs => fs.Sequences).HasForeignKey(s => s.FiscalSettingsId);
        });

        modelBuilder.Entity<PaymentMethodMapping>(e =>
        {
            e.HasIndex(pm => new { pm.FiscalSettingsId, pm.QboPaymentMethodId }).IsUnique();
            e.HasOne(pm => pm.FiscalSettings).WithMany(fs => fs.PaymentMethodMappings).HasForeignKey(pm => pm.FiscalSettingsId);
        });

        modelBuilder.Entity<PaymentConditionMapping>(e =>
        {
            e.HasIndex(pc => new { pc.FiscalSettingsId, pc.QboSalesTermId }).IsUnique();
            e.HasOne(pc => pc.FiscalSettings).WithMany(fs => fs.PaymentConditionMappings).HasForeignKey(pc => pc.FiscalSettingsId);
        });

        modelBuilder.Entity<CertificateStore>(e =>
        {
            e.HasIndex(cs => cs.CompanyId);
            e.HasOne(cs => cs.Company).WithMany().HasForeignKey(cs => cs.CompanyId);
        });

        modelBuilder.Entity<DgiiProvince>(e =>
        {
            e.Property(p => p.Code).HasMaxLength(10);
            e.Property(p => p.Name).HasMaxLength(100);
        });

        modelBuilder.Entity<DgiiMunicipality>(e =>
        {
            e.Property(m => m.Code).HasMaxLength(10);
            e.Property(m => m.Name).HasMaxLength(100);
            e.HasOne(m => m.Province).WithMany(p => p.Municipalities).HasForeignKey(m => m.ProvinceId);
        });

        modelBuilder.Entity<DgiiUnitMeasure>(e =>
        {
            e.Property(u => u.Code).HasMaxLength(10);
            e.Property(u => u.Name).HasMaxLength(100);
        });

        // === Mapping ===
        modelBuilder.Entity<CustomerMapping>(e =>
        {
            e.HasIndex(cm => new { cm.CompanyId, cm.QboCustomerId }).IsUnique();
            e.HasOne(cm => cm.Company).WithMany().HasForeignKey(cm => cm.CompanyId);
            e.Property(cm => cm.Rnc).HasMaxLength(11);
            e.Property(cm => cm.RazonSocialDgii).HasMaxLength(256);
            e.Property(cm => cm.QboDisplayName).HasMaxLength(256);
        });

        modelBuilder.Entity<VendorMapping>(e =>
        {
            e.HasIndex(vm => new { vm.CompanyId, vm.QboVendorId }).IsUnique();
            e.HasOne(vm => vm.Company).WithMany().HasForeignKey(vm => vm.CompanyId);
            e.Property(vm => vm.Rnc).HasMaxLength(11);
            e.Property(vm => vm.RazonSocialDgii).HasMaxLength(256);
            e.Property(vm => vm.QboDisplayName).HasMaxLength(256);
            e.Property(vm => vm.RetentionItbisRate).HasPrecision(5, 4);
            e.Property(vm => vm.RetentionIsrRate).HasPrecision(5, 4);
        });

        modelBuilder.Entity<TaxCodeMapping>(e =>
        {
            e.HasIndex(tcm => new { tcm.CompanyId, tcm.QboTaxCodeId }).IsUnique();
            e.HasOne(tcm => tcm.Company).WithMany().HasForeignKey(tcm => tcm.CompanyId);
            e.Property(tcm => tcm.QboTaxRate).HasPrecision(5, 2);
        });

        modelBuilder.Entity<ItemOverride>(e =>
        {
            e.HasIndex(io => new { io.CompanyId, io.QboItemId }).IsUnique();
            e.HasOne(io => io.Company).WithMany().HasForeignKey(io => io.CompanyId);
            e.Property(io => io.QboItemName).HasMaxLength(256);
        });

        // === Emission ===
        modelBuilder.Entity<EcfDocument>(e =>
        {
            e.HasIndex(ed => new { ed.CompanyId, ed.Status });
            e.HasIndex(ed => ed.Encf);
            e.HasIndex(ed => ed.TrackId);
            e.HasOne(ed => ed.Company).WithMany().HasForeignKey(ed => ed.CompanyId);
            e.HasOne(ed => ed.OriginalEcfDocument).WithMany().HasForeignKey(ed => ed.OriginalEcfDocumentId);
            e.Property(ed => ed.TotalAmount).HasPrecision(18, 2);
            e.Property(ed => ed.TaxAmount).HasPrecision(18, 2);
            e.Property(ed => ed.Encf).HasMaxLength(13);
            e.Property(ed => ed.QboDocNumber).HasMaxLength(50);
        });

        modelBuilder.Entity<EcfEvent>(e =>
        {
            e.HasOne(ee => ee.EcfDocument).WithMany(ed => ed.Events).HasForeignKey(ee => ee.EcfDocumentId);
        });

        modelBuilder.Entity<ProviderMessage>(e =>
        {
            e.HasIndex(pm => pm.EcfDocumentId);
            e.HasOne(pm => pm.EcfDocument).WithMany().HasForeignKey(pm => pm.EcfDocumentId);
            e.Property(pm => pm.Provider).HasMaxLength(50);
        });

        // === Support ===
        modelBuilder.Entity<AuditLog>(e =>
        {
            e.HasIndex(al => new { al.CompanyId, al.CreatedAtUtc });
            e.HasIndex(al => new { al.EntityType, al.EntityId });
            e.Property(al => al.Action).HasMaxLength(100);
            e.Property(al => al.EntityType).HasMaxLength(100);
        });

        modelBuilder.Entity<SupportTicket>(e =>
        {
            e.HasOne(st => st.Company).WithMany().HasForeignKey(st => st.CompanyId);
            e.HasOne(st => st.User).WithMany().HasForeignKey(st => st.UserId);
            e.Property(st => st.Subject).HasMaxLength(256);
        });
    }

    private static string ToSnakeCase(string name)
    {
        if (string.IsNullOrEmpty(name)) return name;

        var result = new System.Text.StringBuilder();
        for (int i = 0; i < name.Length; i++)
        {
            var c = name[i];
            if (char.IsUpper(c))
            {
                if (i > 0 && !char.IsUpper(name[i - 1]))
                    result.Append('_');
                else if (i > 0 && i < name.Length - 1 && char.IsUpper(name[i - 1]) && !char.IsUpper(name[i + 1]))
                    result.Append('_');
                result.Append(char.ToLower(c));
            }
            else
            {
                result.Append(c);
            }
        }
        return result.ToString();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAtUtc = DateTime.UtcNow;
            }
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
