using Eigdo.Domain.Enums;

namespace Eigdo.Domain.Entities.Emission;

public class EcfEvent : BaseEntity
{
    public Guid EcfDocumentId { get; set; }
    public EcfDocumentStatus FromStatus { get; set; }
    public EcfDocumentStatus ToStatus { get; set; }
    public string? Message { get; set; }
    public string? DetailJson { get; set; }

    // Navigation
    public EcfDocument EcfDocument { get; set; } = null!;
}
