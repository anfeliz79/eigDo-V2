using Eigdo.Domain.Entities.Tenancy;

namespace Eigdo.Domain.Entities.Mapping;

public class FieldMapping : BaseEntity
{
    public Guid CompanyId { get; set; }

    /// <summary>
    /// Tipo de entidad QBO: "Customer", "Vendor", "Item"
    /// </summary>
    public string EntityType { get; set; } = string.Empty;

    /// <summary>
    /// Campo destino en eigdo: "Rnc", "RazonSocial", "TipoComprobante", "RetentionItbisRate", "RetentionIsrRate"
    /// </summary>
    public string TargetField { get; set; } = string.Empty;

    /// <summary>
    /// Tipo de origen: "QboField" (campo de QBO) o "Fixed" (valor fijo)
    /// </summary>
    public string SourceType { get; set; } = string.Empty;

    /// <summary>
    /// Ruta del campo QBO cuando SourceType = "QboField".
    /// Ejemplos: "TaxIdentifier", "CompanyName", "DisplayName", "CustomField.1"
    /// </summary>
    public string? QboFieldPath { get; set; }

    /// <summary>
    /// Valor fijo cuando SourceType = "Fixed".
    /// Ejemplo: TipoComprobante = "E31"
    /// </summary>
    public string? FixedValue { get; set; }

    // Navigation
    public Company Company { get; set; } = null!;
}
