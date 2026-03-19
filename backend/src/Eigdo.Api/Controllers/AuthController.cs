using Eigdo.Application.DTOs;
using Eigdo.Application.DTOs.Auth;
using Eigdo.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Eigdo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : EigdoControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
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
}
