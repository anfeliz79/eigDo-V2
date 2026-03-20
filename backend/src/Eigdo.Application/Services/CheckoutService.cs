using Eigdo.Application.DTOs.Billing;
using Eigdo.Application.Interfaces;
using Eigdo.Domain.Entities.Billing;
using Eigdo.Domain.Enums;
using Eigdo.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Eigdo.Application.Services;

public class CheckoutService
{
    private readonly IEigdoDbContext _db;
    private readonly IConfiguration _config;
    private readonly IAuditService _audit;

    public CheckoutService(IEigdoDbContext db, IConfiguration config, IAuditService audit)
    {
        _db = db;
        _config = config;
        _audit = audit;
    }

    /// <summary>
    /// Get all active plans with their prices.
    /// </summary>
    public async Task<List<PlanDto>> GetPlansAsync(CancellationToken ct = default)
    {
        var plans = await _db.Plans
            .Where(p => p.IsActive)
            .Include(p => p.Prices.Where(pr => pr.IsActive))
            .OrderBy(p => p.SortOrder)
            .ToListAsync(ct);

        return plans.Select(p => new PlanDto
        {
            Id = p.Id,
            Name = p.Name,
            Description = p.Description,
            IncludedDocumentsPerMonth = p.IncludedDocumentsPerMonth,
            SortOrder = p.SortOrder,
            Prices = p.Prices.Select(pr => new PriceDto
            {
                Id = pr.Id,
                Amount = pr.Amount,
                Currency = pr.Currency,
                Interval = pr.Interval
            }).ToList()
        }).ToList();
    }

    /// <summary>
    /// Create a Stripe Checkout Session for the company to purchase a plan.
    /// </summary>
    public async Task<(CheckoutSessionDto? Session, string? Error)> CreateCheckoutSessionAsync(
        Guid companyId, Guid userId, CreateCheckoutRequest request, CancellationToken ct = default)
    {
        // Verify the price exists and is active
        var price = await _db.Prices
            .Include(p => p.Plan)
            .FirstOrDefaultAsync(p => p.Id == request.PriceId && p.IsActive, ct);

        if (price == null)
            return (null, "Precio no encontrado o inactivo.");

        if (!price.Plan.IsActive)
            return (null, "Plan no disponible.");

        // Check if company already has an active subscription
        var billingAccount = await _db.BillingAccounts
            .Include(ba => ba.Subscriptions)
            .FirstOrDefaultAsync(ba => ba.CompanyId == companyId, ct);

        if (billingAccount == null)
            return (null, "Cuenta de facturacion no encontrada.");

        var activeSubscription = billingAccount.Subscriptions
            .FirstOrDefault(s => s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trial);

        if (activeSubscription != null)
            return (null, "Ya tienes una suscripcion activa. Cancela primero la actual para cambiar de plan.");

        var stripeSecretKey = _config.GetValue<string>("STRIPE_SECRET_KEY");
        var appUrl = _config.GetValue<string>("APP_URL") ?? "http://localhost:3002";

        // ── SANDBOX MODE: simulate checkout when Stripe is not configured ──
        if (string.IsNullOrEmpty(stripeSecretKey))
        {
            return await SimulateSandboxCheckoutAsync(companyId, userId, billingAccount, price, appUrl, ct);
        }

        // ── PRODUCTION: real Stripe Checkout ──
        Stripe.StripeConfiguration.ApiKey = stripeSecretKey;

        // Ensure we have a Stripe customer for this billing account
        if (string.IsNullOrEmpty(billingAccount.StripeCustomerId))
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
            var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == companyId, ct);

            var customerService = new Stripe.CustomerService();
            var customer = await customerService.CreateAsync(new Stripe.CustomerCreateOptions
            {
                Email = user?.Email,
                Name = company?.Name,
                Metadata = new Dictionary<string, string>
                {
                    { "companyId", companyId.ToString() },
                    { "billingAccountId", billingAccount.Id.ToString() }
                }
            }, cancellationToken: ct);

