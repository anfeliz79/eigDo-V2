using Eigdo.Domain.Enums;

namespace Eigdo.Application.DTOs.Emission;

/// <summary>
/// Intermediate representation of a line item during the transformation pipeline.
/// Carries both QBO source data and the resolved fiscal attributes.
/// </summary>
public class LineItemDto
{
    // QBO source data
    public int LineNumber { get; set; }
    public string? QboItemId { get; set; }
    public string? QboTaxCodeId { get; set; }
    public string? Description { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal Amount { get; set; }

    // Resolved fiscal attributes (populated during transformation)
    public BillingIndicator BillingIndicator { get; set; }
    public int UnitMeasure { get; set; } = 43; // DGII default: "Unidad"
    public GoodServiceIndicator GoodServiceIndicator { get; set; } = GoodServiceIndicator.Service;

    // Discount (populated by DiscountDistributor if a global discount exists)
    public decimal DiscountAmount { get; set; }
    public decimal NetAmount { get; set; }
}
