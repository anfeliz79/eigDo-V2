using Eigdo.Domain.Enums;

namespace Eigdo.Application.DTOs.Fiscal;

public class SequenceResponse
{
    public Guid Id { get; set; }
    public EcfType EcfType { get; set; }
    public string EcfTypeLabel { get; set; } = string.Empty;
    public long RangeStart { get; set; }
    public long RangeEnd { get; set; }
    public long CurrentValue { get; set; }
    public DateTime DueDateUtc { get; set; }
    public bool IsActive { get; set; }
    public int AlertThreshold { get; set; }

    // Computed
    public long RemainingCount { get; set; }
    public bool IsExhausted { get; set; }
    public bool IsExpired { get; set; }
    public double PercentUsed { get; set; }
}

public class CreateSequenceRequest
{
    public EcfType EcfType { get; set; }
    public long RangeStart { get; set; }
    public long RangeEnd { get; set; }
    public DateTime DueDateUtc { get; set; }
    public bool IsActive { get; set; } = true;
    public int AlertThreshold { get; set; } = 100;
}

public class UpdateSequenceRequest
{
    public long? RangeStart { get; set; }
    public long? RangeEnd { get; set; }
    public long? CurrentValue { get; set; }
    public DateTime? DueDateUtc { get; set; }
    public bool? IsActive { get; set; }
    public int? AlertThreshold { get; set; }
}
