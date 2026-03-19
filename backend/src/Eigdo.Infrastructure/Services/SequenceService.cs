using Eigdo.Domain.Entities.Fiscal;
using Eigdo.Domain.Enums;
using Eigdo.Domain.Interfaces;
using Eigdo.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace Eigdo.Infrastructure.Services;

public class SequenceService : ISequenceService
{
    private readonly EigdoDbContext _db;
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<SequenceService> _logger;

    private static readonly TimeSpan LockTimeout = TimeSpan.FromSeconds(10);
    private static readonly TimeSpan LockExpiry = TimeSpan.FromSeconds(10);

    public SequenceService(
        EigdoDbContext db,
        IConnectionMultiplexer redis,
        ILogger<SequenceService> logger)
    {
        _db = db;
        _redis = redis;
        _logger = logger;
    }

    public async Task<SequenceAssignResult> AssignNextAsync(
        Guid companyId, EcfType ecfType, CancellationToken ct = default)
    {
        var lockKey = $"seq:{companyId}:{ecfType}";
        var lockValue = Guid.NewGuid().ToString();
        var database = _redis.GetDatabase();

        // 1. Acquire distributed lock
        var acquired = await database.LockTakeAsync(lockKey, lockValue, LockExpiry);
        if (!acquired)
        {
            // Retry once after a short delay
            await Task.Delay(100, ct);
            acquired = await database.LockTakeAsync(lockKey, lockValue, LockExpiry);
            if (!acquired)
            {
                return new SequenceAssignResult(false, null, "Could not acquire lock, try again");
            }
        }

        try
        {
            // 2. Find active sequence for company + ecfType
            var sequence = await _db.Sequences
                .Include(s => s.FiscalSettings)
                .Where(s => s.FiscalSettings.CompanyId == companyId
                         && s.EcfType == ecfType
                         && s.IsActive)
                .FirstOrDefaultAsync(ct);

            if (sequence is null)
            {
                return new SequenceAssignResult(false, null, $"No active sequence for {ecfType}");
            }

            // 3. Validate state
            if (sequence.IsExpired())
            {
                return new SequenceAssignResult(false, null, $"Sequence expired for {ecfType}");
            }

            if (sequence.IsExhausted())
            {
                return new SequenceAssignResult(false, null, $"Sequence exhausted for {ecfType}");
            }

            // 4. Check alert threshold
            if (sequence.ShouldAlert())
            {
                _logger.LogWarning(
                    "Sequence running low for Company {CompanyId}, EcfType {EcfType}. Remaining: {Remaining}",
                    companyId, ecfType, sequence.Remaining());
            }

            // 5. Get next number and format e-NCF
            var nextNumber = sequence.CurrentValue;
            var prefix = ecfType.ToString(); // E31, E32, etc.
            var encf = $"{prefix}{nextNumber:D8}";

            // 6. Increment and save
            sequence.CurrentValue++;
            await _db.SaveChangesAsync(ct);

            return new SequenceAssignResult(true, encf, null);
        }
        finally
        {
            // 7. Release lock
            await database.LockReleaseAsync(lockKey, lockValue);
        }
    }
}
