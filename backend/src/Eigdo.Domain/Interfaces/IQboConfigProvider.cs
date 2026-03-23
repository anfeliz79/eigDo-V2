namespace Eigdo.Domain.Interfaces;

/// <summary>
/// Provides QBO app configuration, reading from the database first
/// and falling back to environment variables / appsettings.
/// </summary>
public interface IQboConfigProvider
{
    Task<string> GetClientIdAsync();
    Task<string> GetClientSecretAsync();
    Task<string> GetRedirectUriAsync();
    Task<string> GetEnvironmentAsync();
    Task<string> GetWebhookVerifierTokenAsync();
    Task<string> GetScopeAsync();
}
