using System.Text.Json;
using Eigdo.Domain.Entities.Support;
using Eigdo.Domain.Interfaces;
using Eigdo.Infrastructure.Persistence;

namespace Eigdo.Infrastructure.Services;

public class AuditService : IAuditService
{
    private readonly EigdoDbContext _db;

    public AuditService(EigdoDbContext db)
    {
        _db = db;
    }

    public async Task LogAsync(Guid? companyId, Guid? userId, string action, string entityType, string? entityId, object? oldValues = null, object? newValues = null, CancellationToken ct = default)
    {
        var log = new AuditLog
        {
            CompanyId = companyId,
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            OldValuesJson = oldValues != null ? JsonSerializer.Serialize(oldValues) : null,
            NewValuesJson = newValues != null ? JsonSerializer.Serialize(newValues) : null
        };

        _db.AuditLogs.Add(log);
        await _db.SaveChangesAsync(ct);
    }
}
