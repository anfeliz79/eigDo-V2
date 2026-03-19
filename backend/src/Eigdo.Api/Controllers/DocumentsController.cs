using Eigdo.Application.Interfaces;
using Eigdo.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Eigdo.Api.Controllers;

[Authorize]
[Route("api/documents")]
public class DocumentsController : EigdoControllerBase
{
    private readonly IEigdoDbContext _db;

    public DocumentsController(IEigdoDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// GET /api/documents — Paginated document list with optional filters
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetDocuments(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null,
        [FromQuery] string? ecfType = null,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        var companyId = GetCompanyId();
        if (companyId is null)
            return Unauthorized(new { message = "Company not found in token" });

        var query = _db.EcfDocuments
            .AsNoTracking()
            .Where(d => d.CompanyId == companyId.Value);

        // Filter by status
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<EcfDocumentStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(d => d.Status == parsedStatus);
        }

        // Filter by e-CF type
        if (!string.IsNullOrEmpty(ecfType) && Enum.TryParse<EcfType>(ecfType, true, out var parsedEcfType))
        {
            query = query.Where(d => d.EcfType == parsedEcfType);
        }

        // Search by e-NCF or QBO doc number
        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(d =>
                (d.Encf != null && d.Encf.Contains(search)) ||
                (d.QboDocNumber != null && d.QboDocNumber.Contains(search)));
        }

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(d => d.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(d => new
            {
                d.Id,
                EcfType = d.EcfType.ToString(),
                Status = d.Status.ToString(),
                d.Encf,
                d.QboDocNumber,
                d.TotalAmount,
                d.TaxAmount,
                d.ErrorMessage,
                d.CreatedAtUtc,
                d.SubmittedAtUtc,
                d.AcceptedAtUtc
            })
            .ToListAsync(ct);

        return Ok(new { items, total, page, pageSize });
    }

    /// <summary>
    /// GET /api/documents/{id} — Document detail
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetDocument(Guid id, CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null) return Unauthorized();

        var doc = await _db.EcfDocuments
            .AsNoTracking()
            .Where(d => d.Id == id && d.CompanyId == companyId.Value)
            .Select(d => new
            {
                d.Id,
                EcfType = d.EcfType.ToString(),
                Status = d.Status.ToString(),
                d.Encf,
                d.TrackId,
                QboSourceType = d.QboSourceType.ToString(),
                d.QboSourceId,
                d.QboDocNumber,
                d.TotalAmount,
                d.TaxAmount,
                d.ErrorMessage,
                d.RetryCount,
                d.CreatedAtUtc,
                d.SubmittedAtUtc,
                d.AcceptedAtUtc,
                d.LastRetryUtc
            })
            .FirstOrDefaultAsync(ct);

        if (doc is null) return NotFound();
        return Ok(doc);
    }

    /// <summary>
    /// GET /api/documents/stats — Dashboard statistics
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats(CancellationToken ct)
    {
        var companyId = GetCompanyId();
        if (companyId is null) return Unauthorized();

        var today = DateTime.UtcNow.Date;
        var docs = _db.EcfDocuments.Where(d => d.CompanyId == companyId.Value);

        var todayCount = await docs.CountAsync(d => d.CreatedAtUtc >= today, ct);
        var accepted = await docs.CountAsync(d => d.Status == EcfDocumentStatus.Accepted, ct);
        var pending = await docs.CountAsync(d => d.Status == EcfDocumentStatus.Queued || d.Status == EcfDocumentStatus.Submitted, ct);
        var rejected = await docs.CountAsync(d => d.Status == EcfDocumentStatus.Rejected, ct);
        var blocked = await docs.CountAsync(d => d.Status == EcfDocumentStatus.BlockedByConfig, ct);

        return Ok(new { todayCount, accepted, pending, rejected, blocked });
    }
}
