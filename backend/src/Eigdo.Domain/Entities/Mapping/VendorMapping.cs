using Eigdo.Domain.Entities.Tenancy;
using Eigdo.Domain.Enums;

namespace Eigdo.Domain.Entities.Mapping;

public class VendorMapping : BaseEntity
{
    public Guid CompanyId { get; set; }
    public string QboVendorId { get; set; } = string.Empty;
    public string QboDisplayName { get; set; } = string.Empty;

    // Fiscal data (manual)
    public string? Rnc { get; set; }
    public string? RazonSocialDgii { get; set; }
    public EcfType TipoComprobante { get; set; } // E41, E43, E47
    public int? ProvinciaDgiiId { get; set; }
    public int? MunicipioDgiiId { get; set; }
    public decimal? RetentionItbisRate { get; set; }
    public decimal? RetentionIsrRate { get; set; }
    public bool Excluido { get; set; }

    // Navigation
    public Company Company { get; set; } = null!;
}
