using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Eigdo.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace Eigdo.Infrastructure.Integration;

/// <summary>
/// QuickBooks Online OAuth 2.0 client — handles authorization, token exchange, refresh, and data queries.
/// Uses IEncryptionService to encrypt/decrypt tokens at rest.
/// </summary>
public class QboApiClient : IQboClient
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IEncryptionService _encryption;
    private readonly IQboConfigProvider _configProvider;
    private readonly ILogger<QboApiClient> _logger;

    private const string AuthBaseUrl = "https://appcenter.intuit.com/connect/oauth2";
    private const string TokenUrl = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
    private const string SandboxApiBase = "https://sandbox-quickbooks.api.intuit.com";
    private const string ProductionApiBase = "https://quickbooks.api.intuit.com";

    public QboApiClient(
        IHttpClientFactory httpClientFactory,
        IEncryptionService encryption,
        IQboConfigProvider configProvider,
        ILogger<QboApiClient> logger)
    {
        _httpClientFactory = httpClientFactory;
        _encryption = encryption;
        _configProvider = configProvider;
        _logger = logger;
    }

    private async Task<string> GetApiBaseUrlAsync()
    {
        var env = await _configProvider.GetEnvironmentAsync();
        return env == "production" ? ProductionApiBase : SandboxApiBase;
    }

    /// <summary>
    /// Generates the OAuth 2.0 authorization URL for the user to grant access.
    /// </summary>
    public async Task<string> GetAuthorizationUrlAsync(Guid companyId, string redirectUri)
    {
        var clientId = await _configProvider.GetClientIdAsync();
        var scope = await _configProvider.GetScopeAsync();
        var state = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{companyId}:{Guid.NewGuid():N}"));

        var url = $"{AuthBaseUrl}?" +
            $"client_id={Uri.EscapeDataString(clientId)}" +
            $"&response_type=code" +
            $"&scope={Uri.EscapeDataString(scope)}" +
            $"&redirect_uri={Uri.EscapeDataString(redirectUri)}" +
            $"&state={Uri.EscapeDataString(state)}";

        return url;
    }

    /// <summary>
    /// Exchanges the authorization code for access + refresh tokens.
    /// Tokens are encrypted before returning.
    /// </summary>
    public async Task<QboTokenResult> ExchangeCodeAsync(string code, string realmId, string redirectUri, CancellationToken ct = default)
    {
        try
        {
            var clientId = await _configProvider.GetClientIdAsync();
            var clientSecret = await _configProvider.GetClientSecretAsync();
            var client = _httpClientFactory.CreateClient();
            var authHeader = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", authHeader);

            var content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "authorization_code",
                ["code"] = code,
                ["redirect_uri"] = redirectUri
            });

            var response = await client.PostAsync(TokenUrl, content, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("QBO token exchange failed: HTTP {StatusCode} — {Body}", (int)response.StatusCode, body);
                return new QboTokenResult(false, null, null, null, null, $"Token exchange failed: HTTP {(int)response.StatusCode}");
            }

            return ParseTokenResponse(body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "QBO token exchange error");
            return new QboTokenResult(false, null, null, null, null, ex.Message);
        }
    }

    /// <summary>
    /// Refreshes an expired access token using the encrypted refresh token.
    /// </summary>
    public async Task<QboTokenResult> RefreshTokenAsync(string encryptedRefreshToken, CancellationToken ct = default)
    {
        try
        {
            var clientId = await _configProvider.GetClientIdAsync();
            var clientSecret = await _configProvider.GetClientSecretAsync();
            var refreshToken = _encryption.Decrypt(encryptedRefreshToken);

            var client = _httpClientFactory.CreateClient();
            var authHeader = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", authHeader);

            var content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "refresh_token",
                ["refresh_token"] = refreshToken
            });

            var response = await client.PostAsync(TokenUrl, content, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("QBO token refresh failed: HTTP {StatusCode}", (int)response.StatusCode);
                return new QboTokenResult(false, null, null, null, null, $"Token refresh failed: HTTP {(int)response.StatusCode}");
            }

            return ParseTokenResponse(body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "QBO token refresh error");
            return new QboTokenResult(false, null, null, null, null, ex.Message);
        }
    }

    /// <summary>
    /// Fetches a single entity from QBO by ID.
    /// </summary>
    public async Task<T?> GetEntityAsync<T>(string realmId, string accessToken, string entityId, CancellationToken ct = default) where T : class
    {
        try
        {
            var apiBaseUrl = await GetApiBaseUrlAsync();
            var typeName = typeof(T).Name;
            var entityName = typeName.ToLower();
            var url = $"{apiBaseUrl}/v3/company/{realmId}/{entityName}/{entityId}?minorversion=73";

            _logger.LogInformation("QBO GetEntity: GET {Url}", url);

            var client = CreateAuthenticatedClient(accessToken);
            var response = await client.GetAsync(url, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            _logger.LogInformation("QBO GetEntity: HTTP {StatusCode}, body length={Length}, body prefix={Prefix}",
                (int)response.StatusCode, body.Length, body.Length > 200 ? body[..200] : body);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("QBO GET {Entity}/{Id} failed: HTTP {StatusCode} — {Body}", entityName, entityId, (int)response.StatusCode, body);
                return null;
            }

            using var doc = JsonDocument.Parse(body);

            // QBO wraps responses: { "EntityName": { ... } }
            if (doc.RootElement.TryGetProperty(typeName, out var entityElement))
            {
                return JsonSerializer.Deserialize<T>(entityElement.GetRawText(), JsonOptions);
            }

            _logger.LogWarning("QBO GetEntity: property '{TypeName}' not found in response. Available: {Props}",
                typeName, string.Join(", ", doc.RootElement.EnumerateObject().Select(p => p.Name)));

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "QBO GetEntity error for {Entity}/{Id}", typeof(T).Name, entityId);
            return null;
        }
    }

    /// <summary>
    /// Executes a QBO query (e.g. "SELECT * FROM Invoice WHERE Id = '123'").
    /// </summary>
    public async Task<IReadOnlyList<T>> QueryAsync<T>(string realmId, string accessToken, string query, CancellationToken ct = default) where T : class
    {
        try
        {
            var apiBaseUrl = await GetApiBaseUrlAsync();
            var url = $"{apiBaseUrl}/v3/company/{realmId}/query?query={Uri.EscapeDataString(query)}&minorversion=73";

            var client = CreateAuthenticatedClient(accessToken);
            var response = await client.GetAsync(url, ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("QBO query failed: HTTP {StatusCode} — Query: {Query}", (int)response.StatusCode, query);
                return Array.Empty<T>();
            }

            var body = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(body);

            // QBO query response: { "QueryResponse": { "EntityName": [...], "totalCount": N } }
            if (!doc.RootElement.TryGetProperty("QueryResponse", out var queryResponse))
                return Array.Empty<T>();

            var entityName = typeof(T).Name;
            if (!queryResponse.TryGetProperty(entityName, out var items))
                return Array.Empty<T>();

            var result = JsonSerializer.Deserialize<List<T>>(items.GetRawText(), JsonOptions);
            return result?.AsReadOnly() ?? (IReadOnlyList<T>)Array.Empty<T>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "QBO query error: {Query}", query);
            return Array.Empty<T>();
        }
    }

    private QboTokenResult ParseTokenResponse(string body)
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        var accessToken = root.GetProperty("access_token").GetString()!;
        var refreshToken = root.GetProperty("refresh_token").GetString()!;
        var expiresIn = root.GetProperty("expires_in").GetInt32(); // seconds
        var refreshExpiresIn = root.TryGetProperty("x_refresh_token_expires_in", out var xRefresh)
            ? xRefresh.GetInt32()
            : 8726400; // ~101 days default

        // Encrypt tokens before returning
        var encryptedAccess = _encryption.Encrypt(accessToken);
        var encryptedRefresh = _encryption.Encrypt(refreshToken);

        return new QboTokenResult(
            true,
            encryptedAccess,
            encryptedRefresh,
            DateTime.UtcNow.AddSeconds(expiresIn),
            DateTime.UtcNow.AddSeconds(refreshExpiresIn),
            null
        );
    }

    private HttpClient CreateAuthenticatedClient(string accessToken)
    {
        var client = _httpClientFactory.CreateClient("qbo");
        var decryptedToken = _encryption.Decrypt(accessToken);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", decryptedToken);
        client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        return client;
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };
}
