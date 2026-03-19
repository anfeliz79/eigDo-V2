using Eigdo.Domain.Enums;

namespace Eigdo.Application.DTOs.Fiscal;

public class PaymentMethodMappingDto
{
    public Guid Id { get; set; }
    public Guid FiscalSettingsId { get; set; }
    public string QboPaymentMethodId { get; set; } = string.Empty;
    public string QboPaymentMethodName { get; set; } = string.Empty;
    public DgiiPaymentMethod DgiiPaymentMethod { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

/// <summary>Response DTO returned by API controllers.</summary>
public class PaymentMethodMappingResponse : PaymentMethodMappingDto { }

public class UpdatePaymentMethodMappingRequest
{
    public string QboPaymentMethodId { get; set; } = string.Empty;
    public string QboPaymentMethodName { get; set; } = string.Empty;
    public DgiiPaymentMethod DgiiPaymentMethod { get; set; }
}
