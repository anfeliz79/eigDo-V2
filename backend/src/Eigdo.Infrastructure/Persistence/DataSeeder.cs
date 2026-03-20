using Eigdo.Domain.Entities.Billing;
using Eigdo.Domain.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Eigdo.Infrastructure.Persistence;

public static class DataSeeder
{
    /// <summary>
    /// Seeds initial plan and pricing data if not already present.
    /// Call this during application startup.
    /// </summary>
    public static async Task SeedPlansAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EigdoDbContext>();
        var logger = scope.ServiceProvider.GetService<ILogger<EigdoDbContext>>();

        if (await db.Plans.AnyAsync())
        {
            logger?.LogInformation("Plans already seeded, skipping.");
            return;
        }

        logger?.LogInformation("Seeding initial plans and prices...");

        // Plan Basico
        var basicPlan = new Plan
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Name = "Basico",
            Description = "Ideal para empresas pequenas con bajo volumen de facturacion.",
            MaxCompanies = 1,
            IncludedDocumentsPerMonth = 100,
            IsActive = true,
            SortOrder = 1
        };

        var basicMonthly = new Price
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111101"),
            PlanId = basicPlan.Id,
            Amount = 1500.00m,
            Currency = "DOP",
            Interval = "monthly",
            IsActive = true
        };

        var basicYearly = new Price
        {
            Id = Guid.Parse("11111111-1111-1111-1111-111111111102"),
            PlanId = basicPlan.Id,
            Amount = 15000.00m,
            Currency = "DOP",
            Interval = "yearly",
            IsActive = true
        };

        // Plan Profesional
        var proPlan = new Plan
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
            Name = "Profesional",
            Description = "Para empresas con volumen medio de facturacion y soporte prioritario.",
            MaxCompanies = 3,
            IncludedDocumentsPerMonth = 500,
            IsActive = true,
            SortOrder = 2
        };

        var proMonthly = new Price
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222201"),
            PlanId = proPlan.Id,
            Amount = 3500.00m,
            Currency = "DOP",
            Interval = "monthly",
            IsActive = true
        };

        var proYearly = new Price
        {
            Id = Guid.Parse("22222222-2222-2222-2222-222222222202"),
            PlanId = proPlan.Id,
            Amount = 35000.00m,
            Currency = "DOP",
            Interval = "yearly",
            IsActive = true
        };

        // Plan Empresarial
        var enterprisePlan = new Plan
        {
            Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
            Name = "Empresarial",
            Description = "Para firmas contables y empresas con alto volumen. Soporte dedicado.",
            MaxCompanies = 10,
            IncludedDocumentsPerMonth = 2000,
            IsActive = true,
            SortOrder = 3
        };

        var enterpriseMonthly = new Price
        {
            Id = Guid.Parse("33333333-3333-3333-3333-333333333301"),
            PlanId = enterprisePlan.Id,
            Amount = 7500.00m,
            Currency = "DOP",
            Interval = "monthly",
            IsActive = true
        };

        var enterpriseYearly = new Price
        {
            Id = Guid.Parse("33333333-3333-3333-3333-333333333302"),
            PlanId = enterprisePlan.Id,
            Amount = 75000.00m,
            Currency = "DOP",
            Interval = "yearly",
            IsActive = true
        };

        db.Plans.AddRange(basicPlan, proPlan, enterprisePlan);
        db.Prices.AddRange(basicMonthly, basicYearly, proMonthly, proYearly, enterpriseMonthly, enterpriseYearly);

        await db.SaveChangesAsync();

        logger?.LogInformation("Seeded 3 plans with 6 prices (monthly + yearly).");
    }

    /// <summary>
    /// Seeds or updates the SuperAdmin user.
    /// Uses BCrypt for password hashing (same as AuthService).
    /// </summary>
    public static async Task SeedSuperAdminAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<EigdoDbContext>();
        var logger = scope.ServiceProvider.GetService<ILogger<EigdoDbContext>>();

        const string email = "argenis1989@gmail.com";
        const string password = "Anfeliz112322";
        const string firstName = "Argenis";
        const string lastName = "Admin";

        var existingUser = await db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (existingUser != null)
        {
            // Update password and ensure SuperAdmin role
            existingUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
            existingUser.SystemRole = "SuperAdmin";
            existingUser.IsActive = true;
            existingUser.EmailConfirmed = true;
            existingUser.UpdatedAtUtc = DateTime.UtcNow;
            logger?.LogInformation("SuperAdmin user updated: {Email}", email);
        }
        else
        {
            var user = new User
            {
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                FirstName = firstName,
                LastName = lastName,
                SystemRole = "SuperAdmin",
                IsActive = true,
                EmailConfirmed = true,
            };
            db.Users.Add(user);
            logger?.LogInformation("SuperAdmin user created: {Email}", email);
        }

        await db.SaveChangesAsync();
    }
}
