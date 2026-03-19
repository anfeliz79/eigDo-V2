namespace Eigdo.Domain.Interfaces;

public interface IAuditService
{
    Task LogAsync(Guid? companyId, Guid? userId, string action, string entityType, string? entityId, object? oldValues = null, object? newValues = null, CancellationToken ct = default);
}
