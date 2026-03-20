using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Eigdo.Application.DTOs.Auth;
using Eigdo.Application.Interfaces;
using Eigdo.Domain.Entities.Billing;
using Eigdo.Domain.Entities.Identity;
using Eigdo.Domain.Entities.Tenancy;
using Eigdo.Domain.Enums;
using Eigdo.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Eigdo.Application.Services;

public class AuthService
{
    private readonly IEigdoDbContext _db;
    private readonly IConfiguration _config;
    private readonly IAuditService _audit;

    public AuthService(IEigdoDbContext db, IConfiguration config, IAuditService audit)
    {
        _db = db;
        _config = config;
        _audit = audit;
    }

    public async Task<(AuthResponse? Response, string? Error)> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var emailNormalized = request.Email.ToLower().Trim();

        if (await _db.Users.AnyAsync(u => u.Email == emailNormalized, ct))
            return (null, "An account with this email already exists.");

        var user = new User
        {
            Email = emailNormalized,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Phone = request.Phone?.Trim(),
            EmailConfirmed = false,
            EmailConfirmationToken = Guid.NewGuid().ToString("N"),
            EmailConfirmationTokenExpiresUtc = DateTime.UtcNow.AddDays(7)
        };

        var company = new Company
        {
            Name = request.CompanyName.Trim(),
            OnboardingStep = OnboardingStep.NotStarted
        };

        var companyUser = new CompanyUser
        {
            Company = company,
            User = user,
            Role = CompanyRole.Owner
        };

        var billingAccount = new BillingAccount
        {
            Company = company
        };

        _db.Users.Add(user);
        _db.Companies.Add(company);
        _db.CompanyUsers.Add(companyUser);
        _db.BillingAccounts.Add(billingAccount);

        await _db.SaveChangesAsync(ct);

        var authResponse = await GenerateAuthResponse(user, ct);

        await _audit.LogAsync(company.Id, user.Id, "user.registered", "User", user.Id.ToString(), ct: ct);

        return (authResponse, null);
    }

    public async Task<(AuthResponse? Response, string? Error)> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await _db.Users
            .Include(u => u.CompanyUsers)
                .ThenInclude(cu => cu.Company)
            .FirstOrDefaultAsync(u => u.Email == request.Email.ToLower().Trim(), ct);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return (null, "Invalid email or password.");

        if (!user.IsActive)
            return (null, "Account is deactivated.");

        user.LastLoginUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        var authResponse = await GenerateAuthResponse(user, ct);

        return (authResponse, null);
    }

    public async Task<(AuthResponse? Response, string? Error)> RefreshAsync(RefreshTokenRequest request, CancellationToken ct = default)
    {
        var refreshToken = await _db.RefreshTokens
            .Include(rt => rt.User)
                .ThenInclude(u => u.CompanyUsers)
                    .ThenInclude(cu => cu.Company)
            .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken && !rt.IsRevoked, ct);

        if (refreshToken == null)
            return (null, "Invalid refresh token.");

        if (refreshToken.ExpiresUtc < DateTime.UtcNow)
        {
            refreshToken.IsRevoked = true;
            await _db.SaveChangesAsync(ct);
            return (null, "Refresh token expired.");
        }

        refreshToken.IsRevoked = true;

        var authResponse = await GenerateAuthResponse(refreshToken.User, ct);
        refreshToken.ReplacedByToken = authResponse.RefreshToken;

        await _db.SaveChangesAsync(ct);

        return (authResponse, null);
    }

    private async Task<AuthResponse> GenerateAuthResponse(User user, CancellationToken ct)
    {
        if (!user.CompanyUsers.Any())
        {
            await _db.Entry(user)
                .Collection(u => u.CompanyUsers)
                .Query()
                .Include(cu => cu.Company)
                .LoadAsync(ct);
        }

        var accessToken = GenerateJwtToken(user);
        var refreshToken = GenerateRefreshToken(user.Id);

        _db.RefreshTokens.Add(refreshToken);
        await _db.SaveChangesAsync(ct);

        var minutes = _config.GetValue<int>("JWT_ACCESS_TOKEN_MINUTES", 60);

        return new AuthResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken.Token,
            ExpiresAt = DateTime.UtcNow.AddMinutes(minutes),
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Companies = user.CompanyUsers.Select(cu => new CompanyUserDto
                {
                    CompanyId = cu.CompanyId,
                    CompanyName = cu.Company.Name,
                    Role = cu.Role.ToString()
                }).ToList()
            }
        };
    }

    private string GenerateJwtToken(User user)
    {
        var secret = _config.GetValue<string>("JWT_SECRET")
            ?? throw new InvalidOperationException("JWT_SECRET not configured");
        var issuer = _config.GetValue<string>("JWT_ISSUER") ?? "eigdo";
        var audience = _config.GetValue<string>("JWT_AUDIENCE") ?? "eigdo-clients";
        var minutes = _config.GetValue<int>("JWT_ACCESS_TOKEN_MINUTES", 60);

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new("firstName", user.FirstName),
            new("lastName", user.LastName)
        };

        // Add system role claim (e.g., SuperAdmin)
        if (!string.IsNullOrEmpty(user.SystemRole))
        {
            claims.Add(new Claim(ClaimTypes.Role, user.SystemRole));
        }

        foreach (var cu in user.CompanyUsers)
        {
            claims.Add(new Claim("company", $"{cu.CompanyId}:{cu.Role}"));
        }

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(minutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private RefreshToken GenerateRefreshToken(Guid userId)
    {
        var days = _config.GetValue<int>("JWT_REFRESH_TOKEN_DAYS", 30);
        return new RefreshToken
        {
            UserId = userId,
            Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)),
            ExpiresUtc = DateTime.UtcNow.AddDays(days)
        };
    }
}