            billingAccount.StripeCustomerId = customer.Id;
            await _db.SaveChangesAsync(ct);
        }

        // Ensure the Price has a Stripe price ID
        if (string.IsNullOrEmpty(price.StripeId))
        {
            var stripePriceService = new Stripe.PriceService();
            var stripeProductService = new Stripe.ProductService();

            var product = await stripeProductService.CreateAsync(new Stripe.ProductCreateOptions
            {
                Name = $"eigdo - {price.Plan.Name}",
                Description = price.Plan.Description ?? $"Plan {price.Plan.Name} - {price.Plan.IncludedDocumentsPerMonth} e-CF/mes",
                Metadata = new Dictionary<string, string>
                {
                    { "planId", price.PlanId.ToString() }
                }
            }, cancellationToken: ct);

            var stripePrice = await stripePriceService.CreateAsync(new Stripe.PriceCreateOptions
            {
                Product = product.Id,
                UnitAmount = (long)(price.Amount * 100),
                Currency = price.Currency.ToLower(),
                Recurring = new Stripe.PriceRecurringOptions
                {
                    Interval = price.Interval == "yearly" ? "year" : "month"
                }
            }, cancellationToken: ct);

            price.StripeId = stripePrice.Id;
            await _db.SaveChangesAsync(ct);
        }

        // Create Stripe Checkout Session
        var successUrl = request.SuccessUrl ?? $"{appUrl}/billing/success?session_id={{CHECKOUT_SESSION_ID}}";
        var cancelUrl = request.CancelUrl ?? $"{appUrl}/billing/cancelled";

        var sessionService = new Stripe.Checkout.SessionService();
        var session = await sessionService.CreateAsync(new Stripe.Checkout.SessionCreateOptions
        {
            Customer = billingAccount.StripeCustomerId,
            Mode = "subscription",
            PaymentMethodTypes = new List<string> { "card" },
            LineItems = new List<Stripe.Checkout.SessionLineItemOptions>
            {
                new()
                {
                    Price = price.StripeId,
                    Quantity = 1
                }
            },
            SuccessUrl = successUrl,
            CancelUrl = cancelUrl,
            Metadata = new Dictionary<string, string>
            {
                { "companyId", companyId.ToString() },
                { "billingAccountId", billingAccount.Id.ToString() },
                { "planId", price.PlanId.ToString() },
                { "priceId", price.Id.ToString() }
            }
        }, cancellationToken: ct);

        // Save checkout session to DB
        var checkoutSession = new CheckoutSession
        {
            UserId = userId,
            PlanId = price.PlanId,
            PriceId = price.Id,
            Gateway = PaymentGateway.Stripe,
            GatewaySessionId = session.Id,
            Status = "pending",
            Email = session.CustomerDetails?.Email,
            ExpiresUtc = DateTime.UtcNow.AddMinutes(30)
        };

        _db.CheckoutSessions.Add(checkoutSession);
        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(companyId, userId, "checkout.created", "CheckoutSession", checkoutSession.Id.ToString(), ct: ct);

        return (new CheckoutSessionDto
        {
            SessionId = session.Id,
            Url = session.Url
        }, null);
    }

    /// <summary>
    /// SANDBOX MODE: Simulates checkout by creating subscription directly.
    /// Used when STRIPE_SECRET_KEY is not configured (development/testing).
    /// </summary>
    private async Task<(CheckoutSessionDto? Session, string? Error)> SimulateSandboxCheckoutAsync(
        Guid companyId, Guid userId, BillingAccount billingAccount, Price price, string appUrl, CancellationToken ct)
    {
        var now = DateTime.UtcNow;

        // Create subscription directly (simulating successful payment)
        var subscription = new Subscription
        {
            BillingAccountId = billingAccount.Id,
            PlanId = price.PlanId,
            PriceId = price.Id,
            Status = SubscriptionStatus.Active,
            StartDateUtc = now,
            CurrentPeriodStartUtc = now,
            CurrentPeriodEndUtc = price.Interval == "yearly" ? now.AddYears(1) : now.AddMonths(1),
            StripeSubscriptionId = $"sandbox_sub_{Guid.NewGuid():N}",
            Gateway = PaymentGateway.Stripe,
            DocumentsEmittedThisPeriod = 0
        };

        _db.Subscriptions.Add(subscription);

        // Record simulated payment transaction
        var transaction = new PaymentTransaction
        {
            BillingAccountId = billingAccount.Id,
            Amount = price.Amount,
            Currency = price.Currency,
            Status = "succeeded",
            Gateway = PaymentGateway.Stripe,
            GatewayTransactionId = $"sandbox_pi_{Guid.NewGuid():N}",
            GatewayResponse = "sandbox_simulated"
        };

        _db.PaymentTransactions.Add(transaction);

        // Save checkout session record
        var sandboxSessionId = $"sandbox_cs_{Guid.NewGuid():N}";
        var checkoutSession = new CheckoutSession
        {
            UserId = userId,
            PlanId = price.PlanId,
            PriceId = price.Id,
            Gateway = PaymentGateway.Stripe,
            GatewaySessionId = sandboxSessionId,
            Status = "completed",
            ExpiresUtc = now.AddMinutes(30)
        };

        _db.CheckoutSessions.Add(checkoutSession);
        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(companyId, userId, "checkout.sandbox_completed", "Subscription", subscription.Id.ToString(), ct: ct);

        // Redirect directly to success page (skip Stripe)
        var successUrl = $"{appUrl}/billing/success?session_id={sandboxSessionId}&sandbox=true";

        return (new CheckoutSessionDto
        {
            SessionId = sandboxSessionId,
            Url = successUrl
        }, null);
    }

    /// <summary>
    /// Handle Stripe webhook events for checkout and subscription lifecycle.
    /// </summary>
    public async Task HandleStripeWebhookAsync(string json, string signature, CancellationToken ct = default)
    {
        var webhookSecret = _config.GetValue<string>("STRIPE_WEBHOOK_SECRET")
            ?? throw new InvalidOperationException("STRIPE_WEBHOOK_SECRET not configured");

        var stripeEvent = Stripe.EventUtility.ConstructEvent(json, signature, webhookSecret);

        switch (stripeEvent.Type)
        {
            case "checkout.session.completed":
                await HandleCheckoutCompleted(stripeEvent, ct);
                break;

            case "invoice.paid":
                await HandleInvoicePaid(stripeEvent, ct);
                break;

            case "invoice.payment_failed":
                await HandleInvoicePaymentFailed(stripeEvent, ct);
                break;

            case "customer.subscription.updated":
                await HandleSubscriptionUpdated(stripeEvent, ct);
                break;

            case "customer.subscription.deleted":
                await HandleSubscriptionDeleted(stripeEvent, ct);
                break;
        }
    }

    private async Task HandleCheckoutCompleted(Stripe.Event stripeEvent, CancellationToken ct)
    {
        var session = stripeEvent.Data.Object as Stripe.Checkout.Session;
        if (session == null) return;

        // Update our checkout session
        var checkoutSession = await _db.CheckoutSessions
            .FirstOrDefaultAsync(cs => cs.GatewaySessionId == session.Id, ct);

        if (checkoutSession != null)
        {
            checkoutSession.Status = "completed";
        }

        // Parse metadata
        if (!session.Metadata.TryGetValue("billingAccountId", out var billingAccountIdStr)) return;
        if (!Guid.TryParse(billingAccountIdStr, out var billingAccountId)) return;

        var billingAccount = await _db.BillingAccounts
            .Include(ba => ba.Subscriptions)
            .FirstOrDefaultAsync(ba => ba.Id == billingAccountId, ct);

        if (billingAccount == null) return;

        if (!session.Metadata.TryGetValue("planId", out var planIdStr) || !Guid.TryParse(planIdStr, out var planId)) return;
        if (!session.Metadata.TryGetValue("priceId", out var priceIdStr) || !Guid.TryParse(priceIdStr, out var priceId)) return;

        // Create subscription record
        var now = DateTime.UtcNow;
        var subscription = new Subscription
        {
            BillingAccountId = billingAccountId,
            PlanId = planId,
            PriceId = priceId,
            Status = SubscriptionStatus.Active,
            StartDateUtc = now,
            CurrentPeriodStartUtc = now,
            CurrentPeriodEndUtc = now.AddMonths(1),
            StripeSubscriptionId = session.SubscriptionId,
            Gateway = PaymentGateway.Stripe,
            DocumentsEmittedThisPeriod = 0
        };

        _db.Subscriptions.Add(subscription);
        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(billingAccount.CompanyId, null, "subscription.activated", "Subscription", subscription.Id.ToString(), ct: ct);
    }

    private async Task HandleInvoicePaid(Stripe.Event stripeEvent, CancellationToken ct)
    {
        var invoice = stripeEvent.Data.Object as Stripe.Invoice;
        if (invoice == null) return;

        var billingAccount = await _db.BillingAccounts
            .FirstOrDefaultAsync(ba => ba.StripeCustomerId == invoice.CustomerId, ct);

        if (billingAccount == null) return;

        // Record payment transaction
        var transaction = new PaymentTransaction
        {
            BillingAccountId = billingAccount.Id,
            Amount = (decimal)invoice.AmountPaid / 100m,
            Currency = invoice.Currency?.ToUpper() ?? "DOP",
            Status = "succeeded",
            Gateway = PaymentGateway.Stripe,
            GatewayTransactionId = invoice.PaymentIntentId ?? invoice.Id,
            GatewayResponse = invoice.Status
        };

        _db.PaymentTransactions.Add(transaction);

        // Reset period counter if this is a subscription renewal
        if (!string.IsNullOrEmpty(invoice.SubscriptionId))
        {
            var subscription = await _db.Subscriptions
                .FirstOrDefaultAsync(s => s.StripeSubscriptionId == invoice.SubscriptionId, ct);

            if (subscription != null)
            {
                subscription.Status = SubscriptionStatus.Active;
                subscription.DocumentsEmittedThisPeriod = 0;
                subscription.CurrentPeriodStartUtc = DateTime.UtcNow;
                subscription.CurrentPeriodEndUtc = DateTime.UtcNow.AddMonths(1);
            }
        }

        await _db.SaveChangesAsync(ct);
    }

    private async Task HandleInvoicePaymentFailed(Stripe.Event stripeEvent, CancellationToken ct)
    {
        var invoice = stripeEvent.Data.Object as Stripe.Invoice;
        if (invoice == null) return;

        var billingAccount = await _db.BillingAccounts
            .FirstOrDefaultAsync(ba => ba.StripeCustomerId == invoice.CustomerId, ct);

        if (billingAccount == null) return;

        // Record failed payment
        var transaction = new PaymentTransaction
        {
            BillingAccountId = billingAccount.Id,
            Amount = (decimal)invoice.AmountDue / 100m,
            Currency = invoice.Currency?.ToUpper() ?? "DOP",
            Status = "failed",
            Gateway = PaymentGateway.Stripe,
            GatewayTransactionId = invoice.PaymentIntentId ?? invoice.Id,
            GatewayResponse = invoice.Status
        };

        _db.PaymentTransactions.Add(transaction);

        // Mark subscription as past due
        if (!string.IsNullOrEmpty(invoice.SubscriptionId))
        {
            var subscription = await _db.Subscriptions
                .FirstOrDefaultAsync(s => s.StripeSubscriptionId == invoice.SubscriptionId, ct);

            if (subscription != null)
            {
                subscription.Status = SubscriptionStatus.PastDue;
            }
        }

        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(billingAccount.CompanyId, null, "payment.failed", "PaymentTransaction", transaction.Id.ToString(), ct: ct);
    }

    private async Task HandleSubscriptionUpdated(Stripe.Event stripeEvent, CancellationToken ct)
    {
        var stripeSubscription = stripeEvent.Data.Object as Stripe.Subscription;
        if (stripeSubscription == null) return;

        var subscription = await _db.Subscriptions
            .FirstOrDefaultAsync(s => s.StripeSubscriptionId == stripeSubscription.Id, ct);

        if (subscription == null) return;

        subscription.Status = stripeSubscription.Status switch
        {
            "active" => SubscriptionStatus.Active,
            "past_due" => SubscriptionStatus.PastDue,
            "canceled" => SubscriptionStatus.Cancelled,
            "unpaid" => SubscriptionStatus.PastDue,
            _ => subscription.Status
        };

        subscription.CurrentPeriodEndUtc = stripeSubscription.CurrentPeriodEnd;
        subscription.CurrentPeriodStartUtc = stripeSubscription.CurrentPeriodStart;

        await _db.SaveChangesAsync(ct);
    }

    private async Task HandleSubscriptionDeleted(Stripe.Event stripeEvent, CancellationToken ct)
    {
        var stripeSubscription = stripeEvent.Data.Object as Stripe.Subscription;
        if (stripeSubscription == null) return;

        var subscription = await _db.Subscriptions
            .FirstOrDefaultAsync(s => s.StripeSubscriptionId == stripeSubscription.Id, ct);

        if (subscription == null) return;

        subscription.Status = SubscriptionStatus.Cancelled;
        subscription.EndDateUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        var billingAccount = await _db.BillingAccounts
            .FirstOrDefaultAsync(ba => ba.Id == subscription.BillingAccountId, ct);

        if (billingAccount != null)
        {
            await _audit.LogAsync(billingAccount.CompanyId, null, "subscription.cancelled", "Subscription", subscription.Id.ToString(), ct: ct);
        }
    }

    /// <summary>
    /// Create a Stripe Billing Portal session for managing subscriptions.
    /// </summary>
    public async Task<(BillingPortalDto? Portal, string? Error)> CreateBillingPortalAsync(
        Guid companyId, CancellationToken ct = default)
    {
        var stripeSecretKey = _config.GetValue<string>("STRIPE_SECRET_KEY");
        if (string.IsNullOrEmpty(stripeSecretKey))
            return (null, "Stripe no esta configurado.");

        Stripe.StripeConfiguration.ApiKey = stripeSecretKey;

        var billingAccount = await _db.BillingAccounts
            .FirstOrDefaultAsync(ba => ba.CompanyId == companyId, ct);

        if (billingAccount == null || string.IsNullOrEmpty(billingAccount.StripeCustomerId))
            return (null, "No tienes una cuenta de facturacion con Stripe.");

        var appUrl = _config.GetValue<string>("APP_URL") ?? "http://localhost:3002";

        var portalService = new Stripe.BillingPortal.SessionService();
        var session = await portalService.CreateAsync(new Stripe.BillingPortal.SessionCreateOptions
        {
            Customer = billingAccount.StripeCustomerId,
            ReturnUrl = $"{appUrl}/settings/billing"
        }, cancellationToken: ct);

        return (new BillingPortalDto { Url = session.Url }, null);
    }
}
