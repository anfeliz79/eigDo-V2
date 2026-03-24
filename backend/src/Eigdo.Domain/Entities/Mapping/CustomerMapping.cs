using Eigdo.Domain.Entities.Tenancy;
using Eigdo.Domain.Enums;

namespace Eigdo.Domain.Entities.Mapping;

public class CustomerMapping : BaseEntity
{
    public Guid CompanyId { get; set; }
    public string QboCustomerId { get; set; } = string.Empty;
    public string QboDisplayName { get; set; } = string.Empty;
    public string? QboEmail { get; set; }
    public string? QboPhone { get; set; }

    // Fiscal data (manual)
    public string? Rnc { get; set; }
    public string? RazonSocialDgii { get; set; }
    public EcfType TipoComprobante { get; set; }
    public int? ProvinciaDgiiId { get; set; }
    public int? MunicipioDgiiId { get; set; }
    public bool Excluido { get; set; }

    // Navigation
    public Company Company { get; set; } = null!;
}
