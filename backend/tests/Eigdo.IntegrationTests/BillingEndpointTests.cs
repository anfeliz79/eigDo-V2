using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace Eigdo.IntegrationTests;

public class BillingEndpointTests : IClassFixture<EigdoWebAppFactory>
{
    private readonly EigdoWebAppFactory _factory;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public BillingEndpointTests(EigdoWebAppFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetPlans_ReturnsOk_WithSeededPlans()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/billing/plans");
        var json = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = JsonSerializer.Deserialize<ApiWrapper<List<PlanData>>>(json, JsonOpts);
        Assert.NotNull(body);
        Assert.True(body!.Success);
        Assert.NotNull(body.Data);
        Assert.Equal(3, body.Data!.Count);

        // Verify plan order: Basico, Profesional, Empresarial
        Assert.Equal("Basico", body.Data[0].Name);
        Assert.Equal("Profesional", body.Data[1].Name);
        Assert.Equal("Empresarial", body.Data[2].Name);

        // Verify each plan has prices
        foreach (var plan in body.Data)
        {
            Assert.NotEmpty(plan.Prices);
        }
    }

    [Fact]
    public async Task GetPlans_Anonymous_Allowed()
    {
        var client = _factory.CreateClient();

        // No auth header — should still work
        var response = await client.GetAsync("/api/billing/plans");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetPlans_PlanPricesMatchExpectedAmounts()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/billing/plans");
        var json = await response.Content.ReadAsStringAsync();
        var body = JsonSerializer.Deserialize<ApiWrapper<List<PlanData>>>(json, JsonOpts);

        var basico = body!.Data!.First(p => p.Name == "Basico");
        var profesional = body.Data.First(p => p.Name == "Profesional");
        var empresarial = body.Data.First(p => p.Name == "Empresarial");

        // Verify monthly prices (RD$)
        Assert.Contains(basico.Prices, p => p.Amount == 1500m && p.Interval == "monthly");
        Assert.Contains(profesional.Prices, p => p.Amount == 3500m && p.Interval == "monthly");
        Assert.Contains(empresarial.Prices, p => p.Amount == 7500m && p.Interval == "monthly");

        // Verify document limits
        Assert.Equal(100, basico.IncludedDocumentsPerMonth);
        Assert.Equal(500, profesional.IncludedDocumentsPerMonth);
        Assert.Equal(2000, empresarial.IncludedDocumentsPerMonth);
    }

