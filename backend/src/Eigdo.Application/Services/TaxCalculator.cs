using Eigdo.Domain.Enums;
using Eigdo.SharedKernel.Constants;

namespace Eigdo.Application.Services;

public class TaxCalculator
{
    public TaxLineResult CalculateLineItem(decimal unitPrice, int quantity, BillingIndicator billing)
    {
        var subTotal = Math.Round(unitPrice * quantity, 2);

        var taxRate = billing switch
        {
            BillingIndicator.Itbis18 => DgiiConstants.Itbis18Rate,
            BillingIndicator.Itbis16 => DgiiConstants.Itbis16Rate,
            BillingIndicator.Itbis0 => DgiiConstants.Itbis0Rate,
            BillingIndicator.NonBillable => 0m,
            BillingIndicator.Special => 0m,
            _ => 0m
        };

        var taxAmount = Math.Round(subTotal * taxRate, 2);
        var total = subTotal + taxAmount;

        return new TaxLineResult(subTotal, taxRate, taxAmount, total);
    }

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
}

public record TaxLineResult(decimal SubTotal, decimal TaxRate, decimal TaxAmount, decimal Total);

public record TaxDocumentResult(
    decimal SubTotal,
    decimal TotalTax18,
    decimal TotalTax16,
    decimal TotalTax0,
    decimal TotalTaxAmount,
    decimal GrandTotal);
