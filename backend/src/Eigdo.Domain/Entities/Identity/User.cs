using Eigdo.Domain.Entities.Tenancy;

namespace Eigdo.Domain.Entities.Identity;

public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public bool EmailConfirmed { get; set; }
    public string? EmailConfirmationToken { get; set; }
    public DateTime? EmailConfirmationTokenExpiresUtc { get; set; }
    public string? PasswordResetToken { get; set; }
    public DateTime? PasswordResetTokenExpiresUtc { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginUtc { get; set; }

    /// <summary>
    /// System-level role. Null for regular users.
    /// Values: "SuperAdmin" (full platform control), "Admin" (admin panel, cannot manage other Admins),
    /// "Support" (read-only admin access).
    /// </summary>
    public string? SystemRole { get; set; }

    // Navigation
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<CompanyUser> CompanyUsers { get; set; } = new List<CompanyUser>();
}
