using Eigdo.Application.DTOs;
using Eigdo.Application.DTOs.Auth;
using Eigdo.Application.Interfaces;
using Eigdo.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Eigdo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("auth")]
public class AuthController : EigdoControllerBase
{
    private readonly AuthService _authService;
    private readonly IEigdoDbContext _db;

    public AuthController(AuthService authService, IEigdoDbContext db)
    {
        _authService = authService;
        _db = db;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<AuthResponse>.ValidationFail(
                ModelState.ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value!.Errors.Select(e => e.ErrorMessage).ToArray()
                )));

        var (response, error) = await _authService.RegisterAsync(request, ct);

        if (error != null)
            return BadRequest(ApiResponse<AuthResponse>.Fail(error));

        return Ok(ApiResponse<AuthResponse>.Ok(response!));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<AuthResponse>.ValidationFail(
                ModelState.ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value!.Errors.Select(e => e.ErrorMessage).ToArray()
                )));

        var (response, error) = await _authService.LoginAsync(request, ct);

        if (error != null)
            return Unauthorized(ApiResponse<AuthResponse>.Fail(error));

        return Ok(ApiResponse<AuthResponse>.Ok(response!));
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request, CancellationToken ct)
    {
        var (response, error) = await _authService.RefreshAsync(request, ct);

        if (error != null)
            return Unauthorized(ApiResponse<AuthResponse>.Fail(error));

        return Ok(ApiResponse<AuthResponse>.Ok(response!));
    }

    [HttpGet("me")]
    [Authorize]
    public IActionResult Me()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;

        return Ok(ApiResponse<object>.Ok(new
        {
            userId,
            email,
            claims = User.Claims.Select(c => new { c.Type, c.Value })
        }));
    }

    [HttpGet("profile")]
    [Authorize]
    public async Task<IActionResult> GetProfile(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<ProfileResponse>.Fail("User not found."));

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
        if (user == null)
            return NotFound(ApiResponse<ProfileResponse>.Fail("User not found."));

        return Ok(ApiResponse<ProfileResponse>.Ok(new ProfileResponse
        {
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            SystemRole = user.SystemRole,
            CreatedAtUtc = user.CreatedAtUtc
        }));
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object>.ValidationFail(
                ModelState.ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value!.Errors.Select(e => e.ErrorMessage).ToArray()
                )));

        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail("User not found."));

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
        if (user == null)
            return NotFound(ApiResponse<object>.Fail("User not found."));

        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        return Ok(ApiResponse<object>.Ok(new { message = "Profile updated successfully." }));
    }

    [HttpPut("password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object>.ValidationFail(
                ModelState.ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value!.Errors.Select(e => e.ErrorMessage).ToArray()
                )));

        var userId = GetUserId();
        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail("User not found."));

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
        if (user == null)
            return NotFound(ApiResponse<object>.Fail("User not found."));

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return BadRequest(ApiResponse<object>.Fail("La contrasena actual es incorrecta."));

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        return Ok(ApiResponse<object>.Ok(new { message = "Password changed successfully." }));
    }
}
