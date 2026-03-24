namespace Eigdo.Domain.Interfaces;

/// <summary>
/// Resolves platform-level configuration (URLs, support info) from the database,
/// falling back to IConfiguration (env vars) when not present.
/// All values are managed from the SuperAdmin panel.
/// </summary>
public interface IPlatformConfigProvider
{
    Task<string> GetAppUrlAsync();
    Task<string> GetAdminUrlAsync();
    Task<string> GetApiUrlAsync();
    Task<string> GetLandingUrlAsync();
    Task<string> GetWhatsAppNumberAsync();
    Task<string> GetSupportEmailAsync();
    Task<string> GetViafirmaUrlAsync();
}
