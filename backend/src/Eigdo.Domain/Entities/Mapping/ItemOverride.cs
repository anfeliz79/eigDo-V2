using Eigdo.Domain.Entities.Tenancy;
using Eigdo.Domain.Enums;

namespace Eigdo.Domain.Entities.Mapping;

public class ItemOverride : BaseEntity
{
    public Guid CompanyId { get; set; }
    public string QboItemId { get; set; } = string.Empty;
    public string QboItemName { get; set; } = string.Empty;
    public string? QboItemType { get; set; } // Service, Inventory, NonInventory — reference only
    public int? UnitMeasureOverride { get; set; }
    public GoodServiceIndicator? GoodServiceIndicatorOverride { get; set; }

    // Navigation
    public Company Company { get; set; } = null!;
}
