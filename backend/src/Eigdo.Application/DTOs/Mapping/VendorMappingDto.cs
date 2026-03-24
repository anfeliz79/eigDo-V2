using Eigdo.Domain.Enums;

namespace Eigdo.Application.DTOs.Mapping;

public class VendorMappingDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string QboVendorId { get; set; } = string.Empty;
    public string QboDisplayName { get; set; } = string.Empty;
    public string? QboTaxId { get; set; }
    public string? Rnc { get; set; }
    public string? RazonSocialDgii { get; set; }
    public EcfType TipoComprobante { get; set; }
    public int? ProvinciaDgiiId { get; set; }
    public int? MunicipioDgiiId { get; set; }
    public decimal? RetentionItbisRate { get; set; }
    public decimal? RetentionIsrRate { get; set; }
    public bool Excluido { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

/// <summary>Response DTO returned by API controllers.</summary>
public class VendorMappingResponse : VendorMappingDto { }

public class CreateVendorMappingRequest
{
    public string QboVendorId { get; set; } = string.Empty;
    public string QboDisplayName { get; set; } = string.Empty;
    public string? Rnc { get; set; }
    public string? RazonSocialDgii { get; set; }
    public EcfType TipoComprobante { get; set; }
    public int? ProvinciaDgiiId { get; set; }
    public int? MunicipioDgiiId { get; set; }
    public decimal? RetentionItbisRate { get; set; }
    public decimal? RetentionIsrRate { get; set; }
    public bool Excluido { get; set; }
}

public class UpdateVendorMappingRequest
{
    public string? Rnc { get; set; }
    public string? RazonSocialDgii { get; set; }
    public EcfType? TipoComprobante { get; set; }
    public int? ProvinciaDgiiId { get; set; }
    public int? MunicipioDgiiId { get; set; }
    public decimal? RetentionItbisRate { get; set; }
    public decimal? RetentionIsrRate { get; set; }
    public bool? Excluido { get; set; }
}
