using Eigdo.Application.Services;

namespace Eigdo.FiscalTests;

public class DiscountDistributorTests
{
    private readonly DiscountDistributor _sut = new();

    [Fact]
    public void Distribute_ProportionalToAmounts()
    {
        var items = new List<LineItemAmount>
        {
            new("1", 100m),
            new("2", 200m),
            new("3", 300m),
        };

        var result = _sut.Distribute(60m, items);

        Assert.Equal(3, result.Count);
        Assert.Equal(10m, result[0].DiscountAmount);   // 100/600 * 60 = 10
        Assert.Equal(20m, result[1].DiscountAmount);   // 200/600 * 60 = 20
        Assert.Equal(30m, result[2].DiscountAmount);   // 300/600 * 60 = 30 (remainder)

        // Net amounts
        Assert.Equal(90m, result[0].NetAmount);
        Assert.Equal(180m, result[1].NetAmount);
        Assert.Equal(270m, result[2].NetAmount);
    }

    [Fact]
    public void Distribute_LastItemGetsRemainder_NoRoundingDrift()
    {
        var items = new List<LineItemAmount>
        {
            new("1", 100m),
            new("2", 100m),
            new("3", 100m),
        };

        // 10 / 3 = 3.33 + 3.33 + 3.34 (remainder correction)
        var result = _sut.Distribute(10m, items);

        var totalDiscount = result.Sum(r => r.DiscountAmount);
        Assert.Equal(10m, totalDiscount); // Must sum exactly to original discount

        Assert.Equal(3.33m, result[0].DiscountAmount);
        Assert.Equal(3.33m, result[1].DiscountAmount);
        Assert.Equal(3.34m, result[2].DiscountAmount); // Remainder
    }

    [Fact]
    public void Distribute_SingleItem_GetsFullDiscount()
    {
        var items = new List<LineItemAmount> { new("1", 500m) };

        var result = _sut.Distribute(50m, items);

        Assert.Single(result);
        Assert.Equal(50m, result[0].DiscountAmount);
        Assert.Equal(450m, result[0].NetAmount);
    }

    [Fact]
    public void Distribute_EmptyList_ReturnsEmpty()
    {
        var result = _sut.Distribute(100m, new List<LineItemAmount>());

        Assert.Empty(result);
    }

    [Fact]
    public void Distribute_ZeroTotal_ReturnsZeroDiscounts()
    {
        var items = new List<LineItemAmount>
        {
            new("1", 0m),
            new("2", 0m),
        };

        var result = _sut.Distribute(50m, items);

        Assert.Equal(2, result.Count);
        Assert.Equal(0m, result[0].DiscountAmount);
        Assert.Equal(0m, result[1].DiscountAmount);
    }

    [Fact]
    public void Distribute_ZeroDiscount_ReturnsOriginalAmounts()
    {
        var items = new List<LineItemAmount>
        {
            new("1", 100m),
            new("2", 200m),
        };

        var result = _sut.Distribute(0m, items);

        Assert.Equal(100m, result[0].NetAmount);
        Assert.Equal(200m, result[1].NetAmount);
        Assert.Equal(0m, result[0].DiscountAmount);
    }

    [Fact]
    public void Distribute_LargeAmounts_MaintainsPrecision()
    {
        var items = new List<LineItemAmount>
        {
            new("1", 1_000_000m),
            new("2", 2_000_000m),
            new("3", 3_000_000m),
        };

        var result = _sut.Distribute(150_000m, items);

        var totalDiscount = result.Sum(r => r.DiscountAmount);
        Assert.Equal(150_000m, totalDiscount);

        Assert.Equal(25_000m, result[0].DiscountAmount);
        Assert.Equal(50_000m, result[1].DiscountAmount);
        Assert.Equal(75_000m, result[2].DiscountAmount);
    }
}
