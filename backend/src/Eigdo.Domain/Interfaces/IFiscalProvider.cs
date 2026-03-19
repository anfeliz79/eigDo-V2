using Eigdo.Domain.Entities.Emission;

namespace Eigdo.Domain.Interfaces;

public interface IFiscalProvider
{
    Task<FiscalSubmitResult> SubmitAsync(EcfDocument document, string payloadJson, CancellationToken ct = default);
    Task<FiscalStatusResult> GetStatusAsync(string trackId, CancellationToken ct = default);
    Task<FiscalAnnulResult> AnnulAsync(string encf, string reason, CancellationToken ct = default);
}

public record FiscalSubmitResult(bool Success, string? TrackId, string? ErrorMessage, string? ResponseJson);
public record FiscalStatusResult(bool IsAccepted, bool IsRejected, bool IsPending, string? Encf, string? Message, string? ResponseJson);
public record FiscalAnnulResult(bool Success, string? Message);
