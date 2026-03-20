using Eigdo.Domain.Enums;

namespace Eigdo.Application.DTOs.Emission;

/// <summary>
/// Input context for the emission validation pipeline.
/// Carries everything the EmissionValidator needs to check preconditions.
/// </summary>
public class EmissionContext
{
    public Guid CompanyId { get; set; }
    public EcfType EcfType { get; set; }

    /// <summary>
    /// QBO customer or vendor ID depending on e-CF direction (sales vs purchases).
    /// </summary>
    public string QboSourceId { get; set; } = string.Empty;

    /// <summary>
    /// QBO tax code IDs present on the document lines.
    /// Used to verify all referenced tax codes have a mapping.
    /// </summary>
    public List<string> QboTaxCodeIds { get; set; } = new();

    /// <summary>
    /// Whether the document contains service line items (relevant for E41 retention checks).
    /// </summary>
    public bool HasServiceItems { get; set; }
}
