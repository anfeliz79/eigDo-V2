using Eigdo.Application.Interfaces;
using Eigdo.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Eigdo.Api.Controllers;

[Route("api/admin")]
[Authorize(Roles = "SuperAdmin")]
public class AdminController : EigdoControllerBase
{
    private readonly IEigdoDbContext _db;

    public AdminController(IEigdoDbContext db)
    {
        _db = db;
    }

    // ────────── Dashboard Statistics ──────────

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var now = DateTime.UtcNow;
        var todayStart = now.Date;

        var totalCompanies = await _db.Companies.CountAsync();
        var activeCompanies = await _db.Companies.CountAsync(c => c.IsActive);
        var activeSubscriptions = await _db.Subscriptions.CountAsync(s => s.Status == SubscriptionStatus.Active);
        var ecfToday = await _db.EcfDocuments.CountAsync(d => d.CreatedAtUtc >= todayStart);
        var ecfErrors = await _db.EcfDocuments.CountAsync(d =>
            d.Status == EcfDocumentStatus.Rejected && d.CreatedAtUtc >= todayStart);
        var ecfTotal = await _db.EcfDocuments.CountAsync();

        return Ok(new
        {
            totalCompanies,
            activeCompanies,
            activeSubscriptions,
            ecfToday,
            ecfErrors,
            ecfTotal,
        });
    }

    // ────────── Companies ──────────

    [HttpGet("companies")]
    public async Task<IActionResult> GetCompanies(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? search = null)
    {
        var query = _db.Companies.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(c =>
                c.Name.ToLower().Contains(term) ||
                (c.Rnc != null && c.Rnc.Contains(term)));
        }

        var total = await query.CountAsync();

        var items = await query
            .OrderByDescending(c => c.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new AdminCompanyDto
            {
                Id = c.Id,
                Name = c.Name,
                Rnc = c.Rnc,
                IsActive = c.IsActive,
                OnboardingStep = c.OnboardingStep.ToString(),
                IsOnboardingComplete = c.IsOnboardingComplete,
                QboConnected = c.QboConnection != null && c.QboConnection.IsActive,
                PlanName = c.BillingAccount != null
                    ? c.BillingAccount.Subscriptions
                        .Where(s => s.Status == SubscriptionStatus.Active)
                        .Select(s => s.Plan.Name)
                        .FirstOrDefault()
                    : null,
                EcfCount = _db.EcfDocuments.Count(d => d.CompanyId == c.Id),
                CreatedAtUtc = c.CreatedAtUtc,
            })
            .ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("companies/{id:guid}")]
    public async Task<IActionResult> GetCompany(Guid id)
    {
        var company = await _db.Companies
            .Include(c => c.FiscalSettings)
            .Include(c => c.QboConnection)
            .Include(c => c.BillingAccount)
                .ThenInclude(b => b!.Subscriptions)
                    .ThenInclude(s => s.Plan)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (company == null) return NotFound();

        var ecfCount = await _db.EcfDocuments.CountAsync(d => d.CompanyId == id);
        var customerCount = await _db.CustomerMappings.CountAsync(m => m.CompanyId == id);
        var vendorCount = await _db.VendorMappings.CountAsync(m => m.CompanyId == id);

        var activeSub = company.BillingAccount?.Subscriptions
            .FirstOrDefault(s => s.Status == SubscriptionStatus.Active);

        return Ok(new
        {
            company.Id,
            company.Name,
            company.Rnc,
            company.IsActive,
            company.OnboardingStep,
            company.IsOnboardingComplete,
            qboConnected = company.QboConnection?.IsActive ?? false,
            qboRealmId = company.QboConnection?.RealmId,
            planName = activeSub?.Plan.Name,
            subscriptionStatus = activeSub?.Status.ToString(),
            ecfCount,
            customerCount,
            vendorCount,
            fiscalRnc = company.FiscalSettings?.Rnc,
            fiscalRazonSocial = company.FiscalSettings?.RazonSocial,
            company.CreatedAtUtc,
        });
    }

    [HttpPost("companies/{id:guid}/toggle-active")]
    public async Task<IActionResult> ToggleCompanyActive(Guid id)
    {
        var company = await _db.Companies.FindAsync(id);
        if (company == null) return NotFound();

        company.IsActive = !company.IsActive;
        company.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { company.Id, company.IsActive });
    }

    // ────────── Subscriptions ──────────

    [HttpGet("subscriptions")]
    public async Task<IActionResult> GetSubscriptions(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var total = await _db.Subscriptions.CountAsync();

        var items = await _db.Subscriptions
            .Include(s => s.Plan)
            .Include(s => s.BillingAccount)
                .ThenInclude(b => b.Company)
            .OrderByDescending(s => s.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new
            {
                s.Id,
                CompanyName = s.BillingAccount.Company.Name,
                CompanyId = s.BillingAccount.CompanyId,
                PlanName = s.Plan.Name,
                Status = s.Status.ToString(),
                s.StartDateUtc,
                s.EndDateUtc,
                s.CurrentPeriodStartUtc,
                s.CurrentPeriodEndUtc,
                s.DocumentsEmittedThisPeriod,
                s.Plan.IncludedDocumentsPerMonth,
                Gateway = s.Gateway.ToString(),
            })
            .ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    // ────────── Audit Logs ──────────

    [HttpGet("audit-logs")]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] Guid? companyId = null,
        [FromQuery] string? action = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null)
    {
        var query = _db.AuditLogs.AsQueryable();

        if (companyId.HasValue)
            query = query.Where(a => a.CompanyId == companyId.Value);

        if (!string.IsNullOrWhiteSpace(action))
            query = query.Where(a => a.Action == action);

        if (from.HasValue)
            query = query.Where(a => a.CreatedAtUtc >= from.Value);

        if (to.HasValue)
            query = query.Where(a => a.CreatedAtUtc <= to.Value);

        var total = await query.CountAsync();

        var items = await query
            .OrderByDescending(a => a.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Join(_db.Companies,
                a => a.CompanyId,
                c => c.Id,
                (a, c) => new { AuditLog = a, CompanyName = c.Name })
            .Select(x => new
            {
                x.AuditLog.Id,
                x.AuditLog.CompanyId,
                x.CompanyName,
                x.AuditLog.UserId,
                x.AuditLog.Action,
                x.AuditLog.EntityType,
                x.AuditLog.EntityId,
                x.AuditLog.CreatedAtUtc,
            })
            .ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    // ────────── Recent Activity ──────────

    [HttpGet("recent-companies")]
    public async Task<IActionResult> GetRecentCompanies([FromQuery] int limit = 5)
    {
        var items = await _db.Companies
            .OrderByDescending(c => c.CreatedAtUtc)
            .Take(limit)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.Rnc,
                c.IsActive,
                c.CreatedAtUtc,
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("recent-documents")]
    public async Task<IActionResult> GetRecentDocuments([FromQuery] int limit = 10)
    {
        var items = await _db.EcfDocuments
            .OrderByDescending(d => d.CreatedAtUtc)
            .Take(limit)
            .Select(d => new
            {
                d.Id,
                d.CompanyId,
                d.EcfType,
                Status = d.Status.ToString(),
                d.Encf,
                d.TotalAmount,
                d.ErrorMessage,
                d.CreatedAtUtc,
            })
            .ToListAsync();

        return Ok(items);
    }
}

// DTOs
public class AdminCompanyDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Rnc { get; set; }
    public bool IsActive { get; set; }
    public string OnboardingStep { get; set; } = string.Empty;
    public bool IsOnboardingComplete { get; set; }
    public bool QboConnected { get; set; }
    public string? PlanName { get; set; }
    public int EcfCount { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
