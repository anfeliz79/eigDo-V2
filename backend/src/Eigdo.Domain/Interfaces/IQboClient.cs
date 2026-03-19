namespace Eigdo.Domain.Interfaces;

public interface IQboClient
{
    Task<string> GetAuthorizationUrlAsync(Guid companyId, string redirectUri);
    Task<QboTokenResult> ExchangeCodeAsync(string code, string realmId, string redirectUri, CancellationToken ct = default);
    Task<QboTokenResult> RefreshTokenAsync(string encryptedRefreshToken, CancellationToken ct = default);
    Task<T?> GetEntityAsync<T>(string realmId, string accessToken, string entityId, CancellationToken ct = default) where T : class;
    Task<IReadOnlyList<T>> QueryAsync<T>(string realmId, string accessToken, string query, CancellationToken ct = default) where T : class;
}

public record QboTokenResult(bool Success, string? AccessToken, string? RefreshToken, DateTime? AccessTokenExpires, DateTime? RefreshTokenExpires, string? Error);
