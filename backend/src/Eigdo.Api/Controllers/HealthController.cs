using Eigdo.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

namespace Eigdo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly IEigdoDbContext _db;
    private readonly IConnectionMultiplexer? _redis;

    public HealthController(IEigdoDbContext db, IConnectionMultiplexer? redis = null)
    {
        _db = db;
        _redis = redis;
    }

    /// <summary>
    /// Basic liveness check — returns immediately.
    /// </summary>
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            status = "healthy",
            timestamp = DateTime.UtcNow,
            version = "2.0.0"
        });
    }

    /// <summary>
    /// Readiness check — verifies PostgreSQL and Redis are reachable.
    /// </summary>
    [HttpGet("ready")]
    public async Task<IActionResult> Ready()
    {
        var checks = new Dictionary<string, string>();
        var allHealthy = true;

        // PostgreSQL
        try
        {
            await _db.Companies.Select(c => 1).FirstOrDefaultAsync();
            checks["postgresql"] = "ok";
        }
        catch (Exception ex)
        {
            checks["postgresql"] = $"error: {ex.Message}";
            allHealthy = false;
        }

        // Redis
        try
        {
            if (_redis is not null)
            {
                var db = _redis.GetDatabase();
                await db.PingAsync();
                checks["redis"] = "ok";
            }
            else
            {
                checks["redis"] = "not configured";
            }
        }
        catch (Exception ex)
        {
            checks["redis"] = $"error: {ex.Message}";
            allHealthy = false;
        }

        var result = new
        {
            status = allHealthy ? "ready" : "degraded",
            timestamp = DateTime.UtcNow,
            version = "2.0.0",
            checks,
        };

        return allHealthy ? Ok(result) : StatusCode(503, result);
    }
}