    [Fact]
    public async Task Checkout_WithoutAuth_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/billing/checkout", new
        {
            priceId = Guid.NewGuid()
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Checkout_Sandbox_CreatesSubscriptionDirectly()
    {
        var client = _factory.CreateClient();
        var token = await RegisterAndGetToken(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Get plans to find a valid priceId
        var plansResponse = await client.GetAsync("/api/billing/plans");
        var plansJson = await plansResponse.Content.ReadAsStringAsync();
        var plans = JsonSerializer.Deserialize<ApiWrapper<List<PlanData>>>(plansJson, JsonOpts);
        var priceId = plans!.Data!.First().Prices.First().Id;

        // Create checkout (sandbox mode — no STRIPE_SECRET_KEY)
        var checkoutResponse = await client.PostAsJsonAsync("/api/billing/checkout", new
        {
            priceId
        });
        var checkoutJson = await checkoutResponse.Content.ReadAsStringAsync();

        Assert.True(checkoutResponse.StatusCode == HttpStatusCode.OK,
            $"Expected 200 but got {(int)checkoutResponse.StatusCode}. Body: {checkoutJson}");

        var checkout = JsonSerializer.Deserialize<ApiWrapper<CheckoutSessionData>>(checkoutJson, JsonOpts);
        Assert.NotNull(checkout?.Data);
        Assert.Contains("sandbox", checkout!.Data!.SessionId);
        Assert.Contains("billing/success", checkout.Data.Url);
        Assert.Contains("sandbox=true", checkout.Data.Url);
    }

    [Fact]
    public async Task Checkout_AfterSandbox_SubscriptionIsActive()
    {
        var client = _factory.CreateClient();
        var token = await RegisterAndGetToken(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Get a valid priceId
        var plansResponse = await client.GetAsync("/api/billing/plans");
        var plansJson = await plansResponse.Content.ReadAsStringAsync();
        var plans = JsonSerializer.Deserialize<ApiWrapper<List<PlanData>>>(plansJson, JsonOpts);
        var priceId = plans!.Data!.First().Prices.First().Id;

        // Create sandbox checkout
        await client.PostAsJsonAsync("/api/billing/checkout", new { priceId });

        // Verify subscription is active
        var subResponse = await client.GetAsync("/api/billing/subscription");
        var subJson = await subResponse.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, subResponse.StatusCode);

        var subscription = JsonSerializer.Deserialize<ApiWrapper<SubscriptionData>>(subJson, JsonOpts);
        Assert.NotNull(subscription?.Data);
        Assert.Equal("Active", subscription!.Data!.Status);
        Assert.Equal("Basico", subscription.Data.PlanName);
        Assert.Equal(0, subscription.Data.DocumentsEmittedThisPeriod);
    }

    [Fact]
    public async Task Checkout_DuplicateSubscription_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();
        var token = await RegisterAndGetToken(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Get a valid priceId
        var plansResponse = await client.GetAsync("/api/billing/plans");
        var plansJson = await plansResponse.Content.ReadAsStringAsync();
        var plans = JsonSerializer.Deserialize<ApiWrapper<List<PlanData>>>(plansJson, JsonOpts);
        var priceId = plans!.Data!.First().Prices.First().Id;

        // First checkout succeeds
        var first = await client.PostAsJsonAsync("/api/billing/checkout", new { priceId });
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        // Second checkout should fail (already subscribed)
        var second = await client.PostAsJsonAsync("/api/billing/checkout", new { priceId });
        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);

        var secondJson = await second.Content.ReadAsStringAsync();
        Assert.Contains("suscripcion activa", secondJson, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CanEmit_WithActiveSubscription_ReturnsTrue()
    {
        var client = _factory.CreateClient();
        var token = await RegisterAndGetToken(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Subscribe first
        var plansResponse = await client.GetAsync("/api/billing/plans");
        var plansJson = await plansResponse.Content.ReadAsStringAsync();
        var plans = JsonSerializer.Deserialize<ApiWrapper<List<PlanData>>>(plansJson, JsonOpts);
        var priceId = plans!.Data!.First().Prices.First().Id;
        await client.PostAsJsonAsync("/api/billing/checkout", new { priceId });

        // Check can-emit
        var response = await client.GetAsync("/api/billing/can-emit");
        var json = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("\"canEmit\":true", json);
    }

    [Fact]
    public async Task CanEmit_WithoutSubscription_ReturnsFalse()
    {
        var client = _factory.CreateClient();
        var token = await RegisterAndGetToken(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Don't subscribe — just check can-emit
        var response = await client.GetAsync("/api/billing/can-emit");
        var json = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("\"canEmit\":false", json);
    }

    [Fact]
    public async Task GetSubscription_WithoutAuth_Returns401()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/billing/subscription");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetSubscription_NoSubscription_ReturnsNullData()
    {
        var client = _factory.CreateClient();
        var token = await RegisterAndGetToken(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync("/api/billing/subscription");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        var body = JsonSerializer.Deserialize<ApiWrapper<SubscriptionData?>>(json, JsonOpts);
        Assert.True(body!.Success);
        Assert.Null(body.Data);
    }

    [Fact]
    public async Task GetPayments_AfterCheckout_HasPaymentRecord()
    {
        var client = _factory.CreateClient();
        var token = await RegisterAndGetToken(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Subscribe (sandbox creates a payment record)
        var plansResponse = await client.GetAsync("/api/billing/plans");
        var plansJson = await plansResponse.Content.ReadAsStringAsync();
        var plans = JsonSerializer.Deserialize<ApiWrapper<List<PlanData>>>(plansJson, JsonOpts);
        var priceId = plans!.Data!.First().Prices.First().Id;
        await client.PostAsJsonAsync("/api/billing/checkout", new { priceId });

        // Check payments
        var response = await client.GetAsync("/api/billing/payments");
        var json = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var payments = JsonSerializer.Deserialize<ApiWrapper<List<PaymentData>>>(json, JsonOpts);
        Assert.NotNull(payments?.Data);
        Assert.Single(payments!.Data!);
        Assert.Equal("succeeded", payments.Data[0].Status);
        Assert.Equal(1500m, payments.Data[0].Amount);
    }

    [Fact]
    public async Task Checkout_InvalidPriceId_ReturnsBadRequest()
    {
        var client = _factory.CreateClient();
        var token = await RegisterAndGetToken(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.PostAsJsonAsync("/api/billing/checkout", new
        {
            priceId = Guid.NewGuid() // non-existent
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ── Helper: Register a user and return the access token ──

    private async Task<string> RegisterAndGetToken(HttpClient client)
    {
        var email = $"billing{Guid.NewGuid():N}@example.com";
        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = "SecurePass123!",
            firstName = "Billing",
            lastName = "Test",
            companyName = "BillingTestCo SRL"
        });

        var json = await response.Content.ReadAsStringAsync();
        var body = JsonSerializer.Deserialize<ApiWrapper<AuthData>>(json, JsonOpts);
        return body!.Data!.AccessToken!;
    }

    // ── Response DTOs ──

    private record ApiWrapper<T>(bool Success, T? Data, string? Error);
    private record AuthData(string? AccessToken, string? RefreshToken);
    private record PlanData(Guid Id, string Name, string? Description, int IncludedDocumentsPerMonth, int SortOrder, List<PriceData> Prices);
    private record PriceData(Guid Id, decimal Amount, string Currency, string Interval);
    private record CheckoutSessionData(string SessionId, string Url);
    private record SubscriptionData(Guid Id, string PlanName, string Status, int DocumentsEmittedThisPeriod, int IncludedDocumentsPerMonth, decimal PriceAmount, string PriceInterval);
    private record PaymentData(Guid Id, decimal Amount, string Currency, string Status, string Gateway);
}
