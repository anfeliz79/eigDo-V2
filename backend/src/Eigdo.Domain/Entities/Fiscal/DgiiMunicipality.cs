namespace Eigdo.Domain.Entities.Fiscal;

public class DgiiMunicipality
{
    public int Id { get; set; }
    public int ProvinceId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    public DgiiProvince Province { get; set; } = null!;
}
