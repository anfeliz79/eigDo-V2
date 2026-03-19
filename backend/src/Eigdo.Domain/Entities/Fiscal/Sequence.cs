using Eigdo.Domain.Enums;

namespace Eigdo.Domain.Entities.Fiscal;

public class Sequence : BaseEntity
{
    public Guid FiscalSettingsId { get; set; }
    public EcfType EcfType { get; set; }
    public long RangeStart { get; set; }
    public long RangeEnd { get; set; }
    public long CurrentValue { get; set; }
    public DateTime DueDateUtc { get; set; }
    public int AlertThreshold { get; set; } = 100; // Alert when remaining < this
    public bool IsActive { get; set; } = true;

    public bool IsExhausted() => CurrentValue >= RangeEnd;
    public bool IsExpired() => DateTime.UtcNow > DueDateUtc;
    public long Remaining() => RangeEnd - CurrentValue;
    public bool ShouldAlert() => Remaining() <= AlertThreshold;

    // Navigation
    public FiscalSettings FiscalSettings { get; set; } = null!;
}
