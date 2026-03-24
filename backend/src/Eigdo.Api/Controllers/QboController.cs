using Eigdo.Application.DTOs;
using Eigdo.Application.DTOs.Qbo;
using Eigdo.Application.Interfaces;
using Eigdo.Domain.Entities.Integration;
using Eigdo.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Eigdo.Api.Controllers;

/// <summary>
/// QuickBooks Online OAuth 2.0 integration endpoints.
/// Handles authorization flow, token exchange, and connection management.
/// When QBO_CLIENT_ID is not configured, operates in sandbox mode.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class QboController : EigdoControllerBase
{
    private readonly IQboClient _qboClient;
    private readonly IEigdoDbContext _db;
    private readonly IAuditService _audit;
    private readonly IConfiguration _config;
    private readonly IQboConfigProvider _qboConfig;
    private readonly IPlatformConfigProvider _platformConfig;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IEncryptionService _encryption;
    private readonly ILogger<QboController> _logger;

    public QboController(IQboClient qboClient, IEigdoDbContext db, IAuditService audit, IConfiguration config, IQboConfigProvider qboConfig, IPlatformConfigProvider platformConfig, IHttpClientFactory httpClientFactory, IEncryptionService encryption, ILogger<QboController> logger)
    {
        _qboClient = qboClient;
        _db = db;
        _audit = audit;
        _config = config;
        _qboConfig = qboConfig;
        _platformConfig = platformConfig;
        _httpClientFactory = httpClientFactory;
        _encryption = encryption;
        _logger = logger;
    }

    private async Task<bool> IsQboConfiguredAsync()
    {
        var clientId = await _qboConfig.GetClientIdAsync();
        return !string.IsNullOrEmpty(clientId);
    }

    private async Task<bool> IsSandboxModeAsync()
    {
        var env = await _qboConfig.GetEnvironmentAsync();
        return string.Equals(env, "Sandbox", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Get the OAuth 2.0 authorization URL to redirect the user to Intuit.
    /// When credentials are configured, ALWAYS does real OAuth (sandbox or production based on QBO_ENVIRONMENT).
    /// Only simulates when no credentials are configured at all.
    /// </summary>
    [HttpGet("auth-url")]
    public async Task<IActionResult> GetAuthUrl(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId == null) return Unauthorized(ApiResponse<string>.Fail("Empresa no identificada."));

        var isConfigured = await IsQboConfiguredAsync();
        var isSandbox = await IsSandboxModeAsync();

        // No credentials at all — block connection
        if (!isConfigured)
            return BadRequest(ApiResponse<string>.Fail("QuickBooks no esta configurado. El administrador debe configurar las credenciales desde el panel de administracion (Admin > Config QBO)."));

        // Credentials exist — always use real OAuth (even in sandbox mode, Intuit has a sandbox OAuth)
        var clientId = await _qboConfig.GetClientIdAsync();
        var redirectUri = await _qboConfig.GetRedirectUriAsync();

        if (string.IsNullOrEmpty(redirectUri))
        {
            return BadRequest(ApiResponse<object>.Fail(
                "La URL de callback (Redirect URI) no esta configurada. " +
                "Pidele al administrador que la configure en Admin > Config QBO > URI de Redireccion. " +
                "Ejemplo: https://tudominio.com/api/qbo/callback"));
        }

        var url = await _qboClient.GetAuthorizationUrlAsync(companyId.Value, redirectUri);

        return Ok(ApiResponse<object>.Ok(new { authUrl = url, sandbox = isSandbox }));
    }

    /// <summary>
    /// DEPRECATED: Sandbox simulation endpoint. Only works when NO credentials are configured.
    /// With proper QBO sandbox credentials, use the real OAuth flow instead.
    /// </summary>
    [HttpGet("sandbox-connect")]
    [AllowAnonymous]
    public async Task<IActionResult> SandboxConnect([FromQuery] Guid companyId, CancellationToken ct)
    {
        // Only allow simulation when QBO credentials are NOT configured (pure local dev)
        if (await IsQboConfiguredAsync())
            return BadRequest(ApiResponse<string>.Fail("Las credenciales QBO estan configuradas. Usa el flujo OAuth real."));

        var sandboxRealmId = $"sandbox_{Guid.NewGuid():N}".Substring(0, 20);

        // Create or update QboConnection
        var existing = await _db.QboConnections.FirstOrDefaultAsync(q => q.CompanyId == companyId, ct);

        if (existing != null)
        {
            existing.RealmId = sandboxRealmId;
            existing.AccessTokenEncrypted = "sandbox_access_token";
            existing.RefreshTokenEncrypted = "sandbox_refresh_token";
            existing.AccessTokenExpiresUtc = DateTime.UtcNow.AddDays(180);
            existing.RefreshTokenExpiresUtc = DateTime.UtcNow.AddDays(365);
            existing.IsActive = true;
            existing.LastSyncUtc = DateTime.UtcNow;
        }
        else
        {
            _db.QboConnections.Add(new QboConnection
            {
                CompanyId = companyId,
                RealmId = sandboxRealmId,
                AccessTokenEncrypted = "sandbox_access_token",
                RefreshTokenEncrypted = "sandbox_refresh_token",
                AccessTokenExpiresUtc = DateTime.UtcNow.AddDays(180),
                RefreshTokenExpiresUtc = DateTime.UtcNow.AddDays(365),
                IsActive = true,
                LastSyncUtc = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync(companyId, null, "qbo.sandbox_connected", "QboConnection", sandboxRealmId, ct: ct);

        // Auto-advance onboarding if at NotStarted (QBO is step 1)
        var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == companyId, ct);
        if (company != null && company.OnboardingStep == Eigdo.Domain.Enums.OnboardingStep.NotStarted)
        {
            company.OnboardingStep = Eigdo.Domain.Enums.OnboardingStep.QboConnection;
            company.UpdatedAtUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }

        // Redirect to frontend onboarding — URL resolved from SuperAdmin config
        var appUrl = (await _platformConfig.GetAppUrlAsync()).TrimEnd('/');
        var frontendUrl = $"{appUrl}/onboarding?qbo=connected";
        return Redirect(frontendUrl);
    }

    /// <summary>
    /// OAuth 2.0 callback — exchanges the authorization code for tokens.
    /// </summary>
    [HttpGet("callback")]
    [AllowAnonymous]
    public async Task<IActionResult> Callback([FromQuery] string code, [FromQuery] string realmId, [FromQuery] string state, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(realmId))
            return BadRequest(ApiResponse<string>.Fail("Faltan parametros de autorizacion."));

        // Decode companyId from state
        Guid companyId;
        try
        {
            var decoded = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(state));
            companyId = Guid.Parse(decoded.Split(':')[0]);
        }
        catch
        {
            return BadRequest(ApiResponse<string>.Fail("Parametro de estado invalido."));
        }

        var redirectUri = await _qboConfig.GetRedirectUriAsync();

        if (string.IsNullOrEmpty(redirectUri))
        {
            _logger.LogError("QBO callback failed: QBO_REDIRECT_URI is not configured");
            return BadRequest(ApiResponse<object>.Fail("Error de configuracion: la URL de callback (QBO_REDIRECT_URI) no esta configurada. " +
                "Configure la URI de redireccion en el panel de administracion (Admin > Config QBO) o en la variable de entorno QBO_REDIRECT_URI. " +
                "La URL debe coincidir exactamente con la configurada en la app de Intuit Developer: https://developer.intuit.com"));
        }

        var result = await _qboClient.ExchangeCodeAsync(code, realmId, redirectUri, ct);

        if (!result.Success)
        {
            var errorDetail = result.Error ?? "Error desconocido";
            _logger.LogError("QBO token exchange failed. RedirectUri={RedirectUri}, Error={Error}", redirectUri, errorDetail);

            // Detect common callback URL issues
            var errorMessage = errorDetail.ToLowerInvariant() switch
            {
                var e when e.Contains("redirect_uri") || e.Contains("redirect uri") || e.Contains("invalid_grant") =>
                    $"Error de callback de QuickBooks: la URL de redireccion no coincide. " +
                    $"URL configurada en eigdo: {redirectUri}. " +
                    $"Asegurese de que esta URL este registrada exactamente igual en su app de Intuit Developer " +
                    $"(https://developer.intuit.com > Dashboard > su app > Keys & credentials > Redirect URIs). " +
                    $"Detalle del error: {errorDetail}",
                var e when e.Contains("unauthorized") || e.Contains("invalid_client") =>
                    $"Error de autenticacion con QuickBooks: las credenciales de la app (Client ID / Client Secret) son invalidas o estan expiradas. " +
                    $"Verifique la configuracion en Admin > Config QBO. Detalle: {errorDetail}",
                _ => $"Error al conectar con QuickBooks. Detalle: {errorDetail}. " +
                    $"URL de callback configurada: {redirectUri}. " +
                    $"Si el problema persiste, verifique que la URL de callback este correctamente configurada en Intuit Developer " +
                    $"y en Admin > Config QBO."
            };

            return BadRequest(ApiResponse<string>.Fail(errorMessage));
        }

        // Save or update connection
        var existing = await _db.QboConnections.FirstOrDefaultAsync(q => q.CompanyId == companyId, ct);

        if (existing != null)
        {
            existing.RealmId = realmId;
            existing.AccessTokenEncrypted = result.AccessToken!;
            existing.RefreshTokenEncrypted = result.RefreshToken!;
            existing.AccessTokenExpiresUtc = result.AccessTokenExpires!.Value;
            existing.RefreshTokenExpiresUtc = result.RefreshTokenExpires!.Value;
            existing.IsActive = true;
        }
        else
        {
            _db.QboConnections.Add(new QboConnection
            {
                CompanyId = companyId,
                RealmId = realmId,
                AccessTokenEncrypted = result.AccessToken!,
                RefreshTokenEncrypted = result.RefreshToken!,
                AccessTokenExpiresUtc = result.AccessTokenExpires!.Value,
                RefreshTokenExpiresUtc = result.RefreshTokenExpires!.Value,
                IsActive = true
            });
        }

        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync(companyId, null, "qbo.connected", "QboConnection", realmId, ct: ct);

        // Auto-advance onboarding if at NotStarted (QBO is step 1)
        var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == companyId, ct);
        if (company != null && company.OnboardingStep == Eigdo.Domain.Enums.OnboardingStep.NotStarted)
        {
            company.OnboardingStep = Eigdo.Domain.Enums.OnboardingStep.QboConnection;
            company.UpdatedAtUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }

        // Redirect to frontend app after successful connection — URL from SuperAdmin config
        var appUrl2 = (await _platformConfig.GetAppUrlAsync()).TrimEnd('/');
        var frontendUrl = $"{appUrl2}/onboarding?qbo=connected";
        return Redirect(frontendUrl);
    }

    /// <summary>
    /// Get current QBO connection status for the company.
    /// </summary>
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId == null) return Unauthorized(ApiResponse<string>.Fail("Empresa no identificada."));

        var isConfigured = await IsQboConfiguredAsync();
        var isSandbox = await IsSandboxModeAsync();
        var connection = await _db.QboConnections
            .FirstOrDefaultAsync(q => q.CompanyId == companyId.Value && q.IsActive, ct);

        if (connection == null)
            return Ok(ApiResponse<object>.Ok(new { connected = false, configured = isConfigured, sandbox = isSandbox }));

        return Ok(ApiResponse<object>.Ok(new
        {
            connected = true,
            configured = isConfigured,
            realmId = connection.RealmId,
            accessTokenExpires = connection.AccessTokenExpiresUtc,
            refreshTokenExpires = connection.RefreshTokenExpiresUtc,
            lastSync = connection.LastSyncUtc,
            sandbox = isSandbox
        }));
    }

    /// <summary>
    /// Fetch company info from QBO to pre-fill fiscal settings.
    /// Returns mapped QBO fields so the frontend can suggest values.
    /// In sandbox mode, returns simulated company data.
    /// </summary>
    [HttpGet("company-info")]
    public async Task<IActionResult> GetCompanyInfo(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        _logger.LogInformation("QBO company-info: companyId={CompanyId}", companyId);
        if (companyId == null) return Unauthorized(ApiResponse<string>.Fail("Empresa no identificada."));

        var connection = await _db.QboConnections
            .FirstOrDefaultAsync(q => q.CompanyId == companyId.Value && q.IsActive, ct);

        var isSandbox = await IsSandboxModeAsync();
        _logger.LogInformation("QBO company-info: connection found={Found}, isSandbox={Sandbox}",
            connection != null, isSandbox);

        if (connection == null)
            return NotFound(ApiResponse<string>.Fail("No hay conexion activa con QuickBooks."));

        if (isSandbox)
        {
            // Return simulated data in sandbox mode
            var sandboxInfo = new QboCompanyInfoDto
            {
                CompanyName = "Empresa Demo SRL",
                LegalName = "Empresa Demostracion SRL",
                Ein = "131000000",
                Phone = "809-555-0001",
                Email = "demo@empresa.com",
                Website = "https://empresa-demo.com",
                AddressLine1 = "Av. Winston Churchill #1099",
                City = "Santo Domingo",
                CountrySubDivisionCode = "Distrito Nacional",
                Country = "DO",
                PostalCode = "10100",
                FullAddress = "Av. Winston Churchill #1099, Santo Domingo, Distrito Nacional, 10100, DO",
                LegalAddressLine1 = "Av. Winston Churchill #1099",
                LegalCity = "Santo Domingo",
                LegalCountrySubDivisionCode = "Distrito Nacional",
                LegalCountry = "DO",
                LegalPostalCode = "10100",
                LegalFullAddress = "Av. Winston Churchill #1099, Santo Domingo, Distrito Nacional, 10100, DO",
                FiscalYearStartMonth = "January",
                CompanyStartDate = "2024-01-01"
            };
            return Ok(ApiResponse<QboCompanyInfoDto>.Ok(sandboxInfo));
        }

        try
        {
            // Refresh token if expired
            connection = await EnsureValidToken(connection, ct);

            // QBO CompanyInfo: use GetEntityAsync with realmId as entityId
            // The CompanyInfo read endpoint is: GET /v3/company/{realmId}/companyinfo/{realmId}
            var qboInfo = await _qboClient.GetEntityAsync<CompanyInfo>(
                connection.RealmId,
                connection.AccessTokenEncrypted,
                connection.RealmId, // CompanyInfo uses realmId as entityId
                ct);

            _logger.LogInformation("QBO company-info: GetEntity returned {Found}", qboInfo != null);

            if (qboInfo == null)
                return NotFound(ApiResponse<string>.Fail("No se pudo obtener la informacion de la empresa desde QuickBooks. Es posible que necesite reconectar su cuenta de QBO."));

            var dto = MapQboCompanyInfo(qboInfo);

            return Ok(ApiResponse<QboCompanyInfoDto>.Ok(dto));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al obtener CompanyInfo de QBO para companyId {CompanyId}", companyId.Value);
            return StatusCode(500, ApiResponse<string>.Fail("Error al consultar QuickBooks. Intenta de nuevo."));
        }
    }

    /// <summary>
    /// Refreshes the QBO access token if it's expired or about to expire (within 5 minutes).
    /// Saves the new tokens to the database.
    /// </summary>
    private async Task<QboConnection> EnsureValidToken(QboConnection connection, CancellationToken ct)
    {
        // Give 5 minute buffer before expiration
        if (connection.AccessTokenExpiresUtc > DateTime.UtcNow.AddMinutes(5))
            return connection;

        _logger.LogInformation("QBO token expired for realmId={RealmId}, refreshing...", connection.RealmId);

        var result = await _qboClient.RefreshTokenAsync(connection.RefreshTokenEncrypted, ct);

        if (!result.Success)
        {
            _logger.LogWarning("QBO token refresh failed: {Error}", result.Error);
            // Mark connection as inactive so user knows they need to reconnect
            connection.IsActive = false;
            connection.UpdatedAtUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            throw new InvalidOperationException($"No se pudo renovar el token de QuickBooks: {result.Error}. Debe reconectar su cuenta.");
        }

        connection.AccessTokenEncrypted = result.AccessToken!;
        connection.RefreshTokenEncrypted = result.RefreshToken!;
        connection.AccessTokenExpiresUtc = result.AccessTokenExpires!.Value;
        connection.RefreshTokenExpiresUtc = result.RefreshTokenExpires!.Value;
        connection.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("QBO token refreshed successfully for realmId={RealmId}", connection.RealmId);

        return connection;
    }

    /// <summary>
    /// Maps QBO CompanyInfo response to our DTO.
    /// Ref: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/companyinfo
    /// </summary>
    private static QboCompanyInfoDto MapQboCompanyInfo(CompanyInfo qbo)
    {
        var dto = new QboCompanyInfoDto
        {
            CompanyName = qbo.CompanyName,
            LegalName = qbo.LegalName,
            Ein = qbo.EIN?.Replace("-", "").Trim(),
            Phone = qbo.PrimaryPhone?.FreeFormNumber,
            Email = qbo.Email?.Address,
            Website = qbo.WebAddr?.URI,
            FiscalYearStartMonth = qbo.FiscalYearStartMonth,
            CompanyStartDate = qbo.CompanyStartDate,
            Country = qbo.Country
        };

        // Company Address (CompanyAddr)
        if (qbo.CompanyAddr != null)
        {
            dto.AddressLine1 = qbo.CompanyAddr.Line1;
            dto.AddressLine2 = qbo.CompanyAddr.Line2;
            dto.City = qbo.CompanyAddr.City;
            dto.CountrySubDivisionCode = qbo.CompanyAddr.CountrySubDivisionCode;
            dto.PostalCode = qbo.CompanyAddr.PostalCode;
            dto.Country ??= qbo.CompanyAddr.Country;

            dto.FullAddress = BuildFullAddress(
                qbo.CompanyAddr.Line1, qbo.CompanyAddr.Line2,
                qbo.CompanyAddr.City, qbo.CompanyAddr.CountrySubDivisionCode,
                qbo.CompanyAddr.PostalCode, qbo.CompanyAddr.Country);
        }

        // Legal Address (LegalAddr — may differ for fiscal purposes)
        if (qbo.LegalAddr != null)
        {
            dto.LegalAddressLine1 = qbo.LegalAddr.Line1;
            dto.LegalCity = qbo.LegalAddr.City;
            dto.LegalCountrySubDivisionCode = qbo.LegalAddr.CountrySubDivisionCode;
            dto.LegalPostalCode = qbo.LegalAddr.PostalCode;
            dto.LegalCountry = qbo.LegalAddr.Country;

            dto.LegalFullAddress = BuildFullAddress(
                qbo.LegalAddr.Line1, null,
                qbo.LegalAddr.City, qbo.LegalAddr.CountrySubDivisionCode,
                qbo.LegalAddr.PostalCode, qbo.LegalAddr.Country);
        }

        return dto;
    }

    private static string BuildFullAddress(string? line1, string? line2, string? city, string? state, string? postal, string? country)
    {
        var parts = new[] { line1, line2, city, state, postal, country }
            .Where(p => !string.IsNullOrWhiteSpace(p));
        return string.Join(", ", parts);
    }

    #region QBO CompanyInfo raw models (match QBO API JSON structure exactly)
    // Ref: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/companyinfo

    private class CompanyInfo
    {
        public string? CompanyName { get; set; }
        public string? LegalName { get; set; }
        public string? EIN { get; set; }
        public string? Country { get; set; }
        public string? FiscalYearStartMonth { get; set; }
        public string? CompanyStartDate { get; set; }
        public QboPhoneRef? PrimaryPhone { get; set; }
        public QboEmailRef? Email { get; set; }
        public QboWebRef? WebAddr { get; set; }
        public QboAddressRef? CompanyAddr { get; set; }
        public QboAddressRef? LegalAddr { get; set; }
        public QboAddressRef? CustomerCommunicationAddr { get; set; }
        public List<QboNameValue>? NameValue { get; set; }
    }

    private class QboPhoneRef
    {
        public string? FreeFormNumber { get; set; }
    }

    private class QboEmailRef
    {
        public string? Address { get; set; }
    }

    private class QboWebRef
    {
        public string? URI { get; set; }
    }

    private class QboAddressRef
    {
        public string? Id { get; set; }
        public string? Line1 { get; set; }
        public string? Line2 { get; set; }
        public string? Line3 { get; set; }
        public string? City { get; set; }
        public string? CountrySubDivisionCode { get; set; }
        public string? PostalCode { get; set; }
        public string? Country { get; set; }
    }

    private class QboNameValue
    {
        public string? Name { get; set; }
        public string? Value { get; set; }
    }

    #endregion

    /// <summary>
    /// Returns synced customers from the local DB for field mapping.
    /// Uses real data already synced from QBO — no live API call needed.
    /// </summary>
    [HttpGet("sample/customer")]
    public async Task<IActionResult> GetSampleCustomer([FromQuery] int? skip, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId == null) return Unauthorized(ApiResponse<string>.Fail("Empresa no identificada."));

        var customers = await _db.CustomerMappings
            .Where(m => m.CompanyId == companyId.Value)
            .OrderBy(m => m.QboDisplayName)
            .ToListAsync(ct);

        if (customers.Count == 0)
            return NotFound(ApiResponse<string>.Fail("No hay clientes sincronizados. Sincroniza con QuickBooks primero."));

        var idx = (skip ?? 0) % customers.Count;
        var c = customers[idx];

        var fields = new Dictionary<string, string>
        {
            ["Id"] = c.QboCustomerId,
            ["DisplayName"] = c.QboDisplayName,
            ["RNC"] = c.Rnc ?? "",
            ["RazonSocial"] = c.RazonSocialDgii ?? "",
            ["TipoComprobante"] = c.TipoComprobante.ToString(),
            ["Excluido"] = c.Excluido.ToString(),
        };

        return Ok(ApiResponse<object>.Ok(new { id = c.QboCustomerId, displayName = c.QboDisplayName, fields, totalCount = customers.Count }));
    }

    /// <summary>
    /// Returns synced vendors from the local DB for field mapping.
    /// </summary>
    [HttpGet("sample/vendor")]
    public async Task<IActionResult> GetSampleVendor([FromQuery] int? skip, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId == null) return Unauthorized(ApiResponse<string>.Fail("Empresa no identificada."));

        var vendors = await _db.VendorMappings
            .Where(m => m.CompanyId == companyId.Value)
            .OrderBy(m => m.QboDisplayName)
            .ToListAsync(ct);

        if (vendors.Count == 0)
            return NotFound(ApiResponse<string>.Fail("No hay proveedores sincronizados. Sincroniza con QuickBooks primero."));

        var idx = (skip ?? 0) % vendors.Count;
        var v = vendors[idx];

        var fields = new Dictionary<string, string>
        {
            ["Id"] = v.QboVendorId,
            ["DisplayName"] = v.QboDisplayName,
            ["RNC"] = v.Rnc ?? "",
            ["RazonSocial"] = v.RazonSocialDgii ?? "",
            ["TipoComprobante"] = v.TipoComprobante.ToString(),
            ["RetentionItbisRate"] = v.RetentionItbisRate?.ToString("F2") ?? "",
            ["RetentionIsrRate"] = v.RetentionIsrRate?.ToString("F2") ?? "",
        };

        return Ok(ApiResponse<object>.Ok(new { id = v.QboVendorId, displayName = v.QboDisplayName, fields, totalCount = vendors.Count }));
    }

    /// <summary>
    /// Returns synced items from the local DB for field mapping.
    /// </summary>
    [HttpGet("sample/item")]
    public async Task<IActionResult> GetSampleItem([FromQuery] int? skip, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId == null) return Unauthorized(ApiResponse<string>.Fail("Empresa no identificada."));

        var items = await _db.ItemOverrides
            .Where(m => m.CompanyId == companyId.Value)
            .OrderBy(m => m.QboItemName)
            .ToListAsync(ct);

        if (items.Count == 0)
            return NotFound(ApiResponse<string>.Fail("No hay items sincronizados. Sincroniza con QuickBooks primero."));

        var idx = (skip ?? 0) % items.Count;
        var it = items[idx];

        var fields = new Dictionary<string, string>
        {
            ["Id"] = it.QboItemId,
            ["Name"] = it.QboItemName,
            ["UnitMeasureOverride"] = it.UnitMeasureOverride?.ToString() ?? "",
            ["GoodServiceIndicator"] = it.GoodServiceIndicatorOverride?.ToString() ?? "",
            ["QboItemType"] = it.QboItemType ?? "",
        };

        return Ok(ApiResponse<object>.Ok(new { id = it.QboItemId, displayName = it.QboItemName, fields, totalCount = items.Count }));
    }

    /// <summary>
    /// Sync customers, vendors, tax codes and items from QBO (or sandbox data).
    /// Creates mapping stubs that the user then fills in with fiscal data.
    /// </summary>
    [HttpPost("sync")]
    public async Task<IActionResult> Sync(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId == null) return Unauthorized(ApiResponse<string>.Fail("Empresa no identificada."));

        var connection = await _db.QboConnections
            .FirstOrDefaultAsync(q => q.CompanyId == companyId.Value && q.IsActive, ct);

        var isSandbox = await IsSandboxModeAsync();

        // In sandbox mode, allow sync even without QBO connection
        if (connection == null && !isSandbox)
            return NotFound(ApiResponse<string>.Fail("No hay conexion activa con QuickBooks."));

        int customersAdded = 0, vendorsAdded = 0, taxCodesAdded = 0, itemsAdded = 0;

        // Always use real QBO API — no more fake sandbox data
        try
        {
            connection = await EnsureValidToken(connection!, ct);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<string>.Fail(ex.Message));
        }

        var accessToken = _encryption.Decrypt(connection!.AccessTokenEncrypted);
        var apiBase = isSandbox
            ? "https://sandbox-quickbooks.api.intuit.com"
            : "https://quickbooks.api.intuit.com";

        // Helper to query QBO
        async Task<System.Text.Json.JsonElement?> QueryQbo(string qboQuery)
        {
            var url = $"{apiBase}/v3/company/{connection.RealmId}/query?query={Uri.EscapeDataString(qboQuery)}&minorversion=73";
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
            client.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));
            var resp = await client.GetAsync(url, ct);
            if (!resp.IsSuccessStatusCode)
            {
                var errBody = await resp.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("QBO sync query failed: HTTP {Status} for {Query} — {Body}", (int)resp.StatusCode, qboQuery, errBody);
                return null;
            }
            var body = await resp.Content.ReadAsStringAsync(ct);
            var doc = System.Text.Json.JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("QueryResponse", out var qr))
                return qr;
            return null;
        }

        // Sync Customers
        var custResp = await QueryQbo("SELECT Id, DisplayName, CompanyName, PrimaryEmailAddr, PrimaryPhone, Notes FROM Customer WHERE Active = true ORDERBY MetaData.LastUpdatedTime DESC MAXRESULTS 500");
        if (custResp?.TryGetProperty("Customer", out var customers) == true)
        {
            foreach (var c in customers.EnumerateArray())
            {
                var qboId = c.GetProperty("Id").GetString()!;
                var name = c.TryGetProperty("DisplayName", out var dn) ? dn.GetString() ?? qboId : qboId;
                var exists = await _db.CustomerMappings.AnyAsync(m => m.CompanyId == companyId.Value && m.QboCustomerId == qboId, ct);
                if (!exists)
                {
                    _db.CustomerMappings.Add(new Domain.Entities.Mapping.CustomerMapping
                    {
                        CompanyId = companyId.Value, QboCustomerId = qboId, QboDisplayName = name,
                        TipoComprobante = Domain.Enums.EcfType.E32
                    });
                    customersAdded++;
                }
            }
        }

        // Sync Vendors
        var vendResp = await QueryQbo("SELECT Id, DisplayName, CompanyName, PrimaryEmailAddr, PrimaryPhone, Notes FROM Vendor WHERE Active = true ORDERBY MetaData.LastUpdatedTime DESC MAXRESULTS 500");
        if (vendResp?.TryGetProperty("Vendor", out var vendors) == true)
        {
            foreach (var v in vendors.EnumerateArray())
            {
                var qboId = v.GetProperty("Id").GetString()!;
                var name = v.TryGetProperty("DisplayName", out var dn) ? dn.GetString() ?? qboId : qboId;
                var exists = await _db.VendorMappings.AnyAsync(m => m.CompanyId == companyId.Value && m.QboVendorId == qboId, ct);
                if (!exists)
                {
                    _db.VendorMappings.Add(new Domain.Entities.Mapping.VendorMapping
                    {
                        CompanyId = companyId.Value, QboVendorId = qboId, QboDisplayName = name,
                        TipoComprobante = Domain.Enums.EcfType.E41
                    });
                    vendorsAdded++;
                }
            }
        }

        // Sync Tax Codes
        var taxResp = await QueryQbo("SELECT Id, Name FROM TaxCode WHERE Active = true MAXRESULTS 100");
        if (taxResp?.TryGetProperty("TaxCode", out var taxCodes) == true)
        {
            foreach (var t in taxCodes.EnumerateArray())
            {
                var qboId = t.GetProperty("Id").GetString()!;
                var name = t.TryGetProperty("Name", out var n) ? n.GetString() ?? qboId : qboId;
                var exists = await _db.TaxCodeMappings.AnyAsync(m => m.CompanyId == companyId.Value && m.QboTaxCodeId == qboId, ct);
                if (!exists)
                {
                    _db.TaxCodeMappings.Add(new Domain.Entities.Mapping.TaxCodeMapping
                    {
                        CompanyId = companyId.Value, QboTaxCodeId = qboId, QboTaxCodeName = name,
                        QboTaxRate = 0, BillingIndicator = Domain.Enums.BillingIndicator.NonBillable
                    });
                    taxCodesAdded++;
                }
            }
        }

        // Sync Items
        var itemResp = await QueryQbo("SELECT Id, Name, Type FROM Item WHERE Active = true ORDERBY MetaData.LastUpdatedTime DESC MAXRESULTS 500");
        if (itemResp?.TryGetProperty("Item", out var items) == true)
        {
            foreach (var it in items.EnumerateArray())
            {
                var qboId = it.GetProperty("Id").GetString()!;
                var name = it.TryGetProperty("Name", out var n) ? n.GetString() ?? qboId : qboId;
                var itemType = it.TryGetProperty("Type", out var tp) ? tp.GetString() : null;
                var exists = await _db.ItemOverrides.AnyAsync(m => m.CompanyId == companyId.Value && m.QboItemId == qboId, ct);
                if (!exists)
                {
                    _db.ItemOverrides.Add(new Domain.Entities.Mapping.ItemOverride
                    {
                        CompanyId = companyId.Value, QboItemId = qboId, QboItemName = name, QboItemType = itemType
                    });
                    itemsAdded++;
                }
            }
        }

        await _db.SaveChangesAsync(ct);

        // Update last sync timestamp
        connection.LastSyncUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        // Log if any queries failed (returned null)
        if (custResp == null || vendResp == null || taxResp == null || itemResp == null)
        {
            _logger.LogWarning("QBO sync: Some queries failed. customers={C} vendors={V} taxes={T} items={I}",
                custResp != null, vendResp != null, taxResp != null, itemResp != null);
            var failedParts = new List<string>();
            if (custResp == null) failedParts.Add("clientes");
            if (vendResp == null) failedParts.Add("proveedores");
            if (taxResp == null) failedParts.Add("impuestos");
            if (itemResp == null) failedParts.Add("items");

            return Ok(ApiResponse<object>.Ok(new
            {
                customersAdded, vendorsAdded, taxCodesAdded, itemsAdded,
                message = $"Sincronizacion parcial: {customersAdded} clientes, {vendorsAdded} proveedores, {taxCodesAdded} impuestos, {itemsAdded} items. Error en: {string.Join(", ", failedParts)}. Verifica la autorizacion en QuickBooks.",
                partial = true
            }));
        }

        return Ok(ApiResponse<object>.Ok(new
        {
            customersAdded, vendorsAdded, taxCodesAdded, itemsAdded,
            message = $"Sincronizacion completada: {customersAdded} clientes, {vendorsAdded} proveedores, {taxCodesAdded} impuestos, {itemsAdded} items agregados."
        }));
    }

    /// <summary>
    /// Disconnect QBO — revokes the connection.
    /// </summary>
    [HttpPost("disconnect")]
    public async Task<IActionResult> Disconnect(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId == null) return Unauthorized(ApiResponse<string>.Fail("Empresa no identificada."));

        var connection = await _db.QboConnections
            .FirstOrDefaultAsync(q => q.CompanyId == companyId.Value && q.IsActive, ct);

        if (connection == null)
            return NotFound(ApiResponse<string>.Fail("No hay conexion activa con QuickBooks."));

        connection.IsActive = false;
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync(companyId.Value, GetUserId(), "qbo.disconnected", "QboConnection", connection.RealmId, ct: ct);

        return Ok(ApiResponse<string>.Ok("Desconectado"));
    }
}
