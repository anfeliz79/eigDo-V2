using Eigdo.Domain.Enums;

namespace Eigdo.Application.DTOs.Mapping;

public class TaxCodeMappingDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string QboTaxCodeId { get; set; } = string.Empty;
    public string QboTaxCodeName { get; set; } = string.Empty;
    public decimal? QboTaxRate { get; set; }
    public BillingIndicator BillingIndicator { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

public class UpdateTaxCodeMappingRequest
{
    public string QboTaxCodeId { get; set; } = string.Empty;
    public string QboTaxCodeName { get; set; } = string.Empty;
    public decimal? QboTaxRate { get; set; }
    public BillingIndicator BillingIndicator { get; set; }
}

/// <summary>Alias used by API controllers.</summary>
public class CreateOrUpdateTaxMappingRequest : UpdateTaxCodeMappingRequest { }

/// <summary>Response DTO returned by API controllers.</summary>
public class TaxMappingResponse : TaxCodeMappingDto { }
