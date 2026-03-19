using Eigdo.Application.Services;

namespace Eigdo.FiscalTests;

public class RetentionCalculatorTests
{
    private readonly RetentionCalculator _sut = new();

    [Fact]
    public void CalculateRetentions_StandardRates_ReturnsCorrectAmounts()
    {
        // Taxable: 10,000 RD$, ITBIS: 1,800 RD$
        // ITBIS retention 30%, ISR retention 10%
        var result = _sut.CalculateRetentions(10000m, 1800m, 0.30m, 0.10m);

        Assert.Equal(540m, result.ItbisRetention);   // 1800 * 0.30
        Assert.Equal(1000m, result.IsrRetention);     // 10000 * 0.10
        Assert.Equal(1540m, result.TotalRetention);
    }

    [Fact]
    public void CalculateRetentions_ZeroRates_ReturnsZero()
    {
        var result = _sut.CalculateRetentions(5000m, 900m, 0m, 0m);

        Assert.Equal(0m, result.ItbisRetention);
        Assert.Equal(0m, result.IsrRetention);
        Assert.Equal(0m, result.TotalRetention);
    }

    [Fact]
    public void CalculateRetentions_OnlyItbisRetention()
    {
        var result = _sut.CalculateRetentions(8000m, 1440m, 0.30m, 0m);

        Assert.Equal(432m, result.ItbisRetention);  // 1440 * 0.30
        Assert.Equal(0m, result.IsrRetention);
        Assert.Equal(432m, result.TotalRetention);
    }

    [Fact]
    public void CalculateRetentions_OnlyIsrRetention()
    {
        var result = _sut.CalculateRetentions(15000m, 2700m, 0m, 0.05m);

        Assert.Equal(0m, result.ItbisRetention);
        Assert.Equal(750m, result.IsrRetention);   // 15000 * 0.05
        Assert.Equal(750m, result.TotalRetention);
    }

    [Fact]
    public void CalculateRetentions_100Percent_RetainsFullAmount()
    {
        var result = _sut.CalculateRetentions(5000m, 900m, 1.0m, 1.0m);

        Assert.Equal(900m, result.ItbisRetention);
        Assert.Equal(5000m, result.IsrRetention);
        Assert.Equal(5900m, result.TotalRetention);
    }

    [Fact]
    public void CalculateRetentions_RoundsTo2Decimals()
    {
        // 1000 * 0.33 = 330, 333.33 * 0.33 = 109.9989 → 110.00
        var result = _sut.CalculateRetentions(1000m, 333.33m, 0.33m, 0.07m);

        Assert.Equal(110.00m, result.ItbisRetention); // 333.33 * 0.33 = 109.9989 → 110.00
        Assert.Equal(70m, result.IsrRetention);        // 1000 * 0.07 = 70
    }
}
