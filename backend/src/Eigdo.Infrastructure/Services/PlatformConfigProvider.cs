using Eigdo.Application.Interfaces;
using Eigdo.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Eigdo.Infrastructure.Services;

/// <summary>
/// Resolves platform configuration from the database (app_settings table),
/// falling back to IConfiguration (env vars) when not present.
/// Values are cached in-memory for 5 minutes.
/// Managed from the SuperAdmin panel at /settings/platform.
/// </summary>
public class PlatformConfigProvider : IPlatformConfigProvider
{
    private readonly IEigdoDbContext _db;
    private readonly IConfiguration _config;

    private static Dictionary<string, (string Value, DateTime ExpiresAt)> _cache = new();
    private static readonly object _lock = new();
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    public PlatformConfigProvider(IEigdoDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public Task<string> GetAppUrlAsync() => GetValueAsync("platform.app_url", "APP_URL", "http://localhost:3002");
    public Task<string> GetAdminUrlAsync() => GetValueAsync("platform.admin_url", "ADMIN_URL", "http://localhost:3001");
    public Task<string> GetApiUrlAsync() => GetValueAsync("platform.api_url", "API_URL", "http://localhost:5000");
    public Task<string> GetLandingUrlAsync() => GetValueAsync("platform.landing_url", "LANDING_URL", "http://localhost:3000");
    public Task<string> GetWhatsAppNumberAsync() => GetValueAsync("platform.whatsapp_number", "WHATSAPP_NUMBER", "18095550000");
    public Task<string> GetSupportEmailAsync() => GetValueAsync("platform.support_email", "SUPPORT_EMAIL", "soporte@eigdo.com");
    public Task<string> GetViafirmaUrlAsync() => GetValueAsync("platform.viafirma_url", "VIAFIRMA_URL", "https://www.viafirma.do");

    /// <summary>
    /// Reads from DB first (app_settings key), then env var, then fallback.
    /// </summary>
    private async Task<string> GetValueAsync(string dbKey, string envKey, string fallback)
    {
        lock (_lock)
        {
            if (_cache.TryGetValue(dbKey, out var cached) && cached.ExpiresAt > DateTime.UtcNow)
                return cached.Value;
        }

        var dbSetting = await _db.AppSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == dbKey);

        if (dbSetting != null && !string.IsNullOrEmpty(dbSetting.Value))
        {
            SetCache(dbKey, dbSetting.Value);
            return dbSetting.Value;
        }

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

    public static void ClearCache()
    {
        lock (_lock)
        {
            _cache.Clear();
        }
    }
}
