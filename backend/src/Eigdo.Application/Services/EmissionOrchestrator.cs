using Eigdo.Application.Interfaces;
using Eigdo.Domain.Entities.Emission;
using Eigdo.Domain.Enums;
using Eigdo.Domain.Interfaces;

namespace Eigdo.Application.Services;

public class EmissionOrchestrator
{
    private readonly IEigdoDbContext _db;
    private readonly EmissionValidator _validator;
    private readonly ISequenceService _sequenceService;
    private readonly IAuditService _audit;

    public EmissionOrchestrator(
        IEigdoDbContext db,
        EmissionValidator validator,
        ISequenceService sequenceService,
        IAuditService audit)
    {
        _db = db;
        _validator = validator;
        _sequenceService = sequenceService;
        _audit = audit;
    }

    public async Task<(EcfDocument? Document, string? Error)> PrepareAndQueueAsync(
        Guid companyId,
        EcfType ecfType,
        string qboSourceId,
        string qboDocNumber,
        string payloadJson,
        decimal totalAmount,
        decimal taxAmount,
        Guid? originalEcfDocumentId,
        CancellationToken ct)
    {
        // Credit/debit notes require original document reference
        if (ecfType is EcfType.E33 or EcfType.E34 && originalEcfDocumentId is null)
        {
            return (null, "Credit/debit notes (E33, E34) require a reference to the original e-CF document.");
        }

        // 1. Validate prerequisites
        var (isValid, errors) = await _validator.ValidateAsync(companyId, ecfType, qboSourceId, ct);

        if (!isValid)
        {
            // Create a blocked document for tracking
            var blockedDoc = new EcfDocument
            {
                CompanyId = companyId,
                EcfType = ecfType,
                Status = EcfDocumentStatus.BlockedByConfig,
                QboSourceId = qboSourceId,
                QboDocNumber = qboDocNumber,
                TotalAmount = totalAmount,
                TaxAmount = taxAmount,
                ErrorMessage = string.Join(" | ", errors),
                OriginalEcfDocumentId = originalEcfDocumentId
            };

            _db.EcfDocuments.Add(blockedDoc);
            await _db.SaveChangesAsync(ct);

            await _audit.LogAsync(companyId, null, "EmissionBlocked", "EcfDocument",
                blockedDoc.Id.ToString(), null, new { Errors = errors }, ct);

            return (blockedDoc, string.Join(" | ", errors));
        }

        // 2. Assign e-NCF sequence
        var sequenceResult = await _sequenceService.AssignNextAsync(companyId, ecfType, ct);

        if (!sequenceResult.Success)
        {
            return (null, $"Failed to assign e-NCF: {sequenceResult.ErrorMessage}");
        }

        // 3. Create EcfDocument with Queued status
        var document = new EcfDocument
        {
            CompanyId = companyId,
            EcfType = ecfType,
            Status = EcfDocumentStatus.Queued,
            Encf = sequenceResult.Encf,
            QboSourceId = qboSourceId,
            QboDocNumber = qboDocNumber,
            AlanubePayloadJson = payloadJson,
            TotalAmount = totalAmount,
            TaxAmount = taxAmount,
            OriginalEcfDocumentId = originalEcfDocumentId
        };

        // 4. Save to DB
        _db.EcfDocuments.Add(document);
        await _db.SaveChangesAsync(ct);

        // 5. Audit log
        await _audit.LogAsync(companyId, null, "EmissionQueued", "EcfDocument",
            document.Id.ToString(), null,
            new { document.Encf, document.EcfType, document.TotalAmount }, ct);

        // 6. Return
        return (document, null);
    }
}
