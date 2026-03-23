using Eigdo.Application.DTOs.Mapping;
using Eigdo.Application.Interfaces;
using Eigdo.Domain.Entities.Mapping;
using Eigdo.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Eigdo.Application.Services;

public class FieldMappingService
{
    private readonly IEigdoDbContext _db;
    private readonly IAuditService _audit;

    private static readonly HashSet<string> ValidEntityTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "Customer", "Vendor", "Item"
    };

    private static readonly HashSet<string> ValidSourceTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "QboField", "Fixed"
    };

    public FieldMappingService(IEigdoDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    /// <summary>
    /// Obtiene todos los mapeos de campo para un tipo de entidad.
    /// </summary>
    public async Task<(List<FieldMappingResponse>? Result, string? Error)> GetMappingsAsync(
        Guid companyId, string entityType, CancellationToken ct = default)
    {
        if (!ValidEntityTypes.Contains(entityType))
            return (null, $"Tipo de entidad invalido: '{entityType}'. Valores permitidos: Customer, Vendor, Item.");

        var mappings = await _db.FieldMappings
            .Where(fm => fm.CompanyId == companyId && fm.EntityType == entityType)
            .OrderBy(fm => fm.TargetField)
            .ToListAsync(ct);

        var dtos = mappings.Select(MapToResponse).ToList();
        return (dtos, null);
    }

    /// <summary>
    /// Guarda o actualiza mapeos de campo en lote (upsert).
    /// Reemplaza todos los mapeos existentes para el tipo de entidad dado.
    /// </summary>
    public async Task<(List<FieldMappingResponse>? Result, string? Error)> SaveMappingsAsync(
        Guid companyId, string entityType, List<FieldMappingDto> mappings, CancellationToken ct = default)
    {
        if (!ValidEntityTypes.Contains(entityType))
            return (null, $"Tipo de entidad invalido: '{entityType}'. Valores permitidos: Customer, Vendor, Item.");

        // Validate each mapping
        foreach (var m in mappings)
        {
            if (string.IsNullOrWhiteSpace(m.TargetField))
                return (null, "El campo destino (TargetField) es requerido.");

            if (!ValidSourceTypes.Contains(m.SourceType))
                return (null, $"Tipo de origen invalido: '{m.SourceType}'. Valores permitidos: QboField, Fixed.");

            if (m.SourceType.Equals("QboField", StringComparison.OrdinalIgnoreCase) && string.IsNullOrWhiteSpace(m.QboFieldPath))
                return (null, $"QboFieldPath es requerido cuando SourceType es 'QboField' (campo: {m.TargetField}).");

            if (m.SourceType.Equals("Fixed", StringComparison.OrdinalIgnoreCase) && string.IsNullOrWhiteSpace(m.FixedValue))
                return (null, $"FixedValue es requerido cuando SourceType es 'Fixed' (campo: {m.TargetField}).");
        }

        // Check for duplicate target fields
        var duplicates = mappings.GroupBy(m => m.TargetField, StringComparer.OrdinalIgnoreCase)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();

        if (duplicates.Any())
            return (null, $"Campos destino duplicados: {string.Join(", ", duplicates)}.");

        // Load existing mappings for this entity type
        var existing = await _db.FieldMappings
            .Where(fm => fm.CompanyId == companyId && fm.EntityType == entityType)
            .ToListAsync(ct);

        var existingByTarget = existing.ToDictionary(e => e.TargetField, StringComparer.OrdinalIgnoreCase);
        var incomingTargets = new HashSet<string>(mappings.Select(m => m.TargetField), StringComparer.OrdinalIgnoreCase);

        // Remove mappings that are no longer present
        foreach (var e in existing.Where(e => !incomingTargets.Contains(e.TargetField)))
        {
            _db.FieldMappings.Remove(e);
        }

        // Upsert
        foreach (var dto in mappings)
        {
            if (existingByTarget.TryGetValue(dto.TargetField, out var existingMapping))
            {
                existingMapping.SourceType = dto.SourceType;
                existingMapping.QboFieldPath = dto.SourceType.Equals("QboField", StringComparison.OrdinalIgnoreCase) ? dto.QboFieldPath : null;
                existingMapping.FixedValue = dto.SourceType.Equals("Fixed", StringComparison.OrdinalIgnoreCase) ? dto.FixedValue : null;
                existingMapping.UpdatedAtUtc = DateTime.UtcNow;
            }
            else
            {
                _db.FieldMappings.Add(new FieldMapping
                {
                    CompanyId = companyId,
                    EntityType = entityType,
                    TargetField = dto.TargetField,
                    SourceType = dto.SourceType,
                    QboFieldPath = dto.SourceType.Equals("QboField", StringComparison.OrdinalIgnoreCase) ? dto.QboFieldPath : null,
                    FixedValue = dto.SourceType.Equals("Fixed", StringComparison.OrdinalIgnoreCase) ? dto.FixedValue : null,
                });
            }
        }

        await _db.SaveChangesAsync(ct);
        await _audit.LogAsync(companyId, null, "field_mapping.saved", "FieldMapping", entityType, ct: ct);

        // Return updated list
        var result = await _db.FieldMappings
            .Where(fm => fm.CompanyId == companyId && fm.EntityType == entityType)
            .OrderBy(fm => fm.TargetField)
            .ToListAsync(ct);

        return (result.Select(MapToResponse).ToList(), null);
    }

    /// <summary>
    /// Resuelve el valor de un campo destino para un registro QBO dado, usando las reglas de mapeo.
    /// </summary>
    public async Task<string?> ResolveFieldAsync(
        Guid companyId, string entityType, string targetField,
        Dictionary<string, object?> qboRecord, CancellationToken ct = default)
    {
        var mapping = await _db.FieldMappings
            .FirstOrDefaultAsync(fm =>
                fm.CompanyId == companyId
                && fm.EntityType == entityType
                && fm.TargetField == targetField, ct);

        if (mapping == null)
            return null;

        return ResolveValue(mapping, qboRecord);
    }

    /// <summary>
    /// Resuelve todos los campos mapeados para un registro QBO dado.
    /// </summary>
    public async Task<Dictionary<string, string?>> ResolveAllFieldsAsync(
        Guid companyId, string entityType,
        Dictionary<string, object?> qboRecord, CancellationToken ct = default)
    {
        var mappings = await _db.FieldMappings
            .Where(fm => fm.CompanyId == companyId && fm.EntityType == entityType)
            .ToListAsync(ct);

        var result = new Dictionary<string, string?>();
        foreach (var mapping in mappings)
        {
            result[mapping.TargetField] = ResolveValue(mapping, qboRecord);
        }

        return result;
    }

    private static string? ResolveValue(FieldMapping mapping, Dictionary<string, object?> qboRecord)
    {
        if (mapping.SourceType.Equals("Fixed", StringComparison.OrdinalIgnoreCase))
            return mapping.FixedValue;

        if (mapping.SourceType.Equals("QboField", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrEmpty(mapping.QboFieldPath))
        {
            if (qboRecord.TryGetValue(mapping.QboFieldPath, out var value) && value != null)
                return value.ToString();
        }

        return null;
    }

    private static FieldMappingResponse MapToResponse(FieldMapping fm) => new()
    {
        Id = fm.Id,
        CompanyId = fm.CompanyId,
        EntityType = fm.EntityType,
        TargetField = fm.TargetField,
        SourceType = fm.SourceType,
        QboFieldPath = fm.QboFieldPath,
        FixedValue = fm.FixedValue,
        CreatedAtUtc = fm.CreatedAtUtc,
        UpdatedAtUtc = fm.UpdatedAtUtc,
    };
}
