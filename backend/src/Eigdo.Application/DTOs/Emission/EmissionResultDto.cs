using Eigdo.Domain.Enums;

namespace Eigdo.Application.DTOs.Emission;

public record EmissionResultDto(
    bool Success,
    Guid? DocumentId,
    string? Encf,
    EcfDocumentStatus Status,
    string? Error);
