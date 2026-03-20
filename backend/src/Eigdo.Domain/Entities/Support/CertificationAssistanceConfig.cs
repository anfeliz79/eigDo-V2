namespace Eigdo.Domain.Entities.Support;

/// <summary>
/// Singleton configuration for certification assistance service.
/// Managed by superadmin — shown to users when their RNC is not ACTIVO in DGII.
/// </summary>
public class CertificationAssistanceConfig : BaseEntity
{
    /// <summary>Whether the certification assistance service is enabled and shown to users.</summary>
    public bool IsEnabled { get; set; } = true;

    /// <summary>Price in DOP for the certification assistance service.</summary>
    public decimal Price { get; set; }

    /// <summary>Currency code (default DOP).</summary>
    public string Currency { get; set; } = "DOP";

    /// <summary>Short title shown to the user (e.g., "Servicio de Asistencia para Certificación DGII").</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Description / what the service includes (rich text / markdown).</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Comma-separated or JSON list of what's included in the service.</summary>
    public string IncludedItems { get; set; } = "[]";

    /// <summary>Comma-separated or JSON list of required documents/credentials from the user.</summary>
    public string Requirements { get; set; } = "[]";

    /// <summary>Whether the charge is added to the next billing cycle automatically.</summary>
    public bool ChargeOnNextBillingCycle { get; set; } = true;

    /// <summary>Estimated days for completion.</summary>
    public int EstimatedDays { get; set; } = 5;
}
