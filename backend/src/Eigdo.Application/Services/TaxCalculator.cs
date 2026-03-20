using Eigdo.Application.DTOs.Emission;
using Eigdo.Domain.Enums;
using Eigdo.SharedKernel.Constants;

namespace Eigdo.Application.Services;

/// <summary>
/// Calculates ITBIS amounts server-side. NEVER reads tax amounts from QBO.
/// All tax computation is based on the BillingIndicator assigned during Cycle 4.
/// </summary>
public class TaxCalculator
{
    /// <summary>
    /// Calculates aggregated ITBIS totals for a complete document from its line items.
    /// Each line's BillingIndicator determines the applicable tax rate.
    /// </summary>
    public TaxCalculationResult Calculate(List<LineItemDto> items)
    {
        var result = new TaxCalculationResult();

        foreach (var item in items)
        {
            var lineAmount = item.NetAmount > 0 ? item.NetAmount : item.Amount;
            var rate = GetRate(item.BillingIndicator);
            var tax = Math.Round(lineAmount * rate, 2);

            result.SubTotal += lineAmount;

            switch (item.BillingIndicator)
            {
                case BillingIndicator.Itbis18:
                    result.Itbis18Amount += tax;
                    break;
                case BillingIndicator.Itbis16:
                    result.Itbis16Amount += tax;
                    break;
                case BillingIndicator.Itbis0:
                case BillingIndicator.Special:
                    result.Itbis0Amount += tax;
                    break;
                case BillingIndicator.NonBillable:
                default:
                    result.ExemptAmount += lineAmount;
                    break;
            }
        }

        result.TotalItbis = result.Itbis18Amount + result.Itbis16Amount + result.Itbis0Amount;
        result.TotalAmount = result.SubTotal + result.TotalItbis;

        return result;
    }

    /// <summary>
    /// Calculates tax for a single line item (used during Cycle 5 line building).
    /// </summary>
    public TaxLineResult CalculateLineItem(decimal unitPrice, int quantity, BillingIndicator billing)
    {
        var subTotal = Math.Round(unitPrice * quantity, 2);
        var taxRate = GetRate(billing);
        var taxAmount = Math.Round(subTotal * taxRate, 2);
        var total = subTotal + taxAmount;

        return new TaxLineResult(subTotal, taxRate, taxAmount, total);
    }

    /// <summary>
    /// Aggregates individual line results into document-level totals.
    /// </summary>
    public TaxDocumentResult CalculateDocumentTotals(List<TaxLineResult> lines)
    {
        var subTotal = 0m;
        var totalTax18 = 0m;
        var totalTax16 = 0m;
        var totalTax0 = 0m;

        foreach (var line in lines)
        {
            subTotal += line.SubTotal;

            if (line.TaxRate == DgiiConstants.Itbis18Rate)
                totalTax18 += line.TaxAmount;
            else if (line.TaxRate == DgiiConstants.Itbis16Rate)
                totalTax16 += line.TaxAmount;
            else
                totalTax0 += line.TaxAmount;
        }

        var totalTaxAmount = totalTax18 + totalTax16 + totalTax0;
        var grandTotal = subTotal + totalTaxAmount;

        return new TaxDocumentResult(subTotal, totalTax18, totalTax16, totalTax0, totalTaxAmount, grandTotal);
    }

    private static decimal GetRate(BillingIndicator billing) => billing switch
    {
        BillingIndicator.Itbis18 => DgiiConstants.Itbis18Rate,
        BillingIndicator.Itbis16 => DgiiConstants.Itbis16Rate,
        BillingIndicator.Itbis0 => DgiiConstants.Itbis0Rate,
        BillingIndicator.NonBillable => 0m,
        BillingIndicator.Special => 0m,
        _ => 0m
    };
}

public record TaxLineResult(decimal SubTotal, decimal TaxRate, decimal TaxAmount, decimal Total);

public record TaxDocumentResult(
    decimal SubTotal,
    decimal TotalTax18,
    decimal TotalTax16,
    decimal TotalTax0,
    decimal TotalTaxAmount,
    decimal GrandTotal);
