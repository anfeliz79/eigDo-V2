using Eigdo.Application.DTOs.Mapping;
using Eigdo.Application.Interfaces;
using Eigdo.Domain.Entities.Mapping;
using Eigdo.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Eigdo.Application.Services;

public class TaxMappingService
{
    private readonly IEigdoDbContext _db;
    private readonly IAuditService _audit;

    public TaxMappingService(IEigdoDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<(List<TaxMappingResponse>? Result, string? Error)> GetAllAsync(
        Guid companyId, CancellationToken ct = default)
    {
        var mappings = await _db.TaxCodeMappings
            .Where(m => m.CompanyId == companyId)
            .OrderBy(m => m.QboTaxCodeName)
            .ToListAsync(ct);

        var dtos = mappings.Select(MapToResponse).ToList();
        return (dtos, null);
    }

    public async Task<(TaxMappingResponse? Result, string? Error)> CreateOrUpdateAsync(
        Guid companyId, UpdateTaxCodeMappingRequest request, CancellationToken ct = default)
    {
        var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == companyId, ct);
        if (company == null)
            return (null, "Empresa no encontrada.");

        var mapping = await _db.TaxCodeMappings
            .FirstOrDefaultAsync(m => m.CompanyId == companyId
                && m.QboTaxCodeId == request.QboTaxCodeId, ct);

        var isNew = mapping == null;

        if (isNew)
        {
            mapping = new TaxCodeMapping
            {
                CompanyId = companyId,
                QboTaxCodeId = request.QboTaxCodeId
            };
            _db.TaxCodeMappings.Add(mapping);
        }

        mapping!.QboTaxCodeName = request.QboTaxCodeName;
        mapping.QboTaxRate = request.QboTaxRate;
        mapping.BillingIndicator = request.BillingIndicator;
        mapping.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        var action = isNew ? "tax_code_mapping.created" : "tax_code_mapping.updated";
        await _audit.LogAsync(companyId, null, action, "TaxCodeMapping", mapping.Id.ToString(), ct: ct);

        return (MapToResponse(mapping), null);
    }

    public async Task<string?> DeleteAsync(
        Guid companyId, Guid mappingId, CancellationToken ct = default)
    {
        var mapping = await _db.TaxCodeMappings
            .FirstOrDefaultAsync(m => m.Id == mappingId && m.CompanyId == companyId, ct);

        if (mapping == null)
            return "Mapeo de codigo fiscal no encontrado.";

        _db.TaxCodeMappings.Remove(mapping);
        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(companyId, null, "tax_code_mapping.deleted", "TaxCodeMapping",
            mappingId.ToString(), ct: ct);

        return null;
    }

    private static TaxMappingResponse MapToResponse(TaxCodeMapping m) => new()
    {
        Id = m.Id,
        CompanyId = m.CompanyId,
        QboTaxCodeId = m.QboTaxCodeId,
        QboTaxCodeName = m.QboTaxCodeName,
        QboTaxRate = m.QboTaxRate,
        BillingIndicator = m.BillingIndicator,
        CreatedAtUtc = m.CreatedAtUtc,
        UpdatedAtUtc = m.UpdatedAtUtc
    };
}
