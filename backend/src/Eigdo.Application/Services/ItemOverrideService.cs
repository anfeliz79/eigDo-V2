using Eigdo.Application.DTOs.Mapping;
using Eigdo.Application.Interfaces;
using Eigdo.Domain.Entities.Mapping;
using Eigdo.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Eigdo.Application.Services;

public class ItemOverrideService
{
    private readonly IEigdoDbContext _db;
    private readonly IAuditService _audit;

    public ItemOverrideService(IEigdoDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<(List<ItemOverrideResponse>? Result, string? Error)> GetAllAsync(
        Guid companyId, CancellationToken ct = default)
    {
        var overrides = await _db.ItemOverrides
            .Where(m => m.CompanyId == companyId)
            .OrderBy(m => m.QboItemName)
            .ToListAsync(ct);

        var dtos = overrides.Select(MapToResponse).ToList();
        return (dtos, null);
    }

    public async Task<(ItemOverrideResponse? Result, string? Error)> CreateOrUpdateAsync(
        Guid companyId, UpdateItemOverrideRequest request, CancellationToken ct = default)
    {
        var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == companyId, ct);
        if (company == null)
            return (null, "Company not found.");

        var existing = await _db.ItemOverrides
            .FirstOrDefaultAsync(m => m.CompanyId == companyId
                && m.QboItemId == request.QboItemId, ct);

        var isNew = existing == null;

        if (isNew)
        {
            existing = new ItemOverride
            {
                CompanyId = companyId,
                QboItemId = request.QboItemId
            };
            _db.ItemOverrides.Add(existing);
        }

        existing!.QboItemName = request.QboItemName;
        existing.QboItemType = request.QboItemType;
        existing.UnitMeasureOverride = request.UnitMeasureOverride;
        existing.GoodServiceIndicatorOverride = request.GoodServiceIndicatorOverride;
        existing.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        var action = isNew ? "item_override.created" : "item_override.updated";
        await _audit.LogAsync(companyId, null, action, "ItemOverride", existing.Id.ToString(), ct: ct);

        return (MapToResponse(existing), null);
    }

    public async Task<string?> DeleteAsync(
        Guid companyId, Guid mappingId, CancellationToken ct = default)
    {
        var existing = await _db.ItemOverrides
            .FirstOrDefaultAsync(m => m.Id == mappingId && m.CompanyId == companyId, ct);

        if (existing == null)
            return "Item override not found.";

        _db.ItemOverrides.Remove(existing);
        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(companyId, null, "item_override.deleted", "ItemOverride",
            mappingId.ToString(), ct: ct);

        return null;
    }

    private static ItemOverrideResponse MapToResponse(ItemOverride m) => new()
    {
        Id = m.Id,
        CompanyId = m.CompanyId,
        QboItemId = m.QboItemId,
        QboItemName = m.QboItemName,
        QboItemType = m.QboItemType,
        UnitMeasureOverride = m.UnitMeasureOverride,
        GoodServiceIndicatorOverride = m.GoodServiceIndicatorOverride,
        CreatedAtUtc = m.CreatedAtUtc,
        UpdatedAtUtc = m.UpdatedAtUtc
    };
}
