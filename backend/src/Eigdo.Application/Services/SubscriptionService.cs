using Eigdo.Application.DTOs.Billing;
using Eigdo.Application.Interfaces;
using Eigdo.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Eigdo.Application.Services;

public class SubscriptionService
{
    private readonly IEigdoDbContext _db;

    public SubscriptionService(IEigdoDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Get the active subscription for a company. Returns null if no active subscription.
    /// </summary>
    public async Task<SubscriptionDto?> GetActiveSubscriptionAsync(Guid companyId, CancellationToken ct = default)
    {
        var subscription = await _db.Subscriptions
            .Include(s => s.Plan)
            .Include(s => s.Price)
            .Include(s => s.BillingAccount)
            .Where(s => s.BillingAccount.CompanyId == companyId
                && (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trial))
            .FirstOrDefaultAsync(ct);

        if (subscription == null) return null;

        return new SubscriptionDto
        {
            Id = subscription.Id,
            PlanName = subscription.Plan.Name,
            Status = subscription.Status.ToString(),
            StartDateUtc = subscription.StartDateUtc,
            EndDateUtc = subscription.EndDateUtc,
            CurrentPeriodStartUtc = subscription.CurrentPeriodStartUtc,
            CurrentPeriodEndUtc = subscription.CurrentPeriodEndUtc,
            DocumentsEmittedThisPeriod = subscription.DocumentsEmittedThisPeriod,
            IncludedDocumentsPerMonth = subscription.Plan.IncludedDocumentsPerMonth,
            Gateway = subscription.Gateway.ToString(),
            PriceAmount = subscription.Price.Amount,
            PriceInterval = subscription.Price.Interval
        };
    }

    /// <summary>
    /// Check if the company can emit a document (has active subscription + within limits).
    /// </summary>
    public async Task<(bool CanEmit, string? Reason)> CanEmitDocumentAsync(Guid companyId, CancellationToken ct = default)
    {
        var subscription = await _db.Subscriptions
            .Include(s => s.Plan)
            .Include(s => s.BillingAccount)
            .Where(s => s.BillingAccount.CompanyId == companyId
                && (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trial))
            .FirstOrDefaultAsync(ct);

        if (subscription == null)
            return (false, "No tienes una suscripcion activa. Adquiere un plan para emitir e-CF.");

        if (subscription.Status == SubscriptionStatus.PastDue)
            return (false, "Tu suscripcion tiene un pago pendiente. Actualiza tu metodo de pago.");

        if (subscription.CurrentPeriodEndUtc < DateTime.UtcNow)
            return (false, "El periodo actual de tu suscripcion ha expirado.");

        if (subscription.DocumentsEmittedThisPeriod >= subscription.Plan.IncludedDocumentsPerMonth)
            return (false, $"Has alcanzado el limite de {subscription.Plan.IncludedDocumentsPerMonth} e-CF para este periodo. Actualiza tu plan para continuar.");

        return (true, null);
    }

    /// <summary>
    /// Increment the document emission counter for the current period.
    /// </summary>
    public async Task IncrementEmissionCounterAsync(Guid companyId, CancellationToken ct = default)
    {
        var subscription = await _db.Subscriptions
            .Include(s => s.BillingAccount)
            .Where(s => s.BillingAccount.CompanyId == companyId
                && (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trial))
            .FirstOrDefaultAsync(ct);

        if (subscription != null)
        {
            subscription.DocumentsEmittedThisPeriod++;
            await _db.SaveChangesAsync(ct);
        }
    }

    /// <summary>
    /// Get billing history for a company.
    /// </summary>
    public async Task<List<PaymentHistoryDto>> GetPaymentHistoryAsync(Guid companyId, int limit = 20, CancellationToken ct = default)
    {
        var billingAccount = await _db.BillingAccounts
            .FirstOrDefaultAsync(ba => ba.CompanyId == companyId, ct);

        if (billingAccount == null) return new();

        return await _db.PaymentTransactions
            .Where(pt => pt.BillingAccountId == billingAccount.Id)
            .OrderByDescending(pt => pt.CreatedAtUtc)
            .Take(limit)
            .Select(pt => new PaymentHistoryDto
            {
                Id = pt.Id,
                Amount = pt.Amount,
                Currency = pt.Currency,
                Status = pt.Status,
                Gateway = pt.Gateway.ToString(),
                CreatedAtUtc = pt.CreatedAtUtc
            })
            .ToListAsync(ct);
    }
}

public class PaymentHistoryDto
{
    public Guid Id { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Gateway { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
}
