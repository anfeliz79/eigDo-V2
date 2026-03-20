using Eigdo.Application.DTOs.Fiscal;
using Eigdo.Application.Interfaces;
using Eigdo.Domain.Entities.Fiscal;
using Eigdo.Domain.Enums;
using Eigdo.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Eigdo.Application.Services;

public class SequenceService
{
    private readonly IEigdoDbContext _db;
    private readonly IAuditService _audit;

    private static readonly Dictionary<EcfType, string> EcfTypeLabels = new()
    {
        { EcfType.E31, "E31 - Credito Fiscal" },
        { EcfType.E32, "E32 - Consumo" },
        { EcfType.E33, "E33 - Nota de Debito" },
        { EcfType.E34, "E34 - Nota de Credito" },
        { EcfType.E41, "E41 - Compras" },
        { EcfType.E43, "E43 - Gastos Menores" },
        { EcfType.E44, "E44 - Regimen Especial" },
        { EcfType.E45, "E45 - Gubernamental" },
        { EcfType.E46, "E46 - Exportacion" },
        { EcfType.E47, "E47 - Pagos al Exterior" },
    };

    public SequenceService(IEigdoDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<(List<SequenceResponse>? Result, string? Error)> GetAllAsync(
        Guid companyId, CancellationToken ct = default)
    {
        var fiscalSettings = await _db.FiscalSettings
            .FirstOrDefaultAsync(fs => fs.CompanyId == companyId, ct);

        if (fiscalSettings is null)
            return (new List<SequenceResponse>(), null);

        var sequences = await _db.Sequences
            .Where(s => s.FiscalSettingsId == fiscalSettings.Id)
            .OrderBy(s => s.EcfType)
            .ThenByDescending(s => s.IsActive)
            .ToListAsync(ct);

        var dtos = sequences.Select(MapToResponse).ToList();
        return (dtos, null);
    }

    public async Task<(SequenceResponse? Result, string? Error)> CreateAsync(
        Guid companyId, CreateSequenceRequest request, CancellationToken ct = default)
    {
        var fiscalSettings = await _db.FiscalSettings
            .FirstOrDefaultAsync(fs => fs.CompanyId == companyId, ct);

        if (fiscalSettings is null)
            return (null, "Configuracion fiscal no encontrada. Complete los datos fiscales primero.");

        // Validation
        if (request.RangeStart >= request.RangeEnd)
            return (null, "El numero inicial debe ser menor que el numero final.");

        if (request.RangeStart < 1)
            return (null, "El numero inicial debe ser mayor que 0.");

        if (request.AlertThreshold < 0)
            return (null, "El umbral de alerta debe ser mayor o igual a 0.");

        // Check for overlapping active sequences of the same type
        var overlapping = await _db.Sequences
            .AnyAsync(s => s.FiscalSettingsId == fiscalSettings.Id
                && s.EcfType == request.EcfType
                && s.IsActive, ct);

        if (overlapping && request.IsActive)
            return (null, $"Ya existe una secuencia activa para {GetEcfTypeLabel(request.EcfType)}. Desactive la existente primero.");

        var sequence = new Sequence
        {
            FiscalSettingsId = fiscalSettings.Id,
            EcfType = request.EcfType,
            RangeStart = request.RangeStart,
            RangeEnd = request.RangeEnd,
            CurrentValue = request.RangeStart,
            DueDateUtc = request.DueDateUtc,
            IsActive = request.IsActive,
            AlertThreshold = request.AlertThreshold,
        };

        _db.Sequences.Add(sequence);
        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(companyId, null, "sequence.created", "Sequence",
            sequence.Id.ToString(), ct: ct);

        return (MapToResponse(sequence), null);
    }

    public async Task<(SequenceResponse? Result, string? Error)> UpdateAsync(
        Guid companyId, Guid sequenceId, UpdateSequenceRequest request, CancellationToken ct = default)
    {
        var fiscalSettings = await _db.FiscalSettings
            .FirstOrDefaultAsync(fs => fs.CompanyId == companyId, ct);

        if (fiscalSettings is null)
            return (null, "Configuracion fiscal no encontrada.");

        var sequence = await _db.Sequences
            .FirstOrDefaultAsync(s => s.Id == sequenceId
                && s.FiscalSettingsId == fiscalSettings.Id, ct);

        if (sequence is null)
            return (null, "Secuencia no encontrada.");

        // Apply updates
        if (request.RangeStart.HasValue)
            sequence.RangeStart = request.RangeStart.Value;

        if (request.RangeEnd.HasValue)
            sequence.RangeEnd = request.RangeEnd.Value;

        if (request.CurrentValue.HasValue)
            sequence.CurrentValue = request.CurrentValue.Value;

        if (request.DueDateUtc.HasValue)
            sequence.DueDateUtc = request.DueDateUtc.Value;

        if (request.IsActive.HasValue)
        {
            // If activating, check no other active sequence of same type
            if (request.IsActive.Value && !sequence.IsActive)
            {
                var overlapping = await _db.Sequences
                    .AnyAsync(s => s.FiscalSettingsId == fiscalSettings.Id
                        && s.EcfType == sequence.EcfType
                        && s.IsActive
                        && s.Id != sequenceId, ct);

                if (overlapping)
                    return (null, $"Ya existe otra secuencia activa para {GetEcfTypeLabel(sequence.EcfType)}.");
            }

            sequence.IsActive = request.IsActive.Value;
        }

        if (request.AlertThreshold.HasValue)
            sequence.AlertThreshold = request.AlertThreshold.Value;

        // Re-validate after updates
        if (sequence.RangeStart >= sequence.RangeEnd)
            return (null, "El numero inicial debe ser menor que el numero final.");

        if (sequence.CurrentValue < sequence.RangeStart || sequence.CurrentValue > sequence.RangeEnd)
            return (null, "El numero actual debe estar entre el inicio y fin del rango.");

        sequence.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(companyId, null, "sequence.updated", "Sequence",
            sequence.Id.ToString(), ct: ct);

        return (MapToResponse(sequence), null);
    }

    public async Task<string?> DeleteAsync(
        Guid companyId, Guid sequenceId, CancellationToken ct = default)
    {
        var fiscalSettings = await _db.FiscalSettings
            .FirstOrDefaultAsync(fs => fs.CompanyId == companyId, ct);

        if (fiscalSettings is null)
            return "Configuracion fiscal no encontrada.";

        var sequence = await _db.Sequences
            .FirstOrDefaultAsync(s => s.Id == sequenceId
                && s.FiscalSettingsId == fiscalSettings.Id, ct);

        if (sequence is null)
            return "Secuencia no encontrada.";

        _db.Sequences.Remove(sequence);
        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(companyId, null, "sequence.deleted", "Sequence",
            sequenceId.ToString(), ct: ct);

        return null;
    }

    private static SequenceResponse MapToResponse(Sequence s)
    {
        var totalRange = s.RangeEnd - s.RangeStart;
        var used = s.CurrentValue - s.RangeStart;
        var percentUsed = totalRange > 0 ? Math.Round((double)used / totalRange * 100, 1) : 0;

        return new SequenceResponse
        {
            Id = s.Id,
            EcfType = s.EcfType,
            EcfTypeLabel = GetEcfTypeLabel(s.EcfType),
            RangeStart = s.RangeStart,
            RangeEnd = s.RangeEnd,
            CurrentValue = s.CurrentValue,
            DueDateUtc = s.DueDateUtc,
            IsActive = s.IsActive,
            AlertThreshold = s.AlertThreshold,
            RemainingCount = s.Remaining(),
            IsExhausted = s.IsExhausted(),
            IsExpired = s.IsExpired(),
            PercentUsed = percentUsed,
        };
    }

    private static string GetEcfTypeLabel(EcfType type) =>
        EcfTypeLabels.TryGetValue(type, out var label) ? label : type.ToString();
}
