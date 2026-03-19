using Eigdo.Domain.Entities.Identity;
using Eigdo.Domain.Enums;

namespace Eigdo.Domain.Entities.Tenancy;

public class CompanyUser : BaseEntity
{
    public Guid CompanyId { get; set; }
    public Guid UserId { get; set; }
    public CompanyRole Role { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public Company Company { get; set; } = null!;
    public User User { get; set; } = null!;
}
