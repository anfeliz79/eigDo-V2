using System.Security.Cryptography;
using System.Text;
using Eigdo.Application.Services;

namespace Eigdo.UnitTests;

public class WebhookSignatureTests
{
    [Fact]
    public void VerifySignature_ValidSignature_ReturnsTrue()
    {
        var body = """{"eventNotifications":[{"realmId":"123"}]}""";
        var token = "test-verifier-token-12345";

        // Compute expected HMAC
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(token));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(body));
        var signature = Convert.ToBase64String(hash);

        Assert.True(QboWebhookHandler.VerifySignature(body, signature, token));
    }

    [Fact]
    public void VerifySignature_InvalidSignature_ReturnsFalse()
    {
        var body = """{"eventNotifications":[]}""";
        var token = "test-verifier-token";
        var badSignature = "definitelyNotAValidSignature==";

        Assert.False(QboWebhookHandler.VerifySignature(body, badSignature, token));
    }

    [Fact]
    public void VerifySignature_TamperedBody_ReturnsFalse()
    {
        var originalBody = """{"eventNotifications":[{"realmId":"123"}]}""";
        var tamperedBody = """{"eventNotifications":[{"realmId":"HACKED"}]}""";
        var token = "my-secret";

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(token));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(originalBody));
        var signature = Convert.ToBase64String(hash);

        // Signature was for original body, not tampered
        Assert.False(QboWebhookHandler.VerifySignature(tamperedBody, signature, token));
    }

    [Theory]
    [InlineData(null, "sig", "token")]
    [InlineData("body", null, "token")]
    [InlineData("body", "sig", null)]
    [InlineData("", "sig", "token")]
    [InlineData("body", "", "token")]
    [InlineData("body", "sig", "")]
    public void VerifySignature_NullOrEmptyInputs_ReturnsFalse(string? body, string? sig, string? token)
    {
        Assert.False(QboWebhookHandler.VerifySignature(body!, sig!, token!));
    }
}
