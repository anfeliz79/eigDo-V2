using System.Net;
using System.Net.Http.Json;

namespace Eigdo.IntegrationTests;

public class HealthEndpointTests : IClassFixture<EigdoWebAppFactory>
{
    private readonly HttpClient _client;

    public HealthEndpointTests(EigdoWebAppFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Health_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<HealthResponse>();
        Assert.NotNull(body);
        Assert.Equal("healthy", body!.Status);
        Assert.Equal("2.0.0", body.Version);
    }

    [Fact]
    public async Task Health_ReturnsTimestamp()
    {
        var before = DateTime.UtcNow.AddSeconds(-1);
        var response = await _client.GetAsync("/api/health");
        var body = await response.Content.ReadFromJsonAsync<HealthResponse>();

        Assert.NotNull(body);
        Assert.True(body!.Timestamp >= before);
        Assert.True(body.Timestamp <= DateTime.UtcNow.AddSeconds(2));
    }

    private record HealthResponse(string Status, DateTime Timestamp, string Version);
}
