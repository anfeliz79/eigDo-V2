using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Eigdo.Application.Interfaces;
using Eigdo.Domain.Entities.Emission;
using Eigdo.Domain.Entities.Integration;
using Eigdo.Domain.Enums;
using Eigdo.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Eigdo.Application.Services;

/// <summary>
/// Processes QuickBooks Online webhook notifications.
/// Verifies HMAC-SHA256 signatures and creates/updates EcfDocuments based on entity change events.
/// </summary>
public class QboWebhookHandler
{
    private readonly IEigdoDbContext _db;
    private readonly IAuditService _audit;
    private readonly ILogger<QboWebhookHandler> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    /// <summary>
    /// QBO entity names that map to e-CF document types.
    /// </summary>
    private static readonly HashSet<string> SupportedEntityNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "Invoice", "CreditMemo", "RefundReceipt", "Bill", "VendorCredit"
    };

    /// <summary>
    /// Operations we process. Delete and Void are intentionally skipped.
    /// </summary>
    private static readonly HashSet<string> ProcessableOperations = new(StringComparer.OrdinalIgnoreCase)
    {
        "Create", "Update"
    };

    public QboWebhookHandler(IEigdoDbContext db, IAuditService audit, ILogger<QboWebhookHandler> logger)
    {
        _db = db;
        _audit = audit;
        _logger = logger;
    }

    /// <summary>
    /// Verifies the HMAC-SHA256 signature of the webhook payload.
    /// QBO signs the raw body using the webhook verifier token.
    /// </summary>
    public static bool VerifySignature(string rawBody, string signature, string verifierToken)
    {
        if (string.IsNullOrEmpty(rawBody) || string.IsNullOrEmpty(signature) || string.IsNullOrEmpty(verifierToken))
            return false;

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(verifierToken));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(rawBody));
        var computed = Convert.ToBase64String(hash);

        return string.Equals(computed, signature, StringComparison.Ordinal);
    }

    /// <summary>
    /// Processes all entity notifications in the webhook payload.
    /// Idempotent: updates existing EcfDocuments rather than creating duplicates.
    /// </summary>
    public async Task ProcessAsync(string rawBody, CancellationToken ct)
    {
        var payload = JsonSerializer.Deserialize<QboWebhookPayload>(rawBody, JsonOptions);
        if (payload?.EventNotifications == null || payload.EventNotifications.Count == 0)
        {
            _logger.LogDebug("Webhook payload has no event notifications");
            return;
        }

        foreach (var notification in payload.EventNotifications)
        {
            await ProcessNotificationAsync(notification, ct);
        }

        await _db.SaveChangesAsync(ct);
    }

    private async Task ProcessNotificationAsync(QboEventNotification notification, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(notification.RealmId))
        {
            _logger.LogWarning("Webhook notification missing realmId, skipping");
            return;
        }

        // Look up the QboConnection to resolve the companyId
        var connection = await _db.QboConnections
            .FirstOrDefaultAsync(q => q.RealmId == notification.RealmId && q.IsActive, ct);

        if (connection == null)
        {
            _logger.LogWarning("No active QboConnection for realmId {RealmId}, skipping", notification.RealmId);
            return;
        }

        var entities = notification.DataChangeEvent?.Entities;
        if (entities == null || entities.Count == 0)
            return;

        foreach (var entity in entities)
        {
            await ProcessEntityAsync(connection.CompanyId, entity, ct);
        }
    }

    private async Task ProcessEntityAsync(Guid companyId, QboEntityChange entity, CancellationToken ct)
    {
        // Skip unsupported entity types
        if (!SupportedEntityNames.Contains(entity.Name))
        {
            _logger.LogDebug("Skipping unsupported entity type {EntityName}", entity.Name);
            return;
        }

        // Skip Delete/Void operations
        if (!ProcessableOperations.Contains(entity.Operation))
        {
            _logger.LogDebug("Skipping operation {Operation} for {EntityName} {EntityId}",
                entity.Operation, entity.Name, entity.Id);
            return;
        }

        var qboDocType = MapEntityNameToQboDocumentType(entity.Name);
        if (qboDocType == null)
            return;

        // Record the sync event for audit trail
        _db.QboSyncEvents.Add(new QboSyncEvent
        {
            CompanyId = companyId,
            EntityType = entity.Name,
            EntityId = entity.Id,
            Operation = entity.Operation,
            Processed = false
        });

        // Determine the e-CF type
        var ecfType = await ResolveEcfTypeAsync(companyId, entity.Name, entity.Id, qboDocType.Value, ct);

        // Idempotency check: look for existing document with same source
        var existing = await _db.EcfDocuments.FirstOrDefaultAsync(d =>
            d.CompanyId == companyId &&
            d.QboSourceId == entity.Id &&
            d.QboSourceType == qboDocType.Value, ct);

        if (existing != null)
        {
            // Update existing document — reset to Draft so it can be re-processed
            existing.EcfType = ecfType;
            existing.Status = EcfDocumentStatus.Draft;
            existing.UpdatedAtUtc = DateTime.UtcNow;
            existing.ErrorMessage = null;
            existing.RetryCount = 0;

            _logger.LogInformation("Updated EcfDocument {DocumentId} for QBO {EntityName} {EntityId}",
                existing.Id, entity.Name, entity.Id);

            await _audit.LogAsync(companyId, null, "webhook.ecf.updated", "EcfDocument",
                existing.Id.ToString(), ct: ct);
        }
        else
        {
            // Create new EcfDocument
            var doc = new EcfDocument
            {
                CompanyId = companyId,
                EcfType = ecfType,
                Status = EcfDocumentStatus.Draft,
                QboSourceType = qboDocType.Value,
                QboSourceId = entity.Id
            };

            _db.EcfDocuments.Add(doc);

            _logger.LogInformation("Created EcfDocument for QBO {EntityName} {EntityId}, EcfType={EcfType}",
                entity.Name, entity.Id, ecfType);

            await _audit.LogAsync(companyId, null, "webhook.ecf.created", "EcfDocument",
                doc.Id.ToString(), ct: ct);
        }
    }

    /// <summary>
    /// Resolves the e-CF type based on the QBO entity name and customer mapping.
    /// For invoices, checks the CustomerMapping to determine E31 vs E32.
    /// </summary>
    private async Task<EcfType> ResolveEcfTypeAsync(Guid companyId, string entityName, string entityId,
        QboDocumentType qboDocType, CancellationToken ct)
    {
        return entityName.ToUpperInvariant() switch
        {
            "INVOICE" => await ResolveInvoiceEcfTypeAsync(companyId, ct),
            "CREDITMEMO" => EcfType.E34,
            "REFUNDRECEIPT" => EcfType.E34,
            "BILL" => EcfType.E41,
            "VENDORCREDIT" => EcfType.E41,
            _ => EcfType.E32 // Default to Factura de Consumo
        };
    }

    /// <summary>
    /// For invoices, the e-CF type depends on whether the customer has a fiscal mapping.
    /// If a CustomerMapping exists with a specific TipoComprobante, use that.
    /// Otherwise default to E32 (Factura de Consumo, no fiscal credit).
    /// Note: The actual customer resolution happens during emission when the full invoice is fetched.
    /// At webhook time we default to E32; the EmissionOrchestrator will refine this.
    /// </summary>
    private async Task<EcfType> ResolveInvoiceEcfTypeAsync(Guid companyId, CancellationToken ct)
    {
        // At webhook ingestion time, we don't have the customer ID from the invoice payload.
        // Default to E32 (Factura de Consumo). The EmissionOrchestrator will resolve
        // the correct type when it fetches the full invoice from QBO.
        return await Task.FromResult(EcfType.E32);
    }

    private static QboDocumentType? MapEntityNameToQboDocumentType(string entityName)
    {
        return entityName.ToUpperInvariant() switch
        {
            "INVOICE" => QboDocumentType.Invoice,
            "CREDITMEMO" => QboDocumentType.CreditMemo,
            "REFUNDRECEIPT" => QboDocumentType.RefundReceipt,
            "BILL" => QboDocumentType.Bill,
            _ => null
        };
    }

    #region Webhook Payload DTOs

    public class QboWebhookPayload
    {
        public List<QboEventNotification> EventNotifications { get; set; } = new();
    }

    public class QboEventNotification
    {
        public string RealmId { get; set; } = string.Empty;
        public QboDataChangeEvent? DataChangeEvent { get; set; }
    }

    public class QboDataChangeEvent
    {
        public List<QboEntityChange> Entities { get; set; } = new();
    }

    public class QboEntityChange
    {
        public string Name { get; set; } = string.Empty;
        public string Id { get; set; } = string.Empty;
        public string Operation { get; set; } = string.Empty;
        public string? LastUpdated { get; set; }
    }

    #endregion
}
