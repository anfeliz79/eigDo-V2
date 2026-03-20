using System.Text;
using Eigdo.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Eigdo.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace Eigdo.IntegrationTests;

public class EigdoWebAppFactory : WebApplicationFactory<Program>
{
    public const string TestJwtSecret = "test_secret_key_for_integration_tests_must_be_at_least_64_chars_long!!!";
    public const string TestJwtIssuer = "eigdo";
    public const string TestJwtAudience = "eigdo-clients";

    private readonly string _dbName = "EigdoTestDb_" + Guid.NewGuid().ToString("N");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration(config =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JWT_SECRET"] = TestJwtSecret,
                ["JWT_ISSUER"] = TestJwtIssuer,
                ["JWT_AUDIENCE"] = TestJwtAudience,
                ["DATABASE_CONNECTION"] = "Host=localhost;Database=eigdo_test",
                ["REDIS_CONNECTION"] = "localhost:6379",
            });
        });

        builder.ConfigureServices(services =>
        {
            // Remove real EF Core registration
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<EigdoDbContext>));
            if (descriptor != null) services.Remove(descriptor);

            // Remove IEigdoDbContext registration
            var dbContextDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(IEigdoDbContext));
            if (dbContextDescriptor != null) services.Remove(dbContextDescriptor);

            // Remove real PostgreSQL health check
            var healthDescriptors = services.Where(
                d => d.ServiceType.FullName?.Contains("HealthCheck") == true).ToList();
            foreach (var d in healthDescriptors) services.Remove(d);

            // Add InMemory database (fixed name so all scopes share the same instance)
            services.AddDbContext<EigdoDbContext>(options =>
                options.UseInMemoryDatabase(_dbName));

            services.AddScoped<IEigdoDbContext>(sp => sp.GetRequiredService<EigdoDbContext>());

            // Add basic health checks (no external dependencies)
            services.AddHealthChecks();

            // Re-configure JWT authentication with the test secret
            // This is needed because Program.cs reads builder.Configuration before
            // ConfigureAppConfiguration merges the in-memory config
            services.Configure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = TestJwtIssuer,
                    ValidAudience = TestJwtAudience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestJwtSecret)),
                    ClockSkew = TimeSpan.FromMinutes(1)
                };
            });
        });
    }

    /// <summary>
    /// Seeds plan data after the host is fully built.
    /// Called by test classes that need seeded plans.
    /// </summary>
    public void EnsureSeeded()
    {
        using var scope = Services.CreateScope();
        DataSeeder.SeedPlansAsync(scope.ServiceProvider).GetAwaiter().GetResult();
    }
}
