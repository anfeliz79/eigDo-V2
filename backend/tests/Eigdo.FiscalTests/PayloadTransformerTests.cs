using System.Text.Json;
using Eigdo.Application.Interfaces;
using Eigdo.Application.Services;
using Eigdo.Domain.Entities.Fiscal;
using Eigdo.Domain.Entities.Mapping;
using Eigdo.Domain.Enums;
using MockQueryable.Moq;
using Moq;

namespace Eigdo.FiscalTests;

public class PayloadTransformerTests
{
    private readonly Guid _companyId = Guid.NewGuid();
    private readonly Mock<IEigdoDbContext> _dbMock;
    private readonly PayloadTransformer _sut;

    private readonly FiscalSettings _defaultFiscal;

    public PayloadTransformerTests()
    {
        _dbMock = new Mock<IEigdoDbContext>();

        _defaultFiscal = new FiscalSettings
        {
            CompanyId = _companyId,
            Rnc = "131000000",
            RazonSocial = "Test Company SRL",
            NombreComercial = "TestCo",
            Direccion = "Calle 1",
            ProvinciaDgiiId = 1,
            MunicipioDgiiId = 10,
            Telefono = "8095551234",
            Email = "test@test.com",
            DefaultIncomeType = IncomeType.NonFinancialOperations,
            DefaultUnitMeasure = 43,
            DefaultGoodServiceIndicator = GoodServiceIndicator.Service,
            TaxAmountIndicator = 0,
            DefaultNoTaxCodeBillingIndicator = BillingIndicator.Itbis18,
        };

        _sut = new PayloadTransformer(
            _dbMock.Object,
            new TaxCalculator(),
            new RetentionCalculator(),
            new DiscountDistributor());
    }

    private void SetupFiscalSettings(FiscalSettings? fiscal = null)
    {
        var settings = new List<FiscalSettings> { fiscal ?? _defaultFiscal };
        _dbMock.Setup(x => x.FiscalSettings).Returns(settings.AsQueryable().BuildMockDbSet().Object);
    }

    private void SetupCustomerMappings(params CustomerMapping[] mappings)
    {
        _dbMock.Setup(x => x.CustomerMappings).Returns(mappings.AsQueryable().BuildMockDbSet().Object);
    }

    private void SetupVendorMappings(params VendorMapping[] mappings)
    {
        _dbMock.Setup(x => x.VendorMappings).Returns(mappings.AsQueryable().BuildMockDbSet().Object);
    }

    private void SetupTaxCodeMappings(params TaxCodeMapping[] mappings)
    {
        _dbMock.Setup(x => x.TaxCodeMappings).Returns(mappings.AsQueryable().BuildMockDbSet().Object);
    }

    private void SetupItemOverrides(params ItemOverride[] overrides)
    {
        _dbMock.Setup(x => x.ItemOverrides).Returns(overrides.AsQueryable().BuildMockDbSet().Object);
    }

    private void SetupEmptyMappings()
    {
        SetupCustomerMappings();
        SetupVendorMappings();
        SetupTaxCodeMappings();
        SetupItemOverrides();
    }

    private static string BuildQboInvoiceJson(
        string customerId = "42",
        string txnDate = "2026-03-19",
        decimal? discountAmt = null,
        params (string? itemId, string? taxCodeId, decimal amount, int qty, decimal unitPrice, string desc)[] lines)
    {
        var lineArray = new List<object>();
        foreach (var (itemId, taxCodeId, amount, qty, unitPrice, desc) in lines)
        {
            var detail = new Dictionary<string, object>();
            if (itemId != null) detail["ItemRef"] = new { value = itemId };
            if (taxCodeId != null) detail["TaxCodeRef"] = new { value = taxCodeId };
            detail["Qty"] = qty;
            detail["UnitPrice"] = unitPrice;

            lineArray.Add(new
            {
                Amount = amount,
                Description = desc,
                DetailType = "SalesItemLineDetail",
                SalesItemLineDetail = detail
            });
        }

        var doc = new Dictionary<string, object>
        {
            ["TxnDate"] = txnDate,
            ["CustomerRef"] = new { value = customerId },
            ["Line"] = lineArray,
        };

        if (discountAmt.HasValue)
            doc["DiscountAmt"] = discountAmt.Value;

        return JsonSerializer.Serialize(doc);
    }

