using Eigdo.Domain.Entities.Tenancy;

namespace Eigdo.Domain.Entities.Integration;

public class QboConnection : BaseEntity
{
    public Guid CompanyId { get; set; }
    public string RealmId { get; set; } = string.Empty;
    public string AccessTokenEncrypted { get; set; } = string.Empty;
    public string RefreshTokenEncrypted { get; set; } = string.Empty;
    public DateTime AccessTokenExpiresUtc { get; set; }
    public DateTime RefreshTokenExpiresUtc { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastSyncUtc { get; set; }

    // Navigation
    public Company Company { get; set; } = null!;
}
