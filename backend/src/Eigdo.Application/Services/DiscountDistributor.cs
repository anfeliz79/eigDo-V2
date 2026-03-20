using Eigdo.Application.DTOs.Emission;

namespace Eigdo.Application.Services;

/// <summary>
/// QBO can have a global DiscountLine at the document level.
/// DGII requires discounts to be distributed per line item.
/// This service distributes a global discount proportionally across line items.
/// </summary>
public class DiscountDistributor
{
    /// <summary>
    /// Distributes a global discount across line items proportionally by amount.
    /// Supports both fixed-amount and percent-based discounts.
    /// Mutates the DiscountAmount and NetAmount properties on each LineItemDto.
    /// </summary>
    public List<LineItemDto> DistributeDiscount(
        List<LineItemDto> items,
        decimal globalDiscountAmount,
        bool isPercentBased,
        decimal? discountPercent)
    {
        if (items.Count == 0)
            return items;

        // For percent-based discounts, compute the actual amount from the total
        var effectiveDiscount = globalDiscountAmount;
        if (isPercentBased && discountPercent.HasValue && discountPercent.Value > 0)
        {
            var total = items.Sum(i => i.Amount);
            effectiveDiscount = Math.Round(total * (discountPercent.Value / 100m), 2);
        }

        if (effectiveDiscount <= 0)
        {
            // No discount to distribute; ensure NetAmount is set
            foreach (var item in items)
            {
                item.DiscountAmount = 0m;
                item.NetAmount = item.Amount;
            }
            return items;
        }

        var total2 = items.Sum(i => i.Amount);

        if (total2 == 0m)
        {
            foreach (var item in items)
            {
                item.DiscountAmount = 0m;
                item.NetAmount = item.Amount;
            }
            return items;
        }

        var distributed = 0m;

        for (var i = 0; i < items.Count; i++)
        {
            var item = items[i];
            decimal discountAmount;

            if (i == items.Count - 1)
            {
                // Last item gets the remainder to avoid rounding drift
                discountAmount = effectiveDiscount - distributed;
            }
            else
            {
                discountAmount = Math.Round(item.Amount / total2 * effectiveDiscount, 2);
                distributed += discountAmount;
            }

            item.DiscountAmount = discountAmount;
            item.NetAmount = item.Amount - discountAmount;
        }

        return items;
    }

    /// <summary>
    /// Original distribute method for backward compatibility with existing callers.
    /// </summary>
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
