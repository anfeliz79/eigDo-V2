namespace Eigdo.Application.Services;

/// <summary>
/// Calculates ITBIS and ISR retentions for E41 (purchases from vendors).
/// Retention rates are configured per-vendor in VendorMapping.
/// </summary>
public class RetentionCalculator
{
    /// <summary>
    /// Calculates retention amounts given total ITBIS, total amount, and vendor rates.
    /// </summary>
    public RetentionResult Calculate(
        decimal totalItbis,
        decimal totalAmount,
        decimal retentionItbisRate,
        decimal retentionIsrRate)
    {
        var itbisRetained = Math.Round(totalItbis * retentionItbisRate, 2);
        var isrRetained = Math.Round(totalAmount * retentionIsrRate, 2);
        var totalRetained = itbisRetained + isrRetained;

        return new RetentionResult
        {
            ItbisRetained = itbisRetained,
            IsrRetained = isrRetained,
            TotalRetained = totalRetained
        };
    }

    /// <summary>
    /// Original method for backward compatibility with EmissionOrchestrator / PayloadTransformer.
    /// </summary>
    public RetentionResultRecord CalculateRetentions(
        decimal taxableAmount, decimal itbisAmount,
        decimal retentionItbisRate, decimal retentionIsrRate)
    {
        var itbisRetention = Math.Round(itbisAmount * retentionItbisRate, 2);
        var isrRetention = Math.Round(taxableAmount * retentionIsrRate, 2);
        var totalRetention = itbisRetention + isrRetention;

        return new RetentionResultRecord(itbisRetention, isrRetention, totalRetention);
    }
}

/// <summary>
/// Retention result with settable properties (spec-compliant shape).
/// </summary>
public class RetentionResult
{
    public decimal ItbisRetained { get; set; }
    public decimal IsrRetained { get; set; }
    public decimal TotalRetained { get; set; }
}

/// <summary>
/// Record-based retention result for backward compatibility with PayloadTransformer.
/// </summary>
public record RetentionResultRecord(decimal ItbisRetention, decimal IsrRetention, decimal TotalRetention);
