using System.ComponentModel.DataAnnotations;

namespace Eigdo.Application.DTOs.Auth;

public class RefreshTokenRequest
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}
