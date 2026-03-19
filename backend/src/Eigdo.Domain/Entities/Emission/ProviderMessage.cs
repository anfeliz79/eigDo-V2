namespace Eigdo.Domain.Entities.Emission;

public class ProviderMessage : BaseEntity
{
    public Guid EcfDocumentId { get; set; }
    public string Provider { get; set; } = "alanube";
    public string Direction { get; set; } = string.Empty; // outbound, inbound
    public string? HttpMethod { get; set; }
    public string? Url { get; set; }
    public string? RequestJson { get; set; }
    public string? ResponseJson { get; set; }
    public int? HttpStatusCode { get; set; }
    public long? DurationMs { get; set; }

    // Navigation
    public EcfDocument EcfDocument { get; set; } = null!;
}