    private static string BuildQboBillJson(
        string vendorId = "99",
        string txnDate = "2026-03-19",
        params (string? itemId, string? taxCodeId, decimal amount, int qty, decimal unitPrice, string desc)[] lines)
    {
        var lineArray = new List<object>();
        foreach (var (itemId, taxCodeId, amount, qty, unitPrice, desc) in lines)
        {
            var detail = new Dictionary<string, object>();
            if (itemId != null) detail["ItemRef"] = new { value = itemId };
            if (taxCodeId != null) detail["TaxCodeRef"] = new { value = taxCodeId };
            detail["Qty"] = qty;
            detail["UnitPrice"] = unitPrice;

            lineArray.Add(new
            {
                Amount = amount,
                Description = desc,
                DetailType = "ItemBasedExpenseLineDetail",
                ItemBasedExpenseLineDetail = detail
            });
        }

        return JsonSerializer.Serialize(new
        {
            TxnDate = txnDate,
            VendorRef = new { value = vendorId },
            Line = lineArray,
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Cycle 1: Emisor
    // ═══════════════════════════════════════════════════════════════════

    [Fact]
    public async Task Transform_E32_SetsEmisorFromFiscalSettings()
    {
        SetupFiscalSettings();
        SetupEmptyMappings();

        var json = BuildQboInvoiceJson(lines: ("item1", "tax1", 100m, 1, 100m, "Widget"));
        var result = await _sut.TransformAsync(_companyId, EcfType.E32, json);

        Assert.Equal("131000000", result.Ecf.Emisor.Rnc);
        Assert.Equal("Test Company SRL", result.Ecf.Emisor.RazonSocial);
        Assert.Equal("TestCo", result.Ecf.Emisor.NombreComercial);
        Assert.Equal("Calle 1", result.Ecf.Emisor.Direccion);
        Assert.Equal(1, result.Ecf.Emisor.Provincia);
        Assert.Equal(10, result.Ecf.Emisor.Municipio);
        Assert.Equal("8095551234", result.Ecf.Emisor.Telefono);
        Assert.Equal("test@test.com", result.Ecf.Emisor.Correo);
    }

    [Fact]
    public async Task Transform_E32_SetsEncabezado()
    {
        SetupFiscalSettings();
        SetupEmptyMappings();

        var json = BuildQboInvoiceJson(txnDate: "2026-06-15", lines: ("item1", null, 100m, 1, 100m, "Widget"));
        var result = await _sut.TransformAsync(_companyId, EcfType.E32, json);

        Assert.Equal("E32", result.Ecf.Encabezado.TipoEcf);
        Assert.Equal("2026-06-15", result.Ecf.Encabezado.FechaEmision);
        Assert.Equal("01", result.Ecf.Encabezado.TipoIngreso);
    }

    [Fact]
    public async Task Transform_ThrowsWhenFiscalSettingsMissing()
    {
        var emptyFiscal = new List<FiscalSettings>();
        _dbMock.Setup(x => x.FiscalSettings).Returns(emptyFiscal.AsQueryable().BuildMockDbSet().Object);
        SetupEmptyMappings();

        var json = BuildQboInvoiceJson(lines: ("item1", null, 100m, 1, 100m, "Widget"));
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.TransformAsync(_companyId, EcfType.E32, json));
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Cycle 2: Comprador (customer mapping for sales)
    // ═══════════════════════════════════════════════════════════════════

    [Fact]
    public async Task Transform_E31_SetsCompradorFromCustomerMapping()
    {
        SetupFiscalSettings();
        SetupCustomerMappings(new CustomerMapping
        {
            CompanyId = _companyId,
            QboCustomerId = "42",
            QboDisplayName = "Acme Corp",
            Rnc = "999888777",
            RazonSocialDgii = "Acme Dominicana SRL",
            TipoComprobante = EcfType.E31,
            ProvinciaDgiiId = 2,
            MunicipioDgiiId = 20,
        });
        SetupVendorMappings();
        SetupTaxCodeMappings();
        SetupItemOverrides();

        var json = BuildQboInvoiceJson(customerId: "42", lines: ("item1", null, 1000m, 1, 1000m, "Service"));
        var result = await _sut.TransformAsync(_companyId, EcfType.E31, json);

        Assert.NotNull(result.Ecf.Comprador);
        Assert.Equal("999888777", result.Ecf.Comprador!.Rnc);
        Assert.Equal("Acme Dominicana SRL", result.Ecf.Comprador.RazonSocial);
        Assert.Equal(2, result.Ecf.Comprador.Provincia);
        Assert.Equal(20, result.Ecf.Comprador.Municipio);
    }

    [Fact]
    public async Task Transform_E32_NoCompradorWhenCustomerNotMapped()
    {
        SetupFiscalSettings();
        SetupCustomerMappings(); // Empty
        SetupVendorMappings();
        SetupTaxCodeMappings();
        SetupItemOverrides();

        var json = BuildQboInvoiceJson(lines: ("item1", null, 100m, 1, 100m, "Widget"));
        var result = await _sut.TransformAsync(_companyId, EcfType.E32, json);

        // Comprador should be null (no mapping found for customerRef "42")
        Assert.Null(result.Ecf.Comprador);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Cycle 3: Proveedor (vendor mapping for purchases)
    // ═══════════════════════════════════════════════════════════════════

    [Fact]
    public async Task Transform_E41_SetsCompradorFromVendorMapping()
    {
        SetupFiscalSettings();
        SetupCustomerMappings();
        SetupVendorMappings(new VendorMapping
        {
            CompanyId = _companyId,
            QboVendorId = "99",
            QboDisplayName = "Supplier Inc",
            Rnc = "111222333",
            RazonSocialDgii = "Supplier SRL",
            TipoComprobante = EcfType.E41,
            ProvinciaDgiiId = 3,
            MunicipioDgiiId = 30,
            RetentionItbisRate = 0.30m,
            RetentionIsrRate = 0.10m,
        });
        SetupTaxCodeMappings();
        SetupItemOverrides();

        var json = BuildQboBillJson(vendorId: "99", lines: ("item1", null, 5000m, 1, 5000m, "Office supplies"));
        var result = await _sut.TransformAsync(_companyId, EcfType.E41, json);

        Assert.NotNull(result.Ecf.Comprador);
        Assert.Equal("111222333", result.Ecf.Comprador!.Rnc);
        Assert.Equal("Supplier SRL", result.Ecf.Comprador.RazonSocial);
    }

    [Fact]
    public async Task Transform_E41_AppliesRetentions()
    {
        SetupFiscalSettings();
        SetupCustomerMappings();
        SetupVendorMappings(new VendorMapping
        {
            CompanyId = _companyId,
            QboVendorId = "99",
            QboDisplayName = "Supplier",
            Rnc = "111222333",
            RazonSocialDgii = "Supplier SRL",
            TipoComprobante = EcfType.E41,
            RetentionItbisRate = 0.30m,
            RetentionIsrRate = 0.10m,
        });
        SetupTaxCodeMappings(new TaxCodeMapping
        {
            CompanyId = _companyId,
            QboTaxCodeId = "TAX18",
            QboTaxCodeName = "ITBIS 18%",
            BillingIndicator = BillingIndicator.Itbis18,
        });
        SetupItemOverrides();

        var json = BuildQboBillJson(vendorId: "99", lines: ("item1", "TAX18", 10000m, 1, 10000m, "Consulting"));
        var result = await _sut.TransformAsync(_companyId, EcfType.E41, json);

        // Should have retentions applied
        Assert.NotNull(result.Ecf.OtrosImpuestos);
        Assert.True(result.Ecf.OtrosImpuestos!.ItbisRetenido > 0);
        Assert.True(result.Ecf.OtrosImpuestos.IsrRetenido > 0);
        Assert.True(result.Ecf.Totales.TotalRetenido > 0);
    }

    [Fact]
    public async Task Transform_E32_DoesNotApplyRetentions()
    {
        SetupFiscalSettings();
        SetupCustomerMappings();
        SetupVendorMappings();
        SetupTaxCodeMappings();
        SetupItemOverrides();

        var json = BuildQboInvoiceJson(lines: ("item1", null, 100m, 1, 100m, "Widget"));
        var result = await _sut.TransformAsync(_companyId, EcfType.E32, json);

        // E32 (Consumo) should NOT have retentions
        Assert.Null(result.Ecf.OtrosImpuestos);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Cycle 4: Tax / Billing Indicator
    // ═══════════════════════════════════════════════════════════════════

    [Fact]
    public async Task Transform_E31_UsesTaxCodeMappingForBillingIndicator()
    {
        SetupFiscalSettings();
        SetupCustomerMappings();
        SetupVendorMappings();
        SetupTaxCodeMappings(new TaxCodeMapping
        {
            CompanyId = _companyId,
            QboTaxCodeId = "TAX18",
            QboTaxCodeName = "ITBIS 18%",
            BillingIndicator = BillingIndicator.Itbis18,
        });
        SetupItemOverrides();

        var json = BuildQboInvoiceJson(lines: ("item1", "TAX18", 1000m, 2, 500m, "Product A"));
        var result = await _sut.TransformAsync(_companyId, EcfType.E31, json);

        var item = result.Ecf.DetallesItems.Item.First();
        Assert.Equal(1, item.IndicadorFacturacion); // BillingIndicator.Itbis18 = 1
    }

    [Theory]
    [InlineData(EcfType.E43, 4)] // E43 → Special (forced)
    [InlineData(EcfType.E44, 4)] // E44 → Special (forced)
    [InlineData(EcfType.E46, 3)] // E46 → Itbis0 (forced)
    [InlineData(EcfType.E47, 4)] // E47 → Special (forced)
    public async Task Transform_ForcedBillingIndicatorOverrides(EcfType ecfType, int expectedIndicator)
    {
        SetupFiscalSettings();
        SetupCustomerMappings(new CustomerMapping
        {
            CompanyId = _companyId,
            QboCustomerId = "42",
            Rnc = "999888777",
            RazonSocialDgii = "Test",
        });
        SetupVendorMappings(new VendorMapping
        {
            CompanyId = _companyId,
            QboVendorId = "99",
            Rnc = "111222333",
            RazonSocialDgii = "Vendor",
        });
        // Map tax code to Itbis18 — should be OVERRIDDEN by forced override
        SetupTaxCodeMappings(new TaxCodeMapping
        {
            CompanyId = _companyId,
            QboTaxCodeId = "TAX18",
            BillingIndicator = BillingIndicator.Itbis18,
        });
        SetupItemOverrides();

        // Use appropriate JSON based on purchase vs sales
        var isPurchase = ecfType == EcfType.E41 || ecfType == EcfType.E43 || ecfType == EcfType.E47;
        var json = isPurchase
            ? BuildQboBillJson(lines: ("item1", "TAX18", 1000m, 1, 1000m, "Item"))
            : BuildQboInvoiceJson(lines: ("item1", "TAX18", 1000m, 1, 1000m, "Item"));

        var result = await _sut.TransformAsync(_companyId, ecfType, json);

        var item = result.Ecf.DetallesItems.Item.First();
        Assert.Equal(expectedIndicator, item.IndicadorFacturacion);
    }

    [Fact]
    public async Task Transform_DefaultBillingIndicator_WhenNoTaxCodeMapped()
    {
        var fiscal = new FiscalSettings
        {
            CompanyId = _companyId,
            Rnc = "131000000",
            RazonSocial = "Test",
            DefaultNoTaxCodeBillingIndicator = BillingIndicator.Itbis0,
            DefaultUnitMeasure = 43,
            DefaultGoodServiceIndicator = GoodServiceIndicator.Service,
        };
        SetupFiscalSettings(fiscal);
        SetupEmptyMappings();

        // Line without TaxCodeRef
        var json = BuildQboInvoiceJson(lines: ("item1", null, 500m, 1, 500m, "Widget"));
        var result = await _sut.TransformAsync(_companyId, EcfType.E32, json);

        var item = result.Ecf.DetallesItems.Item.First();
        Assert.Equal(3, item.IndicadorFacturacion); // BillingIndicator.Itbis0 = 3
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Cycle 5: Item Overrides
    // ═══════════════════════════════════════════════════════════════════

    [Fact]
    public async Task Transform_ItemOverride_AppliesUnitMeasure()
    {
        SetupFiscalSettings();
        SetupCustomerMappings();
        SetupVendorMappings();
        SetupTaxCodeMappings();
        SetupItemOverrides(new ItemOverride
        {
            CompanyId = _companyId,
            QboItemId = "item1",
            QboItemName = "Custom Item",
            UnitMeasureOverride = 99,
            GoodServiceIndicatorOverride = GoodServiceIndicator.Good,
        });

        var json = BuildQboInvoiceJson(lines: ("item1", null, 200m, 2, 100m, "Custom Item"));
        var result = await _sut.TransformAsync(_companyId, EcfType.E32, json);

        var item = result.Ecf.DetallesItems.Item.First();
        Assert.Equal(99, item.UnidadMedida);
        Assert.Equal(1, item.IndicadorBienOServicio); // Good = 1
    }

    [Fact]
    public async Task Transform_NoOverride_UsesDefaultsFromFiscalSettings()
    {
        var fiscal = new FiscalSettings
        {
            CompanyId = _companyId,
            Rnc = "131000000",
            RazonSocial = "Test",
            DefaultUnitMeasure = 55,
            DefaultGoodServiceIndicator = GoodServiceIndicator.Good,
        };
        SetupFiscalSettings(fiscal);
        SetupEmptyMappings();

        var json = BuildQboInvoiceJson(lines: ("item1", null, 300m, 3, 100m, "Product"));
        var result = await _sut.TransformAsync(_companyId, EcfType.E32, json);

        var item = result.Ecf.DetallesItems.Item.First();
        Assert.Equal(55, item.UnidadMedida);
        Assert.Equal(1, item.IndicadorBienOServicio); // Good = 1
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Tax Calculations (NEVER use QBO tax)
    // ═══════════════════════════════════════════════════════════════════

    [Fact]
    public async Task Transform_CalculatesItbis18Correctly()
    {
        SetupFiscalSettings();
        SetupCustomerMappings();
        SetupVendorMappings();
        SetupTaxCodeMappings(new TaxCodeMapping
        {
            CompanyId = _companyId,
            QboTaxCodeId = "TAX18",
            BillingIndicator = BillingIndicator.Itbis18,
        });
        SetupItemOverrides();

        var json = BuildQboInvoiceJson(lines: ("item1", "TAX18", 1000m, 1, 1000m, "Product"));
        var result = await _sut.TransformAsync(_companyId, EcfType.E31, json);

        Assert.Equal(1000m, result.Ecf.Subtotales!.MontoGravado18);
        Assert.Equal(180m, result.Ecf.Subtotales.Itbis18);
        Assert.Equal(180m, result.Ecf.Totales.TotalItbis);
        Assert.Equal(1180m, result.Ecf.Totales.MontoTotal);
    }

    [Fact]
    public async Task Transform_MixedTaxRates_CalculatesSubtotalesCorrectly()
    {
        SetupFiscalSettings();
        SetupCustomerMappings();
        SetupVendorMappings();
        SetupTaxCodeMappings(
            new TaxCodeMapping
            {
                CompanyId = _companyId,
                QboTaxCodeId = "TAX18",
                BillingIndicator = BillingIndicator.Itbis18,
            },
            new TaxCodeMapping
            {
                CompanyId = _companyId,
                QboTaxCodeId = "TAX16",
                BillingIndicator = BillingIndicator.Itbis16,
            },
            new TaxCodeMapping
            {
                CompanyId = _companyId,
                QboTaxCodeId = "TAX0",
                BillingIndicator = BillingIndicator.Itbis0,
            });
        SetupItemOverrides();

        var json = BuildQboInvoiceJson("42", "2026-03-19", null,
            ("item1", "TAX18", 1000m, 1, 1000m, "Product A"),
            ("item2", "TAX16", 500m, 1, 500m, "Product B"),
            ("item3", "TAX0", 200m, 1, 200m, "Product C"));

        var result = await _sut.TransformAsync(_companyId, EcfType.E31, json);

        Assert.Equal(1000m, result.Ecf.Subtotales!.MontoGravado18);
        Assert.Equal(180m, result.Ecf.Subtotales.Itbis18);
        Assert.Equal(500m, result.Ecf.Subtotales!.MontoGravado16);
        Assert.Equal(80m, result.Ecf.Subtotales.Itbis16);
        Assert.Equal(200m, result.Ecf.Subtotales!.MontoGravado0);
        Assert.Equal(0m, result.Ecf.Subtotales.Itbis0);

        var expectedTotal = 1000m + 180m + 500m + 80m + 200m;
        Assert.Equal(expectedTotal, result.Ecf.Totales.MontoTotal);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Discounts
    // ═══════════════════════════════════════════════════════════════════

    [Fact]
    public async Task Transform_GlobalDiscount_DistributedProportionally()
    {
        SetupFiscalSettings();
        SetupEmptyMappings();

        var json = BuildQboInvoiceJson("42", "2026-03-19", 30m,
            ("item1", null, 100m, 1, 100m, "Product A"),
            ("item2", null, 200m, 1, 200m, "Product B"));

        var result = await _sut.TransformAsync(_companyId, EcfType.E32, json);

        Assert.Equal(30m, result.Ecf.Totales.TotalDescuento);
        Assert.NotNull(result.Ecf.DescuentosORecargos);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  Line items
    // ═══════════════════════════════════════════════════════════════════

    [Fact]
    public async Task Transform_MultipleLines_CorrectLineNumbers()
    {
        SetupFiscalSettings();
        SetupEmptyMappings();

        var json = BuildQboInvoiceJson("42", "2026-03-19", null,
            ("item1", null, 100m, 2, 50m, "Widget A"),
            ("item2", null, 300m, 3, 100m, "Widget B"));

        var result = await _sut.TransformAsync(_companyId, EcfType.E32, json);

        Assert.Equal(2, result.Ecf.DetallesItems.Item.Count);
        Assert.Equal(1, result.Ecf.DetallesItems.Item[0].NumeroLinea);
        Assert.Equal(2, result.Ecf.DetallesItems.Item[1].NumeroLinea);
        Assert.Equal("Widget A", result.Ecf.DetallesItems.Item[0].NombreItem);
        Assert.Equal("Widget B", result.Ecf.DetallesItems.Item[1].NombreItem);
        Assert.Equal(2, result.Ecf.DetallesItems.Item[0].CantidadItem);
        Assert.Equal(3, result.Ecf.DetallesItems.Item[1].CantidadItem);
    }

    [Fact]
    public async Task Transform_Paginacion_AlwaysSet()
    {
        SetupFiscalSettings();
        SetupEmptyMappings();

        var json = BuildQboInvoiceJson(lines: ("item1", null, 100m, 1, 100m, "Widget"));
        var result = await _sut.TransformAsync(_companyId, EcfType.E32, json);

        Assert.NotNull(result.Ecf.Paginacion);
        Assert.Equal(1, result.Ecf.Paginacion!.Pagina);
        Assert.Equal(1, result.Ecf.Paginacion.TotalPaginas);
    }

    // ═══════════════════════════════════════════════════════════════════
    //  E-CF type-specific behavior
    // ═══════════════════════════════════════════════════════════════════

    [Theory]
    [InlineData(EcfType.E31)]
    [InlineData(EcfType.E32)]
    [InlineData(EcfType.E34)]
    [InlineData(EcfType.E44)]
    [InlineData(EcfType.E45)]
    [InlineData(EcfType.E46)]
    public async Task Transform_SalesEcfTypes_AttemptCustomerMapping(EcfType ecfType)
    {
        SetupFiscalSettings();
        SetupCustomerMappings(new CustomerMapping
        {
            CompanyId = _companyId,
            QboCustomerId = "42",
            Rnc = "999888777",
            RazonSocialDgii = "Customer SRL",
        });
        SetupVendorMappings();
        SetupTaxCodeMappings();
        SetupItemOverrides();

        var json = BuildQboInvoiceJson(customerId: "42", lines: ("item1", null, 100m, 1, 100m, "Item"));
        var result = await _sut.TransformAsync(_companyId, ecfType, json);

        // All sales types should attempt customer mapping
        Assert.NotNull(result.Ecf.Comprador);
        Assert.Equal("999888777", result.Ecf.Comprador!.Rnc);
    }

    [Theory]
    [InlineData(EcfType.E41)]
    [InlineData(EcfType.E43)]
    [InlineData(EcfType.E47)]
    public async Task Transform_PurchaseEcfTypes_AttemptVendorMapping(EcfType ecfType)
    {
        SetupFiscalSettings();
        SetupCustomerMappings();
        SetupVendorMappings(new VendorMapping
        {
            CompanyId = _companyId,
            QboVendorId = "99",
            Rnc = "111222333",
            RazonSocialDgii = "Vendor SRL",
        });
        SetupTaxCodeMappings();
        SetupItemOverrides();

        var json = BuildQboBillJson(vendorId: "99", lines: ("item1", null, 100m, 1, 100m, "Item"));
        var result = await _sut.TransformAsync(_companyId, ecfType, json);

        Assert.NotNull(result.Ecf.Comprador);
        Assert.Equal("111222333", result.Ecf.Comprador!.Rnc);
    }
}
