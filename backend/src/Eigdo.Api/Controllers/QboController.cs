using Eigdo.Application.DTOs;
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

    public QboController(IQboClient qboClient, IEigdoDbContext db, IAuditService audit, IConfiguration config)
    {
        _qboClient = qboClient;
        _db = db;
        _audit = audit;
        _config = config;
    }

    /// <summary>
    /// Get the OAuth 2.0 authorization URL to redirect the user to Intuit.
    /// </summary>
    [HttpGet("auth-url")]
    public async Task<IActionResult> GetAuthUrl(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId == null) return Unauthorized(ApiResponse<string>.Fail("No company claim"));

        var redirectUri = _config.GetValue<string>("QBO_REDIRECT_URI") ?? "http://localhost:5102/api/qbo/callback";
        var url = await _qboClient.GetAuthorizationUrlAsync(companyId.Value, redirectUri);

        return Ok(ApiResponse<object>.Ok(new { authUrl = url }));
    }

    /// <summary>
    /// OAuth 2.0 callback — exchanges the authorization code for tokens.
    /// </summary>
    [HttpGet("callback")]
    [AllowAnonymous]
    public async Task<IActionResult> Callback([FromQuery] string code, [FromQuery] string realmId, [FromQuery] string state, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(realmId))
            return BadRequest(ApiResponse<string>.Fail("Missing code or realmId"));

        // Decode companyId from state
        Guid companyId;
        try
        {
            var decoded = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(state));
            companyId = Guid.Parse(decoded.Split(':')[0]);
        }
        catch
        {
            return BadRequest(ApiResponse<string>.Fail("Invalid state parameter"));
        }

        var redirectUri = _config.GetValue<string>("QBO_REDIRECT_URI") ?? "http://localhost:5102/api/qbo/callback";
        var result = await _qboClient.ExchangeCodeAsync(code, realmId, redirectUri, ct);

        if (!result.Success)
            return BadRequest(ApiResponse<string>.Fail(result.Error ?? "Token exchange failed"));

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

        // Redirect to frontend app after successful connection
        var frontendUrl = _config.GetValue<string>("QBO_SUCCESS_REDIRECT") ?? "http://localhost:3002/onboarding?qbo=connected";
        return Redirect(frontendUrl);
    }

    /// <summary>
    /// Get current QBO connection status for the company.
    /// </summary>
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId == null) return Unauthorized(ApiResponse<string>.Fail("No company claim"));

        var connection = await _db.QboConnections
            .FirstOrDefaultAsync(q => q.CompanyId == companyId.Value && q.IsActive, ct);

        if (connection == null)
            return Ok(ApiResponse<object>.Ok(new { connected = false }));

        return Ok(ApiResponse<object>.Ok(new
        {
            connected = true,
            realmId = connection.RealmId,
            accessTokenExpires = connection.AccessTokenExpiresUtc,
            refreshTokenExpires = connection.RefreshTokenExpiresUtc,
            lastSync = connection.LastSyncUtc
        }));
    }

    /// <summary>
    /// Disconnect QBO — revokes the connection.
    /// </summary>
    [HttpPost("disconnect")]
    public async Task<IActionResult> Disconnect(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId == null) return Unauthorized(ApiResponse<string>.Fail("No company claim"));

        var connection = await _db.QboConnections
            .FirstOrDefaultAsync(q => q.CompanyId == companyId.Value && q.IsActive, ct);

        if (connection == null)
            return NotFound(ApiResponse<string>.Fail("No active QBO connection"));

        connection.IsActive = false;
        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync(companyId.Value, GetUserId(), "qbo.disconnected", "QboConnection", connection.RealmId, ct: ct);

        return Ok(ApiResponse<string>.Ok("Disconnected"));
    }
}
