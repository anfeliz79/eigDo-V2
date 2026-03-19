using System.Text.Json;
using Eigdo.Application.DTOs.Emission;
using Eigdo.Application.Interfaces;
using Eigdo.Domain.Entities.Fiscal;
using Eigdo.Domain.Entities.Mapping;
using Eigdo.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Eigdo.Application.Services;

/// <summary>
/// Transforms QBO document data into an Alanube e-CF payload by applying 5 mapping cycles:
///   Cycle 1 – Emisor (sender identity + defaults from FiscalSettings)
///   Cycle 2 – Comprador (customer mapping for sales e-CFs)
///   Cycle 3 – Proveedor (vendor mapping for purchase e-CFs)
///   Cycle 4 – ITBIS / billing indicator (tax-code mappings + forced overrides)
///   Cycle 5 – Line items (item overrides for unit-of-measure / good-service indicator)
/// </summary>
public class PayloadTransformer
{
    private readonly IEigdoDbContext _db;
    private readonly TaxCalculator _taxCalculator;
    private readonly RetentionCalculator _retentionCalculator;
    private readonly DiscountDistributor _discountDistributor;

    // Sales e-CF types that require a Comprador section (Cycle 2)
    private static readonly HashSet<EcfType> SalesEcfTypes = new()
    {
        EcfType.E31, EcfType.E32, EcfType.E34,
        EcfType.E44, EcfType.E45, EcfType.E46
    };

    // Purchase e-CF types that require a Vendor lookup (Cycle 3)
    private static readonly HashSet<EcfType> PurchaseEcfTypes = new()
    {
        EcfType.E41, EcfType.E43, EcfType.E47
    };

    // Forced billing-indicator overrides by e-CF type (Cycle 4)
    private static readonly Dictionary<EcfType, BillingIndicator> ForcedBillingOverrides = new()
    {
        { EcfType.E43, BillingIndicator.Special },
        { EcfType.E44, BillingIndicator.Special },
        { EcfType.E46, BillingIndicator.Itbis0 },
        { EcfType.E47, BillingIndicator.Special }
    };

    public PayloadTransformer(
        IEigdoDbContext db,
        TaxCalculator taxCalculator,
        RetentionCalculator retentionCalculator,
        DiscountDistributor discountDistributor)
    {
        _db = db;
        _taxCalculator = taxCalculator;
        _retentionCalculator = retentionCalculator;
        _discountDistributor = discountDistributor;
    }

    /// <summary>
    /// Builds a fully-formed <see cref="AlanubePayload"/> from a raw QBO document JSON and the
    /// target e-CF type, pulling all required mappings from the database.
    /// </summary>
    /// <param name="companyId">Tenant company ID.</param>
    /// <param name="ecfType">Target e-CF document type.</param>
    /// <param name="qboDocumentJson">Raw QBO document JSON (Invoice, Bill, etc.).</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>A serialisation-ready <see cref="AlanubePayload"/>.</returns>
    public async Task<AlanubePayload> TransformAsync(
        Guid companyId,
        EcfType ecfType,
        string qboDocumentJson,
        CancellationToken ct = default)
    {
        using var qboDoc = JsonDocument.Parse(qboDocumentJson);
        var root = qboDoc.RootElement;

        var payload = new AlanubePayload();

        // ── Cycle 1: Emisor ──────────────────────────────────────────
        var fiscal = await GetFiscalSettingsAsync(companyId, ct);
        ApplyEmisor(payload, fiscal, ecfType, root);

        // ── Cycle 2: Comprador (sales) ───────────────────────────────
        if (SalesEcfTypes.Contains(ecfType))
        {
            await ApplyCompradorAsync(payload, companyId, ecfType, root, ct);
        }

        // ── Cycle 3: Proveedor (purchases) ───────────────────────────
        VendorMapping? vendorMapping = null;
        if (PurchaseEcfTypes.Contains(ecfType))
        {
            vendorMapping = await ApplyProveedorAsync(payload, companyId, root, ct);
        }

        // ── Cycle 4: Tax / Billing Indicator ─────────────────────────
        var taxCodeMap = await LoadTaxCodeMapAsync(companyId, ct);
        var itemOverrideMap = await LoadItemOverridesAsync(companyId, ct);

        // ── Cycle 5: Line items ──────────────────────────────────────
        var (lineItems, taxLineResults, totalDiscount) = BuildLineItems(
            root, ecfType, fiscal, taxCodeMap, itemOverrideMap);

        payload.Ecf.DetallesItems.Item = lineItems;

        // ── Compute document totals (NEVER use QBO tax amounts) ──────
        var docTotals = _taxCalculator.CalculateDocumentTotals(taxLineResults);

        // ── Subtotales ───────────────────────────────────────────────
        var subtotales = BuildSubtotales(lineItems, taxLineResults);
        payload.Ecf.Subtotales = subtotales;

        // ── Descuentos ───────────────────────────────────────────────
        if (totalDiscount > 0)
        {
            payload.Ecf.DescuentosORecargos = new DescuentosORecargosPayload
            {
                Descuento = new List<DescuentoPayload>
                {
                    new()
                    {
                        NumeroLinea = 1,
                        TipoAjuste = 1,
                        IndicadorDescuentoORecargo = 1,
                        MontoAjuste = totalDiscount
                    }
                }
            };
        }

        // ── Paginacion ───────────────────────────────────────────────
        payload.Ecf.Paginacion = new PaginacionPayload { Pagina = 1, TotalPaginas = 1 };

        // ── Totales ──────────────────────────────────────────────────
        BuildTotales(payload, docTotals, totalDiscount);

        // ── Retentions (E41 only) ────────────────────────────────────
        if (ecfType == EcfType.E41 && vendorMapping is not null)
        {
            ApplyRetentions(payload, docTotals, vendorMapping);
        }

        return payload;
    }

