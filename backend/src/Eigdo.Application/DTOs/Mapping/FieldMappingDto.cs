namespace Eigdo.Application.DTOs.Mapping;

public class FieldMappingDto
{
    public string TargetField { get; set; } = string.Empty;
    public string SourceType { get; set; } = string.Empty; // "QboField" | "Fixed"
    public string? QboFieldPath { get; set; }
    public string? FixedValue { get; set; }
}

public class FieldMappingResponse
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public string TargetField { get; set; } = string.Empty;
    public string SourceType { get; set; } = string.Empty;
    public string? QboFieldPath { get; set; }
    public string? FixedValue { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}

public class SaveFieldMappingsRequest
{
    public List<FieldMappingDto> Mappings { get; set; } = new();
}

public class QboSampleRecordResponse
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public Dictionary<string, string> Fields { get; set; } = new();
}
