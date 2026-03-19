namespace Eigdo.Application.Services;

public class RetentionCalculator
{
    public RetentionResult CalculateRetentions(
        decimal taxableAmount, decimal itbisAmount,
        decimal retentionItbisRate, decimal retentionIsrRate)
    {
        var itbisRetention = Math.Round(itbisAmount * retentionItbisRate, 2);
        var isrRetention = Math.Round(taxableAmount * retentionIsrRate, 2);
        var totalRetention = itbisRetention + isrRetention;

        return new RetentionResult(itbisRetention, isrRetention, totalRetention);
    }
}

public record RetentionResult(decimal ItbisRetention, decimal IsrRetention, decimal TotalRetention);
