using Eigdo.Domain.Entities.Identity;
using Eigdo.Domain.Entities.Tenancy;

namespace Eigdo.Domain.Entities.Support;

public class SupportTicket : BaseEntity
{
    public Guid? CompanyId { get; set; }
    public Guid? UserId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = "open"; // open, in_progress, resolved, closed
    public string? Priority { get; set; } = "normal"; // low, normal, high, urgent
    public string? ContactEmail { get; set; } // for anonymous tickets from landing page
    public string? ContactName { get; set; }

    // Navigation
    public Company? Company { get; set; }
    public User? User { get; set; }
    public ICollection<SupportTicketMessage> Messages { get; set; } = new List<SupportTicketMessage>();
}
