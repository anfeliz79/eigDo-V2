using Eigdo.Application.DTOs.Mapping;
using Eigdo.Application.Interfaces;
using Eigdo.Domain.Entities.Mapping;
using Eigdo.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Eigdo.Application.Services;

public class VendorMappingService
{
    private readonly IEigdoDbContext _db;
    private readonly IAuditService _audit;

    public VendorMappingService(IEigdoDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<(List<VendorMappingResponse>? Result, string? Error)> GetAllAsync(
        Guid companyId, CancellationToken ct = default)
    {
        var mappings = await _db.VendorMappings
            .Where(m => m.CompanyId == companyId)
            .OrderBy(m => m.QboDisplayName)
            .ToListAsync(ct);

        var dtos = mappings.Select(MapToResponse).ToList();
        return (dtos, null);
    }

    public async Task<(VendorMappingResponse? Result, string? Error)> GetByIdAsync(
        Guid companyId, Guid mappingId, CancellationToken ct = default)
    {
        var mapping = await _db.VendorMappings
            .FirstOrDefaultAsync(m => m.Id == mappingId && m.CompanyId == companyId, ct);

        if (mapping == null)
            return (null, "Mapeo de proveedor no encontrado.");

        return (MapToResponse(mapping), null);
    }

    public async Task<(VendorMappingResponse? Result, string? Error)> CreateAsync(
        Guid companyId, CreateVendorMappingRequest request, CancellationToken ct = default)
    {
        var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == companyId, ct);
        if (company == null)
            return (null, "Empresa no encontrada.");

        var exists = await _db.VendorMappings
            .AnyAsync(m => m.CompanyId == companyId && m.QboVendorId == request.QboVendorId, ct);

        if (exists)
            return (null, "Ya existe un mapeo para este proveedor QBO.");

        var mapping = new VendorMapping
        {
            CompanyId = companyId,
            QboVendorId = request.QboVendorId,
            QboDisplayName = request.QboDisplayName,
            Rnc = request.Rnc,
            RazonSocialDgii = request.RazonSocialDgii,
            TipoComprobante = request.TipoComprobante,
            ProvinciaDgiiId = request.ProvinciaDgiiId,
            MunicipioDgiiId = request.MunicipioDgiiId,
            RetentionItbisRate = request.RetentionItbisRate,
            RetentionIsrRate = request.RetentionIsrRate,
            Excluido = request.Excluido
        };

        _db.VendorMappings.Add(mapping);
        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(companyId, null, "vendor_mapping.created", "VendorMapping",
            mapping.Id.ToString(), ct: ct);

        return (MapToResponse(mapping), null);
    }

    public async Task<(VendorMappingResponse? Result, string? Error)> UpdateAsync(
        Guid companyId, Guid mappingId, UpdateVendorMappingRequest request, CancellationToken ct = default)
    {
        var mapping = await _db.VendorMappings
            .FirstOrDefaultAsync(m => m.Id == mappingId && m.CompanyId == companyId, ct);

        if (mapping == null)
            return (null, "Mapeo de proveedor no encontrado.");

        if (request.Rnc != null) mapping.Rnc = request.Rnc;
        if (request.RazonSocialDgii != null) mapping.RazonSocialDgii = request.RazonSocialDgii;
        if (request.TipoComprobante.HasValue) mapping.TipoComprobante = request.TipoComprobante.Value;
        if (request.ProvinciaDgiiId.HasValue) mapping.ProvinciaDgiiId = request.ProvinciaDgiiId.Value;
        if (request.MunicipioDgiiId.HasValue) mapping.MunicipioDgiiId = request.MunicipioDgiiId.Value;
        if (request.RetentionItbisRate.HasValue) mapping.RetentionItbisRate = request.RetentionItbisRate.Value;
        if (request.RetentionIsrRate.HasValue) mapping.RetentionIsrRate = request.RetentionIsrRate.Value;
        if (request.Excluido.HasValue) mapping.Excluido = request.Excluido.Value;

        mapping.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(companyId, null, "vendor_mapping.updated", "VendorMapping",
            mapping.Id.ToString(), ct: ct);

        return (MapToResponse(mapping), null);
    }

    public async Task<string?> DeleteAsync(
        Guid companyId, Guid mappingId, CancellationToken ct = default)
    {
        var mapping = await _db.VendorMappings
            .FirstOrDefaultAsync(m => m.Id == mappingId && m.CompanyId == companyId, ct);

        if (mapping == null)
            return "Mapeo de proveedor no encontrado.";

        _db.VendorMappings.Remove(mapping);
        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(companyId, null, "vendor_mapping.deleted", "VendorMapping",
            mappingId.ToString(), ct: ct);

        return null;
    }

    public async Task<(int Result, string? Error)> GetUnmappedCountAsync(
        Guid companyId, CancellationToken ct = default)
    {
        var unmappedCount = await _db.VendorMappings
            .CountAsync(m => m.CompanyId == companyId && !m.Excluido
                && (m.Rnc == null || m.Rnc == string.Empty), ct);

        return (unmappedCount, null);
    }

    private static VendorMappingResponse MapToResponse(VendorMapping m) => new()
    {
        Id = m.Id,
        CompanyId = m.CompanyId,
        QboVendorId = m.QboVendorId,
        QboDisplayName = m.QboDisplayName,
        QboTaxId = m.QboTaxId,
        Rnc = m.Rnc,
        RazonSocialDgii = m.RazonSocialDgii,
        TipoComprobante = m.TipoComprobante,
        ProvinciaDgiiId = m.ProvinciaDgiiId,
        MunicipioDgiiId = m.MunicipioDgiiId,
        RetentionItbisRate = m.RetentionItbisRate,
        RetentionIsrRate = m.RetentionIsrRate,
        Excluido = m.Excluido,
        CreatedAtUtc = m.CreatedAtUtc,
        UpdatedAtUtc = m.UpdatedAtUtc
    };
}
