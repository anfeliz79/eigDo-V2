using Eigdo.Domain.Enums;

namespace Eigdo.Application.DTOs.Emission;

/// <summary>
/// Input context for the PayloadTransformer.
/// Wraps the raw QBO document JSON together with the target e-CF type and tenant.
/// </summary>
public class TransformContext
{
    public Guid CompanyId { get; set; }
    public EcfType EcfType { get; set; }

    /// <summary>
    /// Raw QBO document JSON (Invoice, Bill, CreditMemo, etc.)
    /// </summary>
    public string QboDocumentJson { get; set; } = string.Empty;

    /// <summary>
    /// QBO document type for source reference on the EcfDocument record.
    /// </summary>
    public QboDocumentType QboSourceType { get; set; }

    /// <summary>
    /// Original e-CF document ID for credit/debit notes (E33, E34).
    /// </summary>
    public Guid? OriginalEcfDocumentId { get; set; }
}
