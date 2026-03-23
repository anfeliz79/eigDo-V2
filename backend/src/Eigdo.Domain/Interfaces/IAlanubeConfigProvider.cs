namespace Eigdo.Domain.Interfaces;

/// <summary>
/// Provides Alanube reseller configuration, reading from the database first
/// and falling back to environment variables / appsettings.
/// </summary>
public interface IAlanubeConfigProvider
{
    Task<string> GetBaseUrlAsync();
    Task<string> GetJwtTokenAsync();
    Task<string> GetEnvironmentAsync();
    Task<bool> IsConfiguredAsync();
}
