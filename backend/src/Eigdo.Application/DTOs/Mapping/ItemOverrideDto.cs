using Eigdo.Domain.Enums;

namespace Eigdo.Application.DTOs.Mapping;

public class ItemOverrideDto
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string QboItemId { get; set; } = string.Empty;
    public string QboItemName { get; set; } = string.Empty;
    public string? QboItemType { get; set; }
    public int? UnitMeasureOverride { get; set; }
    public GoodServiceIndicator? GoodServiceIndicatorOverride { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

public class UpdateItemOverrideRequest
{
    public string QboItemId { get; set; } = string.Empty;
    public string QboItemName { get; set; } = string.Empty;
    public string? QboItemType { get; set; }
    public int? UnitMeasureOverride { get; set; }
    public GoodServiceIndicator? GoodServiceIndicatorOverride { get; set; }
}

/// <summary>Alias used by API controllers.</summary>
public class CreateOrUpdateItemOverrideRequest : UpdateItemOverrideRequest { }

/// <summary>Response DTO returned by API controllers.</summary>
public class ItemOverrideResponse : ItemOverrideDto { }
