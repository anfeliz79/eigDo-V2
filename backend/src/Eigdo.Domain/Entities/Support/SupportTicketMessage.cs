using Eigdo.Domain.Entities.Identity;

namespace Eigdo.Domain.Entities.Support;

public class SupportTicketMessage : BaseEntity
{
    public Guid TicketId { get; set; }
    public Guid? UserId { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool IsStaffReply { get; set; }
    public string? SenderName { get; set; }
    public string? SenderEmail { get; set; }

    // Navigation
    public SupportTicket Ticket { get; set; } = null!;
    public User? User { get; set; }
}
