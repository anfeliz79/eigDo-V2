using Eigdo.Domain.Enums;

namespace Eigdo.Application.DTOs.Mapping;

public class CustomerMappingDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string QboCustomerId { get; set; } = string.Empty;
    public string QboDisplayName { get; set; } = string.Empty;
    public string? QboTaxId { get; set; }
    public string? Rnc { get; set; }
    public string? RazonSocialDgii { get; set; }
    public EcfType TipoComprobante { get; set; }
    public int? ProvinciaDgiiId { get; set; }
    public int? MunicipioDgiiId { get; set; }
    public bool Excluido { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

/// <summary>Response DTO returned by API controllers.</summary>
public class CustomerMappingResponse : CustomerMappingDto { }

public class CreateCustomerMappingRequest
{
    public string QboCustomerId { get; set; } = string.Empty;
    public string QboDisplayName { get; set; } = string.Empty;
    public string? Rnc { get; set; }
    public string? RazonSocialDgii { get; set; }
    public EcfType TipoComprobante { get; set; }
    public int? ProvinciaDgiiId { get; set; }
    public int? MunicipioDgiiId { get; set; }
    public bool Excluido { get; set; }
}

public class UpdateCustomerMappingRequest
{
    public string? Rnc { get; set; }
    public string? RazonSocialDgii { get; set; }
    public EcfType? TipoComprobante { get; set; }
    public int? ProvinciaDgiiId { get; set; }
    public int? MunicipioDgiiId { get; set; }
    public bool? Excluido { get; set; }
}
