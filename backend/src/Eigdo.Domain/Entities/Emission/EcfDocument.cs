using Eigdo.Domain.Entities.Tenancy;
using Eigdo.Domain.Enums;

namespace Eigdo.Domain.Entities.Emission;

public class EcfDocument : BaseEntity
{
    public Guid CompanyId { get; set; }
    public EcfType EcfType { get; set; }
    public EcfDocumentStatus Status { get; set; } = EcfDocumentStatus.Draft;
    public string? Encf { get; set; } // e-NCF assigned
    public string? TrackId { get; set; } // Alanube tracking ID

    // QBO source
    public QboDocumentType QboSourceType { get; set; }
    public string QboSourceId { get; set; } = string.Empty;
    public string? QboDocNumber { get; set; }

    // Payload
    public string? AlanubePayloadJson { get; set; }
    public string? AlanubeResponseJson { get; set; }

    // Amounts
    public decimal TotalAmount { get; set; }
    public decimal TaxAmount { get; set; }

    // Error handling
    public string? ErrorMessage { get; set; }
    public int RetryCount { get; set; }
    public DateTime? LastRetryUtc { get; set; }
    public DateTime? SubmittedAtUtc { get; set; }
    public DateTime? AcceptedAtUtc { get; set; }

    // Reference for credit/debit notes
    public Guid? OriginalEcfDocumentId { get; set; }

    // Navigation
    public Company Company { get; set; } = null!;
    public EcfDocument? OriginalEcfDocument { get; set; }
    public ICollection<EcfEvent> Events { get; set; } = new List<EcfEvent>();
}
