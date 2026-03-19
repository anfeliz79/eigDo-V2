namespace Eigdo.Application.Services;

public class DiscountDistributor
{
    public List<DistributedDiscount> Distribute(decimal globalDiscount, List<LineItemAmount> items)
    {
        if (items.Count == 0)
            return new List<DistributedDiscount>();

        var total = items.Sum(i => i.Amount);

        if (total == 0m)
        {
            return items.Select(i => new DistributedDiscount(i.ItemId, i.Amount, 0m, i.Amount)).ToList();
        }

        var results = new List<DistributedDiscount>();
        var distributed = 0m;

        for (var i = 0; i < items.Count; i++)
        {
            var item = items[i];
            decimal discountAmount;

            if (i == items.Count - 1)
            {
                // Last item gets the remainder to avoid rounding drift
                discountAmount = globalDiscount - distributed;
            }
            else
            {
                discountAmount = Math.Round(item.Amount / total * globalDiscount, 2);
                distributed += discountAmount;
            }

            var netAmount = item.Amount - discountAmount;
            results.Add(new DistributedDiscount(item.ItemId, item.Amount, discountAmount, netAmount));
        }

        return results;
    }
}

public record LineItemAmount(string ItemId, decimal Amount);

public record DistributedDiscount(string ItemId, decimal OriginalAmount, decimal DiscountAmount, decimal NetAmount);