    // ─────────────────────────────────────────────────────────────────
    //  Cycle 1 – Emisor
    // ─────────────────────────────────────────────────────────────────

    private static void ApplyEmisor(AlanubePayload payload, FiscalSettings fiscal, EcfType ecfType, JsonElement root)
    {
        // Encabezado
        var enc = payload.Ecf.Encabezado;
        enc.TipoEcf = ecfType.ToString();
        enc.FechaEmision = ExtractDate(root, "TxnDate") ?? DateTime.UtcNow.ToString("yyyy-MM-dd");
        enc.TipoIngreso = fiscal.DefaultIncomeType.HasValue
            ? ((int)fiscal.DefaultIncomeType.Value).ToString("D2")
            : "01";
        enc.TipoPago = "1"; // default Contado; can be enriched later via PaymentConditionMapping
        enc.IndicadorMontoGravado = fiscal.TaxAmountIndicator ?? 0;

        // Emisor
        var emisor = payload.Ecf.Emisor;
        emisor.Rnc = fiscal.Rnc ?? string.Empty;
        emisor.RazonSocial = fiscal.RazonSocial ?? string.Empty;
        emisor.NombreComercial = fiscal.NombreComercial;
        emisor.Direccion = fiscal.Direccion;
        emisor.Provincia = fiscal.ProvinciaDgiiId;
        emisor.Municipio = fiscal.MunicipioDgiiId;
        emisor.Telefono = fiscal.Telefono;
        emisor.Correo = fiscal.Email;
    }

    // ─────────────────────────────────────────────────────────────────
    //  Cycle 2 – Comprador (sales e-CFs)
    // ─────────────────────────────────────────────────────────────────

    private async Task ApplyCompradorAsync(
        AlanubePayload payload, Guid companyId, EcfType ecfType, JsonElement root, CancellationToken ct)
    {
        var qboCustomerId = ExtractRef(root, "CustomerRef");
        if (qboCustomerId is null) return;

        var mapping = await _db.CustomerMappings
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.CompanyId == companyId && m.QboCustomerId == qboCustomerId, ct);

        if (mapping is null) return;

