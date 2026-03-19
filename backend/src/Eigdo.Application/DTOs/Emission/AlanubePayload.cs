using System.Text.Json.Serialization;

namespace Eigdo.Application.DTOs.Emission;

/// <summary>
/// Root wrapper for the Alanube e-CF submission payload.
/// </summary>
public class AlanubePayload
{
    [JsonPropertyName("ecf")]
    public EcfPayload Ecf { get; set; } = new();
}

public class EcfPayload
{
    [JsonPropertyName("encabezado")]
    public EncabezadoPayload Encabezado { get; set; } = new();

    [JsonPropertyName("emisor")]
    public EmisorPayload Emisor { get; set; } = new();

    [JsonPropertyName("comprador")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public CompradorPayload? Comprador { get; set; }

    [JsonPropertyName("detallesItems")]
    public DetallesItemsPayload DetallesItems { get; set; } = new();

    [JsonPropertyName("subtotales")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public SubtotalesPayload? Subtotales { get; set; }

    [JsonPropertyName("descuentosORecargos")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DescuentosORecargosPayload? DescuentosORecargos { get; set; }

    [JsonPropertyName("paginacion")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public PaginacionPayload? Paginacion { get; set; }

    [JsonPropertyName("totales")]
    public TotalesPayload Totales { get; set; } = new();

    [JsonPropertyName("otrosImpuestos")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public OtrosImpuestosPayload? OtrosImpuestos { get; set; }
}

public class EncabezadoPayload
{
    [JsonPropertyName("tipoEcf")]
    public string TipoEcf { get; set; } = string.Empty;

    [JsonPropertyName("eNcf")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ENcf { get; set; }

    [JsonPropertyName("fechaEmision")]
    public string FechaEmision { get; set; } = string.Empty;

    [JsonPropertyName("tipoIngreso")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? TipoIngreso { get; set; }

    [JsonPropertyName("tipoPago")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? TipoPago { get; set; }

    [JsonPropertyName("indicadorMontoGravado")]
    public int IndicadorMontoGravado { get; set; }
}

public class EmisorPayload
{
    [JsonPropertyName("rnc")]
    public string Rnc { get; set; } = string.Empty;

    [JsonPropertyName("razonSocial")]
    public string RazonSocial { get; set; } = string.Empty;

    [JsonPropertyName("nombreComercial")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? NombreComercial { get; set; }

    [JsonPropertyName("direccion")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Direccion { get; set; }

    [JsonPropertyName("municipio")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? Municipio { get; set; }

    [JsonPropertyName("provincia")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? Provincia { get; set; }

    [JsonPropertyName("telefono")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Telefono { get; set; }

    [JsonPropertyName("correo")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Correo { get; set; }
}

public class CompradorPayload
{
    [JsonPropertyName("rnc")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Rnc { get; set; }

    [JsonPropertyName("razonSocial")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? RazonSocial { get; set; }

    [JsonPropertyName("municipio")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? Municipio { get; set; }

    [JsonPropertyName("provincia")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? Provincia { get; set; }
}

public class DetallesItemsPayload
{
    [JsonPropertyName("item")]
    public List<ItemPayload> Item { get; set; } = new();
}

public class ItemPayload
{
    [JsonPropertyName("numeroLinea")]
    public int NumeroLinea { get; set; }

    [JsonPropertyName("indicadorFacturacion")]
    public int IndicadorFacturacion { get; set; }

    [JsonPropertyName("nombreItem")]
    public string NombreItem { get; set; } = string.Empty;

    [JsonPropertyName("indicadorBienOServicio")]
    public int IndicadorBienOServicio { get; set; }

    [JsonPropertyName("cantidadItem")]
    public decimal CantidadItem { get; set; }

    [JsonPropertyName("precioUnitarioItem")]
    public decimal PrecioUnitarioItem { get; set; }

    [JsonPropertyName("descuentoMonto")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public decimal? DescuentoMonto { get; set; }

    [JsonPropertyName("montoItem")]
    public decimal MontoItem { get; set; }

    [JsonPropertyName("unidadMedida")]
    public int UnidadMedida { get; set; }
}

public class SubtotalesPayload
{
    [JsonPropertyName("montoGravado18")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public decimal MontoGravado18 { get; set; }

    [JsonPropertyName("montoGravado16")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public decimal MontoGravado16 { get; set; }

    [JsonPropertyName("montoGravado0")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public decimal MontoGravado0 { get; set; }

    [JsonPropertyName("montoExento")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public decimal MontoExento { get; set; }

    [JsonPropertyName("itbis18")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public decimal Itbis18 { get; set; }

    [JsonPropertyName("itbis16")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public decimal Itbis16 { get; set; }

    [JsonPropertyName("itbis0")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public decimal Itbis0 { get; set; }
}

public class DescuentosORecargosPayload
{
    [JsonPropertyName("descuento")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<DescuentoPayload>? Descuento { get; set; }
}

public class DescuentoPayload
{
    [JsonPropertyName("numeroLinea")]
    public int NumeroLinea { get; set; }

    [JsonPropertyName("tipoAjuste")]
    public int TipoAjuste { get; set; } = 1; // 1 = Descuento

    [JsonPropertyName("indicadorDescuentoORecargo")]
    public int IndicadorDescuentoORecargo { get; set; } = 1; // 1 = Descuento

    [JsonPropertyName("montoAjuste")]
    public decimal MontoAjuste { get; set; }
}

public class PaginacionPayload
{
    [JsonPropertyName("pagina")]
    public int Pagina { get; set; } = 1;

    [JsonPropertyName("totalPaginas")]
    public int TotalPaginas { get; set; } = 1;
}

public class TotalesPayload
{
    [JsonPropertyName("montoGravadoTotal")]
    public decimal MontoGravadoTotal { get; set; }

    [JsonPropertyName("montoGravadoI1")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public decimal MontoGravadoI1 { get; set; }

    [JsonPropertyName("montoGravadoI2")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public decimal MontoGravadoI2 { get; set; }

    [JsonPropertyName("montoGravadoI3")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public decimal MontoGravadoI3 { get; set; }

    [JsonPropertyName("montoExento")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public decimal MontoExento { get; set; }

    [JsonPropertyName("totalItbis")]
    public decimal TotalItbis { get; set; }

    [JsonPropertyName("totalItbis18")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public decimal TotalItbis18 { get; set; }

    [JsonPropertyName("totalItbis16")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public decimal TotalItbis16 { get; set; }

    [JsonPropertyName("totalItbis0")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public decimal TotalItbis0 { get; set; }

    [JsonPropertyName("montoTotal")]
    public decimal MontoTotal { get; set; }

    [JsonPropertyName("totalDescuento")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public decimal TotalDescuento { get; set; }

    [JsonPropertyName("montoNoFacturable")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public decimal MontoNoFacturable { get; set; }

    // Retentions (E41)
    [JsonPropertyName("itbisRetenido")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public decimal ItbisRetenido { get; set; }

    [JsonPropertyName("isrRetenido")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public decimal IsrRetenido { get; set; }

    [JsonPropertyName("totalRetenido")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public decimal TotalRetenido { get; set; }
}

public class OtrosImpuestosPayload
{
    [JsonPropertyName("itbisRetenido")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public decimal ItbisRetenido { get; set; }

    [JsonPropertyName("isrRetenido")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public decimal IsrRetenido { get; set; }
}
