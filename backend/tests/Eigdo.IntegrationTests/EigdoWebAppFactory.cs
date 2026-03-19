using Eigdo.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Eigdo.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Eigdo.IntegrationTests;

public class EigdoWebAppFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration(config =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JWT_SECRET"] = "test_secret_key_for_integration_tests_must_be_at_least_64_chars_long!!!",
                ["JWT_ISSUER"] = "eigdo",
                ["JWT_AUDIENCE"] = "eigdo-clients",
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

            // Add InMemory database
            services.AddDbContext<EigdoDbContext>(options =>
                options.UseInMemoryDatabase("EigdoTestDb_" + Guid.NewGuid()));

            services.AddScoped<IEigdoDbContext>(sp => sp.GetRequiredService<EigdoDbContext>());

            // Add basic health checks (no external dependencies)
            services.AddHealthChecks();
        });
    }
}
