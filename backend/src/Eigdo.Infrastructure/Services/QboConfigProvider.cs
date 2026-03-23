using Eigdo.Application.Interfaces;
using Eigdo.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;

namespace Eigdo.Infrastructure.Services;

/// <summary>
/// Resolves QBO app configuration from the database (app_settings table),
/// falling back to IConfiguration (env vars / appsettings.json) when not present in DB.
/// Values are cached in-memory for 5 minutes to avoid repeated DB queries.
/// </summary>
public class QboConfigProvider : IQboConfigProvider
{
    private readonly IEigdoDbContext _db;
    private readonly IEncryptionService _encryption;
    private readonly IConfiguration _config;

    // Simple in-memory cache with expiry
    private static Dictionary<string, (string Value, DateTime ExpiresAt)> _cache = new();
    private static readonly object _lock = new();
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    public QboConfigProvider(IEigdoDbContext db, IEncryptionService encryption, IConfiguration config)
    {
        _db = db;
        _encryption = encryption;
        _config = config;
    }

    public Task<string> GetClientIdAsync() => GetValueAsync("QBO_CLIENT_ID");
    public Task<string> GetClientSecretAsync() => GetValueAsync("QBO_CLIENT_SECRET");
    public Task<string> GetRedirectUriAsync() => GetValueAsync("QBO_REDIRECT_URI", "http://localhost:5102/api/qbo/callback");
    public Task<string> GetEnvironmentAsync() => GetValueAsync("QBO_ENVIRONMENT", "sandbox");
    public Task<string> GetWebhookVerifierTokenAsync() => GetValueAsync("QBO_WEBHOOK_VERIFIER_TOKEN");
    public Task<string> GetScopeAsync() => GetValueAsync("QBO_SCOPE", "com.intuit.quickbooks.accounting");

    private async Task<string> GetValueAsync(string key, string fallback = "")
    {
        // Check in-memory cache first
        lock (_lock)
        {
            if (_cache.TryGetValue(key, out var cached) && cached.ExpiresAt > DateTime.UtcNow)
                return cached.Value;
        }

        // Try database
        var dbSetting = await _db.AppSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == key);

        if (dbSetting != null && !string.IsNullOrEmpty(dbSetting.Value))
        {
            var value = dbSetting.IsSecret
                ? _encryption.Decrypt(dbSetting.Value)
                : dbSetting.Value;

            SetCache(key, value);
            return value;
        }

        // Fall back to IConfiguration (env vars / appsettings)
        var envValue = _config.GetValue<string>(key) ?? fallback;
        SetCache(key, envValue);
        return envValue;
    }

    private static void SetCache(string key, string value)
    {
        lock (_lock)
        {
            _cache[key] = (value, DateTime.UtcNow.Add(CacheDuration));
        }
    }

    /// <summary>
    /// Clears the cached config values. Call after updating QBO config in the database.
    /// </summary>
    public static void ClearCache()
    {
        lock (_lock)
        {
            _cache.Clear();
        }
    }
}
