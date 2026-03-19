using Eigdo.Domain.Enums;

namespace Eigdo.Application.DTOs.Emission;

public record EmissionRequestDto(
    Guid CompanyId,
    EcfType EcfType,
    string QboSourceId,
    string QboDocNumber,
    string PayloadJson,
    decimal TotalAmount,
    decimal TaxAmount,
    Guid? OriginalEcfDocumentId = null);
