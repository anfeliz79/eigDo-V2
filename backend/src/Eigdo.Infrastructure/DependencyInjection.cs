using Eigdo.Application.Interfaces;
using Eigdo.Domain.Interfaces;
using Eigdo.Infrastructure.Fiscal;
using Eigdo.Infrastructure.Persistence;
using Eigdo.Infrastructure.Security;
using Eigdo.Infrastructure.Integration;
using Eigdo.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;

namespace Eigdo.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // PostgreSQL
        var connectionString = configuration.GetValue<string>("DATABASE_CONNECTION")
            ?? configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Database connection string not configured");

        services.AddDbContext<EigdoDbContext>(options =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(10),
                    errorCodesToAdd: null);
                npgsqlOptions.CommandTimeout(30);
            });
        });

        // Register IEigdoDbContext so Application services can use the DbContext without circular dependency
        services.AddScoped<IEigdoDbContext>(sp => sp.GetRequiredService<EigdoDbContext>());

        // Redis
        var redisConnection = configuration.GetValue<string>("REDIS_CONNECTION") ?? "localhost:6379";
        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = redisConnection;
            options.InstanceName = "eigdo:";
        });

        // Redis connection multiplexer (for distributed locking)
        services.AddSingleton<IConnectionMultiplexer>(
            _ => ConnectionMultiplexer.Connect(redisConnection));

        // Named HttpClients
        services.AddHttpClient("alanube", client =>
        {
            var baseUrl = configuration.GetValue<string>("ALANUBE_BASE_URL") ?? "https://sandbox.alanube.co/dom/v1";
            client.BaseAddress = new Uri(baseUrl);
            client.Timeout = TimeSpan.FromSeconds(30);
            client.DefaultRequestHeaders.Add("Accept", "application/json");

            var token = configuration.GetValue<string>("ALANUBE_JWT_TOKEN");
            if (!string.IsNullOrEmpty(token))
            {
                client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            }
        });

        services.AddHttpClient("qbo", client =>
        {
            var env = configuration.GetValue<string>("QBO_ENVIRONMENT") ?? "sandbox";
            var baseUrl = env == "production"
                ? "https://quickbooks.api.intuit.com"
                : "https://sandbox-quickbooks.api.intuit.com";
            client.BaseAddress = new Uri(baseUrl);
            client.Timeout = TimeSpan.FromSeconds(30);
            client.DefaultRequestHeaders.Add("Accept", "application/json");
        });

        // Security
        services.AddSingleton<IEncryptionService, EncryptionService>();

        // Services
        services.AddScoped<IAuditService, AuditService>();
        services.AddScoped<ISequenceService, SequenceService>();

        // Fiscal provider
        services.AddScoped<IFiscalProvider, AlanubeClient>();

        // QBO integration
        services.AddScoped<IQboClient, Integration.QboApiClient>();

        // DGII RNC lookup
        services.AddScoped<IDgiiRncService, DgiiRncService>();

        return services;
    }
}
