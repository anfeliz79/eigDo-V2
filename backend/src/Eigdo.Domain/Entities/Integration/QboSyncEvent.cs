using Eigdo.Domain.Entities.Tenancy;

namespace Eigdo.Domain.Entities.Integration;

public class QboSyncEvent : BaseEntity
{
    public Guid CompanyId { get; set; }
    public string EntityType { get; set; } = string.Empty; // Customer, Vendor, Invoice, Bill, etc.
    public string EntityId { get; set; } = string.Empty;
    public string Operation { get; set; } = string.Empty; // Create, Update, Delete
    public string? PayloadJson { get; set; }
    public bool Processed { get; set; }
    public string? Error { get; set; }

    // Navigation
    public Company Company { get; set; } = null!;
}
