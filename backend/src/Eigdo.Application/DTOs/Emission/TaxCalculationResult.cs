namespace Eigdo.Application.DTOs.Emission;

/// <summary>
/// Aggregated ITBIS calculation result for an entire document.
/// All amounts are recalculated server-side; QBO tax amounts are never used.
/// </summary>
public class TaxCalculationResult
{
    public decimal SubTotal { get; set; }
    public decimal Itbis18Amount { get; set; }
    public decimal Itbis16Amount { get; set; }
    public decimal Itbis0Amount { get; set; }
    public decimal ExemptAmount { get; set; }
    public decimal TotalItbis { get; set; }
    public decimal TotalAmount { get; set; }
}
