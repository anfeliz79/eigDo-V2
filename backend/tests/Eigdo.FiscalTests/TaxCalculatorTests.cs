using Eigdo.Application.Services;
using Eigdo.Domain.Enums;

namespace Eigdo.FiscalTests;

public class TaxCalculatorTests
{
    private readonly TaxCalculator _sut = new();

    // ── CalculateLineItem ───────────────────────────────

    [Fact]
    public void CalculateLineItem_Itbis18_ReturnsCorrectTax()
    {
        var result = _sut.CalculateLineItem(100m, 1, BillingIndicator.Itbis18);

        Assert.Equal(100m, result.SubTotal);
        Assert.Equal(0.18m, result.TaxRate);
        Assert.Equal(18m, result.TaxAmount);
        Assert.Equal(118m, result.Total);
    }

    [Fact]
    public void CalculateLineItem_Itbis16_ReturnsCorrectTax()
    {
        var result = _sut.CalculateLineItem(200m, 2, BillingIndicator.Itbis16);

        Assert.Equal(400m, result.SubTotal);
        Assert.Equal(0.16m, result.TaxRate);
        Assert.Equal(64m, result.TaxAmount);
        Assert.Equal(464m, result.Total);
    }

    [Fact]
    public void CalculateLineItem_Itbis0_ReturnsZeroTax()
    {
        var result = _sut.CalculateLineItem(500m, 1, BillingIndicator.Itbis0);

        Assert.Equal(500m, result.SubTotal);
        Assert.Equal(0m, result.TaxRate);
        Assert.Equal(0m, result.TaxAmount);
        Assert.Equal(500m, result.Total);
    }

    [Fact]
    public void CalculateLineItem_NonBillable_ReturnsZeroTax()
    {
        var result = _sut.CalculateLineItem(1000m, 1, BillingIndicator.NonBillable);

        Assert.Equal(1000m, result.SubTotal);
        Assert.Equal(0m, result.TaxAmount);
    }

    [Fact]
    public void CalculateLineItem_Special_ReturnsZeroTax()
    {
        var result = _sut.CalculateLineItem(750m, 1, BillingIndicator.Special);

        Assert.Equal(750m, result.SubTotal);
        Assert.Equal(0m, result.TaxAmount);
    }

    [Fact]
    public void CalculateLineItem_MultipleQuantity_CalculatesSubtotalCorrectly()
    {
        var result = _sut.CalculateLineItem(33.33m, 3, BillingIndicator.Itbis18);

        Assert.Equal(99.99m, result.SubTotal);
        Assert.Equal(18.00m, result.TaxAmount); // 99.99 * 0.18 = 17.9982 → 18.00
    }

    [Fact]
    public void CalculateLineItem_RoundsTo2Decimals()
    {
        // 99.99 * 0.18 = 17.9982 should round to 18.00
        var result = _sut.CalculateLineItem(99.99m, 1, BillingIndicator.Itbis18);

        Assert.Equal(18.00m, result.TaxAmount);
    }

    // ── CalculateDocumentTotals ─────────────────────────

    [Fact]
    public void CalculateDocumentTotals_MixedRates_SumsCorrectly()
    {
        var lines = new List<TaxLineResult>
        {
            new(100m, 0.18m, 18m, 118m),     // ITBIS 18%
            new(200m, 0.16m, 32m, 232m),     // ITBIS 16%
            new(300m, 0m, 0m, 300m),          // Exento
        };

        var result = _sut.CalculateDocumentTotals(lines);

        Assert.Equal(600m, result.SubTotal);
        Assert.Equal(18m, result.TotalTax18);
        Assert.Equal(32m, result.TotalTax16);
        Assert.Equal(0m, result.TotalTax0);
        Assert.Equal(50m, result.TotalTaxAmount);
        Assert.Equal(650m, result.GrandTotal);
    }

    [Fact]
    public void CalculateDocumentTotals_EmptyList_ReturnsZeros()
    {
        var result = _sut.CalculateDocumentTotals(new List<TaxLineResult>());

        Assert.Equal(0m, result.SubTotal);
        Assert.Equal(0m, result.TotalTaxAmount);
        Assert.Equal(0m, result.GrandTotal);
    }

    [Fact]
    public void CalculateDocumentTotals_AllItbis18_AggregatesCorrectly()
    {
        var lines = new List<TaxLineResult>
        {
            new(1000m, 0.18m, 180m, 1180m),
            new(500m, 0.18m, 90m, 590m),
        };

        var result = _sut.CalculateDocumentTotals(lines);

        Assert.Equal(1500m, result.SubTotal);
        Assert.Equal(270m, result.TotalTax18);
        Assert.Equal(0m, result.TotalTax16);
        Assert.Equal(270m, result.TotalTaxAmount);
        Assert.Equal(1770m, result.GrandTotal);
    }
}
