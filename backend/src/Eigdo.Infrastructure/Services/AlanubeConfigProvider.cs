using Eigdo.Application.Interfaces;
using Eigdo.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Eigdo.Infrastructure.Services;

/// <summary>
/// Resolves Alanube reseller configuration from the database (app_settings table),
/// falling back to IConfiguration (env vars / appsettings.json) when not present in DB.
/// Values are cached in-memory for 5 minutes to avoid repeated DB queries.
/// </summary>
public class AlanubeConfigProvider : IAlanubeConfigProvider
{
    private readonly IEigdoDbContext _db;
    private readonly IEncryptionService _encryption;
    private readonly IConfiguration _config;

    // Simple in-memory cache with expiry
    private static Dictionary<string, (string Value, DateTime ExpiresAt)> _cache = new();
    private static readonly object _lock = new();
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    public AlanubeConfigProvider(IEigdoDbContext db, IEncryptionService encryption, IConfiguration config)
    {
        _db = db;
        _encryption = encryption;
        _config = config;
    }

    public Task<string> GetBaseUrlAsync() => GetValueAsync("Alanube:BaseUrl", "ALANUBE_BASE_URL", "https://sandbox.alanube.co/dom/v1");
    public Task<string> GetJwtTokenAsync() => GetValueAsync("Alanube:JwtToken", "ALANUBE_JWT_TOKEN");
    public Task<string> GetEnvironmentAsync() => GetValueAsync("Alanube:Environment", "ALANUBE_ENVIRONMENT", "Sandbox");

    public async Task<bool> IsConfiguredAsync()
    {
        var token = await GetJwtTokenAsync();
        return !string.IsNullOrEmpty(token);
    }

    private async Task<string> GetValueAsync(string dbKey, string envKey, string fallback = "")
    {
        // Check in-memory cache first
        lock (_lock)
        {
            if (_cache.TryGetValue(dbKey, out var cached) && cached.ExpiresAt > DateTime.UtcNow)
                return cached.Value;
        }

        // Try database using the dbKey
        var dbSetting = await _db.AppSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == dbKey);

        if (dbSetting != null && !string.IsNullOrEmpty(dbSetting.Value))
        {
            var value = dbSetting.IsSecret
                ? _encryption.Decrypt(dbSetting.Value)
                : dbSetting.Value;

            SetCache(dbKey, value);
            return value;
        }

        // Fall back to IConfiguration (env vars / appsettings)
        var envValue = _config.GetValue<string>(envKey) ?? fallback;
        SetCache(dbKey, envValue);
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
    /// Clears the cached config values. Call after updating Alanube config in the database.
    /// </summary>
    public static void ClearCache()
    {
        lock (_lock)
        {
            _cache.Clear();
        }
    }
}