        payload.Ecf.Comprador = new CompradorPayload
        {
            Rnc = mapping.Rnc,
            RazonSocial = mapping.RazonSocialDgii,
            Provincia = mapping.ProvinciaDgiiId,
            Municipio = mapping.MunicipioDgiiId
        };
    }

    // ─────────────────────────────────────────────────────────────────
    //  Cycle 3 – Proveedor (purchase e-CFs)
    // ─────────────────────────────────────────────────────────────────

    private async Task<VendorMapping?> ApplyProveedorAsync(
        AlanubePayload payload, Guid companyId, JsonElement root, CancellationToken ct)
    {
        var qboVendorId = ExtractRef(root, "VendorRef");
        if (qboVendorId is null) return null;

        var mapping = await _db.VendorMappings
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.CompanyId == companyId && m.QboVendorId == qboVendorId, ct);

        if (mapping is null) return null;

        // For purchase documents the vendor appears in the "comprador" slot
        // (Alanube uses the same structure for the counterparty)
        payload.Ecf.Comprador = new CompradorPayload
        {
            Rnc = mapping.Rnc,
            RazonSocial = mapping.RazonSocialDgii,
            Provincia = mapping.ProvinciaDgiiId,
            Municipio = mapping.MunicipioDgiiId
        };

        return mapping;
    }

    // ─────────────────────────────────────────────────────────────────
    //  Cycle 4 + 5 – Tax mapping & Line items
    // ─────────────────────────────────────────────────────────────────

    private (List<ItemPayload> Items, List<TaxLineResult> TaxLines, decimal TotalDiscount) BuildLineItems(
        JsonElement root,
        EcfType ecfType,
        FiscalSettings fiscal,
        Dictionary<string, TaxCodeMapping> taxCodeMap,
        Dictionary<string, ItemOverride> itemOverrideMap)
    {
        var items = new List<ItemPayload>();
        var taxLines = new List<TaxLineResult>();

        // Determine global discount from QBO (DiscountAmt at document level)
        var globalDiscount = TryGetDecimal(root, "DiscountAmt");

        // Extract QBO line items
        var qboLines = ExtractLines(root);
        if (qboLines.Count == 0)
            return (items, taxLines, 0m);

        // ── Distribute global discount proportionally across lines ────
        var lineAmounts = qboLines.Select(l => new LineItemAmount(
            l.LineNum.ToString(),
            l.Amount)).ToList();

        var distributed = globalDiscount > 0
            ? _discountDistributor.Distribute(globalDiscount, lineAmounts)
            : null;

        var distributedLookup = distributed?.ToDictionary(d => d.ItemId);

        var lineNumber = 0;
        foreach (var qboLine in qboLines)
        {
            lineNumber++;

            // ── Cycle 4: Resolve billing indicator ───────────────────
            var billing = ResolveBillingIndicator(
                ecfType, qboLine.TaxCodeId, taxCodeMap, fiscal);

            // ── Cycle 5: Item overrides ──────────────────────────────
            var unitMeasure = fiscal.DefaultUnitMeasure ?? 43; // 43 = "Unidad" default
            var goodService = (int)(fiscal.DefaultGoodServiceIndicator ?? GoodServiceIndicator.Service);

            if (qboLine.ItemId is not null && itemOverrideMap.TryGetValue(qboLine.ItemId, out var itemOvr))
            {
                if (itemOvr.UnitMeasureOverride.HasValue)
                    unitMeasure = itemOvr.UnitMeasureOverride.Value;
                if (itemOvr.GoodServiceIndicatorOverride.HasValue)
                    goodService = (int)itemOvr.GoodServiceIndicatorOverride.Value;
            }

            // ── Compute line amount after discount ───────────────────
            var lineAmount = qboLine.Amount;
            decimal? discountAmount = null;

            if (distributedLookup is not null &&
                distributedLookup.TryGetValue(qboLine.LineNum.ToString(), out var disc))
            {
                lineAmount = disc.NetAmount;
                if (disc.DiscountAmount > 0)
                    discountAmount = disc.DiscountAmount;
            }

            // ── Tax calculation (NEVER use QBO tax) ──────────────────
            var quantity = qboLine.Quantity > 0 ? qboLine.Quantity : 1;
            var unitPrice = quantity > 0 ? Math.Round(lineAmount / quantity, 2) : lineAmount;
            var taxResult = _taxCalculator.CalculateLineItem(unitPrice, quantity, billing);
            taxLines.Add(taxResult);

            items.Add(new ItemPayload
            {
                NumeroLinea = lineNumber,
                IndicadorFacturacion = (int)billing,
                NombreItem = qboLine.Description ?? $"Line {lineNumber}",
                IndicadorBienOServicio = goodService,
                CantidadItem = quantity,
                PrecioUnitarioItem = unitPrice,
                DescuentoMonto = discountAmount,
                MontoItem = taxResult.SubTotal,
                UnidadMedida = unitMeasure
            });
        }

        return (items, taxLines, globalDiscount);
    }

    /// <summary>
    /// Resolves the billing indicator for a line item. Forced overrides (by ecfType) take
    /// precedence, then the TaxCodeMapping, then the FiscalSettings default.
    /// </summary>
    private static BillingIndicator ResolveBillingIndicator(
        EcfType ecfType,
        string? qboTaxCodeId,
        Dictionary<string, TaxCodeMapping> taxCodeMap,
        FiscalSettings fiscal)
    {
        // Forced overrides per e-CF type
        if (ForcedBillingOverrides.TryGetValue(ecfType, out var forced))
            return forced;

        // Mapped tax code
        if (qboTaxCodeId is not null && taxCodeMap.TryGetValue(qboTaxCodeId, out var mapping))
            return mapping.BillingIndicator;

        // FiscalSettings default for lines with no tax code
        return fiscal.DefaultNoTaxCodeBillingIndicator ?? BillingIndicator.Itbis18;
    }

    // ─────────────────────────────────────────────────────────────────
    //  Subtotales
    // ─────────────────────────────────────────────────────────────────

    private static SubtotalesPayload BuildSubtotales(List<ItemPayload> items, List<TaxLineResult> taxLines)
    {
        var sub = new SubtotalesPayload();
        decimal exento = 0m;

        for (var i = 0; i < items.Count; i++)
        {
            var billing = (BillingIndicator)items[i].IndicadorFacturacion;
            var amount = taxLines[i].SubTotal;
            var tax = taxLines[i].TaxAmount;

            switch (billing)
            {
                case BillingIndicator.Itbis18:
                    sub.MontoGravado18 += amount;
                    sub.Itbis18 += tax;
                    break;
                case BillingIndicator.Itbis16:
                    sub.MontoGravado16 += amount;
                    sub.Itbis16 += tax;
                    break;
                case BillingIndicator.Itbis0:
                    sub.MontoGravado0 += amount;
                    sub.Itbis0 += tax;
                    break;
                case BillingIndicator.Special:
                    sub.MontoGravado0 += amount;
                    break;
                default:
                    exento += amount;
                    break;
            }
        }

        sub.MontoExento = exento;
        return sub;
    }

    // ─────────────────────────────────────────────────────────────────
    //  Totales
    // ─────────────────────────────────────────────────────────────────

    private static void BuildTotales(AlanubePayload payload, TaxDocumentResult docTotals, decimal totalDiscount)
    {
        var t = payload.Ecf.Totales;
        var s = payload.Ecf.Subtotales!;

        t.MontoGravadoTotal = s.MontoGravado18 + s.MontoGravado16 + s.MontoGravado0;
        t.MontoGravadoI1 = s.MontoGravado18;
        t.MontoGravadoI2 = s.MontoGravado16;
        t.MontoGravadoI3 = s.MontoGravado0;
        t.MontoExento = s.MontoExento;

        t.TotalItbis = docTotals.TotalTaxAmount;
        t.TotalItbis18 = docTotals.TotalTax18;
        t.TotalItbis16 = docTotals.TotalTax16;
        t.TotalItbis0 = docTotals.TotalTax0;

        t.MontoTotal = docTotals.GrandTotal;
        t.TotalDescuento = totalDiscount;
    }

    // ─────────────────────────────────────────────────────────────────
    //  Retentions (E41)
    // ─────────────────────────────────────────────────────────────────

    private void ApplyRetentions(AlanubePayload payload, TaxDocumentResult docTotals, VendorMapping vendor)
    {
        var retItbisRate = vendor.RetentionItbisRate ?? 0m;
        var retIsrRate = vendor.RetentionIsrRate ?? 0m;

        if (retItbisRate == 0m && retIsrRate == 0m) return;

        var retention = _retentionCalculator.CalculateRetentions(
            docTotals.SubTotal, docTotals.TotalTaxAmount, retItbisRate, retIsrRate);

        payload.Ecf.OtrosImpuestos = new OtrosImpuestosPayload
        {
            ItbisRetenido = retention.ItbisRetention,
            IsrRetenido = retention.IsrRetention
        };

        payload.Ecf.Totales.ItbisRetenido = retention.ItbisRetention;
        payload.Ecf.Totales.IsrRetenido = retention.IsrRetention;
        payload.Ecf.Totales.TotalRetenido = retention.TotalRetention;
    }

    // ─────────────────────────────────────────────────────────────────
    //  DB helpers
    // ─────────────────────────────────────────────────────────────────

    private async Task<FiscalSettings> GetFiscalSettingsAsync(Guid companyId, CancellationToken ct)
    {
        var fiscal = await _db.FiscalSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.CompanyId == companyId, ct);

        return fiscal ?? throw new InvalidOperationException(
            $"FiscalSettings not found for company {companyId}. Complete onboarding before emitting.");
    }

    private async Task<Dictionary<string, TaxCodeMapping>> LoadTaxCodeMapAsync(Guid companyId, CancellationToken ct)
    {
        var list = await _db.TaxCodeMappings
            .AsNoTracking()
            .Where(t => t.CompanyId == companyId)
            .ToListAsync(ct);

        return list.ToDictionary(t => t.QboTaxCodeId);
    }

    private async Task<Dictionary<string, ItemOverride>> LoadItemOverridesAsync(Guid companyId, CancellationToken ct)
    {
        var list = await _db.ItemOverrides
            .AsNoTracking()
            .Where(o => o.CompanyId == companyId)
            .ToListAsync(ct);

        return list.ToDictionary(o => o.QboItemId);
    }

    // ─────────────────────────────────────────────────────────────────
    //  QBO JSON extraction helpers
    // ─────────────────────────────────────────────────────────────────

    private static string? ExtractDate(JsonElement root, string property)
    {
        if (root.TryGetProperty(property, out var val))
            return val.GetString();
        return null;
    }

    private static string? ExtractRef(JsonElement root, string refName)
    {
        if (root.TryGetProperty(refName, out var refObj) &&
            refObj.TryGetProperty("value", out var val))
        {
            return val.GetString();
        }
        return null;
    }

    private static decimal TryGetDecimal(JsonElement root, string property)
    {
        if (root.TryGetProperty(property, out var val))
        {
            if (val.ValueKind == JsonValueKind.Number)
                return val.GetDecimal();
            if (val.ValueKind == JsonValueKind.String && decimal.TryParse(val.GetString(), out var parsed))
                return parsed;
        }
        return 0m;
    }

    private static List<QboLineInfo> ExtractLines(JsonElement root)
    {
        var result = new List<QboLineInfo>();

        if (!root.TryGetProperty("Line", out var lines) || lines.ValueKind != JsonValueKind.Array)
            return result;

        var lineNum = 0;
        foreach (var line in lines.EnumerateArray())
        {
            // Skip sub-total and discount lines that QBO includes
            var detailType = line.TryGetProperty("DetailType", out var dt) ? dt.GetString() : null;
            if (detailType is "SubTotalLineDetail" or "DiscountLineDetail")
                continue;

            lineNum++;

            var amount = TryGetDecimalFromElement(line, "Amount");
            if (amount == 0m) continue;

            string? description = line.TryGetProperty("Description", out var desc) ? desc.GetString() : null;
            string? itemId = null;
            string? taxCodeId = null;
            int quantity = 1;
            decimal unitPrice = amount;

            // SalesItemLineDetail (invoices) or ItemBasedExpenseLineDetail (bills)
            JsonElement detail = default;
            var hasDetail = false;

            if (detailType == "SalesItemLineDetail" && line.TryGetProperty("SalesItemLineDetail", out detail))
                hasDetail = true;
            else if (detailType == "ItemBasedExpenseLineDetail" && line.TryGetProperty("ItemBasedExpenseLineDetail", out detail))
                hasDetail = true;
            else if (detailType == "AccountBasedExpenseLineDetail" && line.TryGetProperty("AccountBasedExpenseLineDetail", out detail))
                hasDetail = true;

            if (hasDetail)
            {
                // Item reference
                if (detail.TryGetProperty("ItemRef", out var itemRef) &&
                    itemRef.TryGetProperty("value", out var itemVal))
                {
                    itemId = itemVal.GetString();
                }

                // Tax code
                if (detail.TryGetProperty("TaxCodeRef", out var taxRef) &&
                    taxRef.TryGetProperty("value", out var taxVal))
                {
                    taxCodeId = taxVal.GetString();
                }

                // Quantity
                if (detail.TryGetProperty("Qty", out var qty) && qty.ValueKind == JsonValueKind.Number)
                {
                    var rawQty = qty.GetDecimal();
                    quantity = rawQty >= 1 ? (int)rawQty : 1;
                }

                // Unit price
                if (detail.TryGetProperty("UnitPrice", out var up) && up.ValueKind == JsonValueKind.Number)
                {
                    unitPrice = up.GetDecimal();
                }
            }

            result.Add(new QboLineInfo(lineNum, amount, description, itemId, taxCodeId, quantity, unitPrice));
        }

        return result;
    }

    private static decimal TryGetDecimalFromElement(JsonElement el, string property)
    {
        if (el.TryGetProperty(property, out var val))
        {
            if (val.ValueKind == JsonValueKind.Number)
                return val.GetDecimal();
            if (val.ValueKind == JsonValueKind.String && decimal.TryParse(val.GetString(), out var p))
                return p;
        }
        return 0m;
    }

    // ─────────────────────────────────────────────────────────────────
    //  Internal model for parsed QBO line data
    // ─────────────────────────────────────────────────────────────────

    private record QboLineInfo(
        int LineNum,
        decimal Amount,
        string? Description,
        string? ItemId,
        string? TaxCodeId,
        int Quantity,
        decimal UnitPrice);
}
