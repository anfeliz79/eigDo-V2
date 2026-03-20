namespace Eigdo.Application.DTOs.Dgii;

public class DgiiRncResultDto
{
    public string Rnc { get; set; } = "";
    public string RazonSocial { get; set; } = "";
    public string NombreComercial { get; set; } = "";
    public string Estado { get; set; } = "";
    public string RegimenPagos { get; set; } = "";
    public string ActividadEconomica { get; set; } = "";
    public string AdministracionLocal { get; set; } = "";
    public bool EsFacturadorElectronico { get; set; }
    public bool EsActivo => Estado.Equals("ACTIVO", StringComparison.OrdinalIgnoreCase);
}
