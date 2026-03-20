using Eigdo.Application.DTOs;
using Eigdo.Application.DTOs.Billing;
using Eigdo.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Eigdo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BillingController : EigdoControllerBase
{
    private readonly CheckoutService _checkoutService;
    private readonly SubscriptionService _subscriptionService;

    public BillingController(CheckoutService checkoutService, SubscriptionService subscriptionService)
    {
        _checkoutService = checkoutService;
        _subscriptionService = subscriptionService;
    }

    /// <summary>
    /// Get all available plans with pricing.
    /// </summary>
    [HttpGet("plans")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPlans(CancellationToken ct)
    {
        var plans = await _checkoutService.GetPlansAsync(ct);
        return Ok(ApiResponse<List<PlanDto>>.Ok(plans));
    }

    /// <summary>
    /// Create a Stripe checkout session to purchase a plan.
    /// </summary>
    [HttpPost("checkout")]
    [Authorize]
    public async Task<IActionResult> CreateCheckout([FromBody] CreateCheckoutRequest request, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        var userId = GetUserId();

        if (companyId == null || userId == null)
            return Unauthorized(ApiResponse<CheckoutSessionDto>.Fail("Empresa no identificada."));

        var (session, error) = await _checkoutService.CreateCheckoutSessionAsync(
            companyId.Value, userId.Value, request, ct);

        if (error != null)
            return BadRequest(ApiResponse<CheckoutSessionDto>.Fail(error));

        return Ok(ApiResponse<CheckoutSessionDto>.Ok(session!));
    }

    /// <summary>
    /// Get the current subscription status for the authenticated company.
    /// </summary>
    [HttpGet("subscription")]
    [Authorize]
    public async Task<IActionResult> GetSubscription(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId == null)
            return Unauthorized(ApiResponse<SubscriptionDto>.Fail("Empresa no identificada."));

        var subscription = await _subscriptionService.GetActiveSubscriptionAsync(companyId.Value, ct);

        return Ok(ApiResponse<SubscriptionDto?>.Ok(subscription));
    }

    /// <summary>
    /// Check if the company can emit documents (subscription + limits).
    /// </summary>
    [HttpGet("can-emit")]
    [Authorize]
    public async Task<IActionResult> CanEmit(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId == null)
            return Unauthorized(ApiResponse<object>.Fail("Empresa no identificada."));

        var (canEmit, reason) = await _subscriptionService.CanEmitDocumentAsync(companyId.Value, ct);

        return Ok(ApiResponse<object>.Ok(new { canEmit, reason }));
    }

    /// <summary>
    /// Get payment history for the company.
    /// </summary>
    [HttpGet("payments")]
    [Authorize]
    public async Task<IActionResult> GetPayments([FromQuery] int limit = 20, CancellationToken ct = default)
    {
        var companyId = GetCompanyId();
        if (companyId == null)
            return Unauthorized(ApiResponse<List<PaymentHistoryDto>>.Fail("Empresa no identificada."));

        var payments = await _subscriptionService.GetPaymentHistoryAsync(companyId.Value, limit, ct);

        return Ok(ApiResponse<List<PaymentHistoryDto>>.Ok(payments));
    }

    /// <summary>
    /// Create a Stripe Billing Portal session for managing subscription.
    /// </summary>
    [HttpPost("portal")]
    [Authorize]
    public async Task<IActionResult> CreateBillingPortal(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId == null)
            return Unauthorized(ApiResponse<BillingPortalDto>.Fail("Empresa no identificada."));

        var (portal, error) = await _checkoutService.CreateBillingPortalAsync(companyId.Value, ct);

        if (error != null)
            return BadRequest(ApiResponse<BillingPortalDto>.Fail(error));

        return Ok(ApiResponse<BillingPortalDto>.Ok(portal!));
    }

    /// <summary>
    /// Stripe webhook endpoint — receives payment and subscription events.
    /// </summary>
    [HttpPost("stripe-webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> StripeWebhook(CancellationToken ct)
    {
        var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync(ct);
        var signature = Request.Headers["Stripe-Signature"].FirstOrDefault();

        if (string.IsNullOrEmpty(signature))
            return BadRequest("Falta la firma de Stripe.");

        try
        {
            await _checkoutService.HandleStripeWebhookAsync(json, signature, ct);
            return Ok();
        }
        catch (Stripe.StripeException ex)
        {
            return BadRequest($"Webhook error: {ex.Message}");
        }
    }
}
