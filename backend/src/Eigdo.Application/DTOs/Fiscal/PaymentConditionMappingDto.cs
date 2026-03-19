using Eigdo.Domain.Enums;

namespace Eigdo.Application.DTOs.Fiscal;

public class PaymentConditionMappingDto
{
    public Guid Id { get; set; }
    public Guid FiscalSettingsId { get; set; }
    public string QboSalesTermId { get; set; } = string.Empty;
    public string QboSalesTermName { get; set; } = string.Empty;
    public DgiiPaymentType DgiiPaymentType { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

/// <summary>Response DTO returned by API controllers.</summary>
public class PaymentConditionMappingResponse : PaymentConditionMappingDto { }

public class UpdatePaymentConditionMappingRequest
{
    public string QboSalesTermId { get; set; } = string.Empty;
    public string QboSalesTermName { get; set; } = string.Empty;
    public DgiiPaymentType DgiiPaymentType { get; set; }
}
