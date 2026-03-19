using Eigdo.Application.DTOs.Mapping;
using Eigdo.Application.Interfaces;
using Eigdo.Domain.Entities.Mapping;
using Eigdo.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Eigdo.Application.Services;

public class CustomerMappingService
{
    private readonly IEigdoDbContext _db;
    private readonly IAuditService _audit;

    public CustomerMappingService(IEigdoDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<(List<CustomerMappingResponse>? Result, string? Error)> GetAllAsync(
        Guid companyId, CancellationToken ct = default)
    {
        var mappings = await _db.CustomerMappings
            .Where(m => m.CompanyId == companyId)
            .OrderBy(m => m.QboDisplayName)
            .ToListAsync(ct);

        var dtos = mappings.Select(MapToResponse).ToList();
        return (dtos, null);
    }

    public async Task<(CustomerMappingResponse? Result, string? Error)> GetByIdAsync(
        Guid companyId, Guid mappingId, CancellationToken ct = default)
    {
        var mapping = await _db.CustomerMappings
            .FirstOrDefaultAsync(m => m.Id == mappingId && m.CompanyId == companyId, ct);

        if (mapping == null)
            return (null, "Customer mapping not found.");

        return (MapToResponse(mapping), null);
    }

    public async Task<(CustomerMappingResponse? Result, string? Error)> CreateAsync(
        Guid companyId, CreateCustomerMappingRequest request, CancellationToken ct = default)
    {
        var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == companyId, ct);
        if (company == null)
            return (null, "Company not found.");

        // Check for duplicate QBO customer mapping
        var exists = await _db.CustomerMappings
            .AnyAsync(m => m.CompanyId == companyId && m.QboCustomerId == request.QboCustomerId, ct);

        if (exists)
            return (null, "A mapping for this QBO customer already exists.");

        var mapping = new CustomerMapping
        {
            CompanyId = companyId,
            QboCustomerId = request.QboCustomerId,
            QboDisplayName = request.QboDisplayName,
            Rnc = request.Rnc,
            RazonSocialDgii = request.RazonSocialDgii,
            TipoComprobante = request.TipoComprobante,
            ProvinciaDgiiId = request.ProvinciaDgiiId,
            MunicipioDgiiId = request.MunicipioDgiiId,
            Excluido = request.Excluido
        };

        _db.CustomerMappings.Add(mapping);
        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(companyId, null, "customer_mapping.created", "CustomerMapping",
            mapping.Id.ToString(), ct: ct);

        return (MapToResponse(mapping), null);
    }

    public async Task<(CustomerMappingResponse? Result, string? Error)> UpdateAsync(
        Guid companyId, Guid mappingId, UpdateCustomerMappingRequest request, CancellationToken ct = default)
    {
        var mapping = await _db.CustomerMappings
            .FirstOrDefaultAsync(m => m.Id == mappingId && m.CompanyId == companyId, ct);

        if (mapping == null)
            return (null, "Customer mapping not found.");

        if (request.Rnc != null) mapping.Rnc = request.Rnc;
        if (request.RazonSocialDgii != null) mapping.RazonSocialDgii = request.RazonSocialDgii;
        if (request.TipoComprobante.HasValue) mapping.TipoComprobante = request.TipoComprobante.Value;
        if (request.ProvinciaDgiiId.HasValue) mapping.ProvinciaDgiiId = request.ProvinciaDgiiId.Value;
        if (request.MunicipioDgiiId.HasValue) mapping.MunicipioDgiiId = request.MunicipioDgiiId.Value;
        if (request.Excluido.HasValue) mapping.Excluido = request.Excluido.Value;

        mapping.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(companyId, null, "customer_mapping.updated", "CustomerMapping",
            mapping.Id.ToString(), ct: ct);

        return (MapToResponse(mapping), null);
    }

    public async Task<string?> DeleteAsync(
        Guid companyId, Guid mappingId, CancellationToken ct = default)
    {
        var mapping = await _db.CustomerMappings
            .FirstOrDefaultAsync(m => m.Id == mappingId && m.CompanyId == companyId, ct);

        if (mapping == null)
            return "Customer mapping not found.";

        _db.CustomerMappings.Remove(mapping);
        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(companyId, null, "customer_mapping.deleted", "CustomerMapping",
            mappingId.ToString(), ct: ct);

        return null;
    }

    public async Task<(int Result, string? Error)> GetUnmappedCountAsync(
        Guid companyId, CancellationToken ct = default)
    {
        var unmappedCount = await _db.CustomerMappings
            .CountAsync(m => m.CompanyId == companyId && !m.Excluido
                && (m.Rnc == null || m.Rnc == string.Empty), ct);

        return (unmappedCount, null);
    }

    private static CustomerMappingResponse MapToResponse(CustomerMapping m) => new()
    {
        Id = m.Id,
        CompanyId = m.CompanyId,
        QboCustomerId = m.QboCustomerId,
        QboDisplayName = m.QboDisplayName,
        Rnc = m.Rnc,
        RazonSocialDgii = m.RazonSocialDgii,
        TipoComprobante = m.TipoComprobante,
        ProvinciaDgiiId = m.ProvinciaDgiiId,
        MunicipioDgiiId = m.MunicipioDgiiId,
        Excluido = m.Excluido,
        CreatedAtUtc = m.CreatedAtUtc,
        UpdatedAtUtc = m.UpdatedAtUtc
    };
}
