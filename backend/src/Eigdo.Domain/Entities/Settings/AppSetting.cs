namespace Eigdo.Domain.Entities.Settings;

/// <summary>
/// System-wide key-value settings, stored in the database.
/// Values marked as secrets are encrypted at rest via IEncryptionService.
/// </summary>
public class AppSetting : BaseEntity
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public bool IsSecret { get; set; }
}
