using Eigdo.Domain.Enums;

namespace Eigdo.Domain.Interfaces;

public interface ISequenceService
{
    Task<SequenceAssignResult> AssignNextAsync(Guid companyId, EcfType ecfType, CancellationToken ct = default);
}

public record SequenceAssignResult(bool Success, string? Encf, string? ErrorMessage);
