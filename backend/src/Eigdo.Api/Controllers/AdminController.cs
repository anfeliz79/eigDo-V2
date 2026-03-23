using System.Security.Claims;
using System.Text.Json;
using Eigdo.Application.DTOs.Admin;
using Eigdo.Application.DTOs.Support;
using Eigdo.Application.Interfaces;
using Eigdo.Domain.Entities.Billing;
using Eigdo.Domain.Entities.Identity;
using Eigdo.Domain.Entities.Settings;
using Eigdo.Domain.Entities.Support;
using Eigdo.Domain.Enums;
using Eigdo.Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Eigdo.Api.Controllers;

[Route("api/admin")]
[Authorize(Roles = "SuperAdmin,Admin,Support")]
public class AdminController : EigdoControllerBase
{
    private readonly IEigdoDbContext _db;
    private readonly IConfiguration _config;
    private readonly IEncryptionService _encryption;

    private static readonly string[] AdminRoles = { "SuperAdmin", "Admin", "Support" };

    public AdminController(IEigdoDbContext db, IConfiguration config, IEncryptionService encryption)
    {
        _db = db;
        _config = config;
        _encryption = encryption;
    }

    // ────────── Helpers ──────────

    private string? GetCallerSystemRole()
        => User.FindFirst(ClaimTypes.Role)?.Value;

    private bool CallerIsSuperAdmin()
        => GetCallerSystemRole() == "SuperAdmin";

    private bool CallerIsSuperAdminOrAdmin()
    {
        var role = GetCallerSystemRole();
        return role == "SuperAdmin" || role == "Admin";
    }

    // ────────── Dashboard Statistics ──────────

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var now = DateTime.UtcNow;
        var todayStart = now.Date;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var totalCompanies = await _db.Companies.CountAsync();
        var activeCompanies = await _db.Companies.CountAsync(c => c.IsActive);
        var activeSubscriptions = await _db.Subscriptions.CountAsync(s => s.Status == SubscriptionStatus.Active);
        var ecfToday = await _db.EcfDocuments.CountAsync(d => d.CreatedAtUtc >= todayStart);
        var ecfErrors = await _db.EcfDocuments.CountAsync(d =>
            d.Status == EcfDocumentStatus.Rejected && d.CreatedAtUtc >= todayStart);
        var ecfTotal = await _db.EcfDocuments.CountAsync();
        var openTickets = await _db.SupportTickets.CountAsync(t => t.Status == "open" || t.Status == "in_progress");
        var totalUsers = await _db.Users.CountAsync();

        // Monthly revenue from payment transactions
        var monthlyRevenue = await _db.PaymentTransactions
            .Where(t => t.Status == "succeeded" && t.CreatedAtUtc >= monthStart)
            .SumAsync(t => t.Amount);

        return Ok(new
        {
            totalCompanies,
            activeCompanies,
            activeSubscriptions,
            ecfToday,
            ecfErrors,
            ecfTotal,
            openTickets,
            totalUsers,
            monthlyRevenue,
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
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> ToggleCompanyActive(Guid id)
    {
        var company = await _db.Companies.FindAsync(id);
        if (company == null) return NotFound();

        company.IsActive = !company.IsActive;
        company.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { company.Id, company.IsActive });
    }

    // ────────── Plans CRUD ──────────

    [HttpGet("plans")]
    public async Task<IActionResult> GetPlans()
    {
        var plans = await _db.Plans
            .Include(p => p.Prices)
            .OrderBy(p => p.SortOrder)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.Description,
                p.MaxCompanies,
                p.IncludedDocumentsPerMonth,
                p.IsActive,
                p.SortOrder,
                p.CreatedAtUtc,
                Prices = p.Prices.Select(pr => new
                {
                    pr.Id,
                    pr.Amount,
                    pr.Currency,
                    pr.Interval,
                    pr.IsActive,
                    pr.StripeId,
                }).ToList(),
                SubscriberCount = _db.Subscriptions.Count(s => s.PlanId == p.Id && s.Status == SubscriptionStatus.Active),
            })
            .ToListAsync();

        return Ok(plans);
    }

    [HttpPost("plans")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> CreatePlan([FromBody] CreatePlanRequest request)
    {
        var plan = new Plan
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            MaxCompanies = request.MaxCompanies,
            IncludedDocumentsPerMonth = request.IncludedDocumentsPerMonth,
            IsActive = true,
            SortOrder = request.SortOrder,
        };

        _db.Plans.Add(plan);
        await _db.SaveChangesAsync();

        return Ok(new { plan.Id });
    }

    [HttpPut("plans/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> UpdatePlan(Guid id, [FromBody] UpdatePlanRequest request)
    {
        var plan = await _db.Plans.FindAsync(id);
        if (plan == null) return NotFound();

        plan.Name = request.Name.Trim();
        plan.Description = request.Description?.Trim();
        plan.MaxCompanies = request.MaxCompanies;
        plan.IncludedDocumentsPerMonth = request.IncludedDocumentsPerMonth;
        plan.IsActive = request.IsActive;
        plan.SortOrder = request.SortOrder;
        plan.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { plan.Id });
    }

    [HttpDelete("plans/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> DeletePlan(Guid id)
    {
        var plan = await _db.Plans.FindAsync(id);
        if (plan == null) return NotFound();

        // Soft delete: deactivate instead of hard delete
        plan.IsActive = false;
        plan.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Plan desactivado." });
    }

    // ────────── Prices CRUD ──────────

    [HttpPost("plans/{planId:guid}/prices")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> CreatePrice(Guid planId, [FromBody] CreatePriceRequest request)
    {
        var plan = await _db.Plans.FindAsync(planId);
        if (plan == null) return NotFound();

        var price = new Price
        {
            PlanId = planId,
            Amount = request.Amount,
            Currency = request.Currency ?? "DOP",
            Interval = request.Interval,
            IsActive = true,
        };

        _db.Prices.Add(price);
        await _db.SaveChangesAsync();

        return Ok(new { price.Id });
    }

    [HttpPut("prices/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> UpdatePrice(Guid id, [FromBody] UpdatePriceRequest request)
    {
        var price = await _db.Prices.FindAsync(id);
        if (price == null) return NotFound();

        price.Amount = request.Amount;
        price.Currency = request.Currency ?? "DOP";
        price.Interval = request.Interval;
        price.IsActive = request.IsActive;
        price.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { price.Id });
    }

    [HttpDelete("prices/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> DeletePrice(Guid id)
    {
        var price = await _db.Prices.FindAsync(id);
        if (price == null) return NotFound();

        price.IsActive = false;
        price.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Precio desactivado." });
    }

    // ────────── Support Tickets (Admin) ──────────

    [HttpGet("tickets")]
    public async Task<IActionResult> GetTickets(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? status = null,
        [FromQuery] string? priority = null,
        [FromQuery] Guid? companyId = null)
    {
        var query = _db.SupportTickets.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(t => t.Status == status);

        if (!string.IsNullOrWhiteSpace(priority))
            query = query.Where(t => t.Priority == priority);

        if (companyId.HasValue)
            query = query.Where(t => t.CompanyId == companyId.Value);

        var total = await query.CountAsync();

        var items = await query
            .OrderByDescending(t => t.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new
            {
                t.Id,
                t.Subject,
                t.Status,
                t.Priority,
                t.ContactEmail,
                t.ContactName,
                t.CompanyId,
                t.UserId,
                CompanyName = t.Company != null ? t.Company.Name : null,
                UserEmail = t.User != null ? t.User.Email : t.ContactEmail,
                t.CreatedAtUtc,
                t.UpdatedAtUtc,
                MessageCount = t.Messages.Count(),
            })
            .ToListAsync();

        return Ok(new { items, total, page, pageSize });
    }

    [HttpGet("tickets/{id:guid}")]
    public async Task<IActionResult> GetTicketDetail(Guid id)
    {
        var ticket = await _db.SupportTickets
            .Include(t => t.Messages.OrderBy(m => m.CreatedAtUtc))
            .Include(t => t.Company)
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (ticket == null) return NotFound();

        return Ok(new
        {
            ticket.Id,
            ticket.Subject,
            ticket.Description,
            ticket.Status,
            ticket.Priority,
            ticket.ContactEmail,
            ticket.ContactName,
            ticket.CompanyId,
            CompanyName = ticket.Company?.Name,
            ticket.UserId,
            UserEmail = ticket.User?.Email ?? ticket.ContactEmail,
            UserName = ticket.User != null ? $"{ticket.User.FirstName} {ticket.User.LastName}" : ticket.ContactName,
            ticket.CreatedAtUtc,
            ticket.UpdatedAtUtc,
            Messages = ticket.Messages.Select(m => new
            {
                m.Id,
                m.Message,
                m.IsStaffReply,
                m.SenderName,
                m.SenderEmail,
                m.UserId,
                m.CreatedAtUtc,
            })
        });
    }

    [HttpPost("tickets/{id:guid}/reply")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> ReplyToTicket(Guid id, [FromBody] AdminReplyRequest request)
    {
        var ticket = await _db.SupportTickets.FindAsync(id);
        if (ticket == null) return NotFound();

        var userId = GetUserId();

        var message = new SupportTicketMessage
        {
            TicketId = id,
            UserId = userId,
            Message = request.Message.Trim(),
            IsStaffReply = true,
            SenderName = "Soporte eigdo",
        };

        _db.SupportTicketMessages.Add(message);
        ticket.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new { messageId = message.Id });
    }

    [HttpPut("tickets/{id:guid}/status")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> UpdateTicketStatus(Guid id, [FromBody] UpdateTicketStatusRequest request)
    {
        var ticket = await _db.SupportTickets.FindAsync(id);
        if (ticket == null) return NotFound();

        ticket.Status = request.Status;
        if (request.Priority != null)
            ticket.Priority = request.Priority;

        ticket.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { ticket.Id, ticket.Status, ticket.Priority });
    }

    // ────────── Alanube Config per Company ──────────

    [HttpGet("companies/{companyId:guid}/alanube-config")]
    public async Task<IActionResult> GetAlanubeConfig(Guid companyId)
    {
        var fs = await _db.FiscalSettings.FirstOrDefaultAsync(f => f.CompanyId == companyId);
        if (fs == null)
            return Ok(new { configured = false, environment = "sandbox", apiKey = (string?)null });

        return Ok(new
        {
            configured = !string.IsNullOrEmpty(fs.AlanubeApiKey),
            environment = fs.AlanubeEnvironment ?? "sandbox",
            apiKey = MaskApiKey(fs.AlanubeApiKey),
            companyId,
        });
    }

    [HttpPut("companies/{companyId:guid}/alanube-config")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> UpdateAlanubeConfig(Guid companyId, [FromBody] UpdateAlanubeConfigRequest request)
    {
        var fs = await _db.FiscalSettings.FirstOrDefaultAsync(f => f.CompanyId == companyId);
        if (fs == null)
        {
            fs = new Domain.Entities.Fiscal.FiscalSettings
            {
                CompanyId = companyId,
                AlanubeApiKey = request.ApiKey,
                AlanubeEnvironment = request.Environment ?? "sandbox",
            };
            _db.FiscalSettings.Add(fs);
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(request.ApiKey))
                fs.AlanubeApiKey = request.ApiKey;
            fs.AlanubeEnvironment = request.Environment ?? fs.AlanubeEnvironment;
            fs.UpdatedAtUtc = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "Configuracion de Alanube actualizada." });
    }

    // ────────── Payment Gateway Status ──────────

    [HttpGet("payment-gateways")]
    public async Task<IActionResult> GetPaymentGatewayStatus()
    {
        var stripeConfigured = !string.IsNullOrEmpty(_config.GetValue<string>("STRIPE_SECRET_KEY"));
        var stripeWebhookConfigured = !string.IsNullOrEmpty(_config.GetValue<string>("STRIPE_WEBHOOK_SECRET"));

        var totalStripePayments = await _db.PaymentTransactions.CountAsync(t => t.Gateway == PaymentGateway.Stripe);
        var totalAzulPayments = await _db.PaymentTransactions.CountAsync(t => t.Gateway == PaymentGateway.Azul);

        return Ok(new
        {
            gateways = new[]
            {
                new
                {
                    name = "Stripe",
                    configured = stripeConfigured,
                    webhookConfigured = stripeWebhookConfigured,
                    status = stripeConfigured ? "activo" : "no_configurado",
                    totalPayments = totalStripePayments,
                    description = "Pasarela internacional para tarjetas de credito/debito.",
                },
                new
                {
                    name = "Azul",
                    configured = false,
                    webhookConfigured = false,
                    status = "pendiente",
                    totalPayments = totalAzulPayments,
                    description = "Pasarela local de Republica Dominicana (en desarrollo).",
                }
            }
        });
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

    // ────────── Certification Assistance Config ──────────

    [HttpGet("certification-assistance")]
    public async Task<IActionResult> GetCertificationAssistanceConfig()
    {
        var config = await _db.CertificationAssistanceConfigs.FirstOrDefaultAsync();

        if (config == null)
        {
            return Ok(new CertificationAssistanceConfigResponse
            {
                IsEnabled = false,
                Title = "Servicio de Asistencia para Certificacion DGII",
                Description = "Le ayudamos a regularizar su situacion ante la DGII.",
                IncludedItems = new List<string>
                {
                    "Revision de documentos",
                    "Gestion ante la DGII",
                    "Seguimiento del proceso",
                    "Notificacion de resultado"
                },
                Requirements = new List<string>
                {
                    "Credenciales de Oficina Virtual DGII",
                    "Copia de cedula del representante legal",
                    "Documentos de la empresa (Registro Mercantil)",
                    "Poder de representacion (si aplica)"
                },
                EstimatedDays = 5,
                Price = 0,
                Currency = "DOP"
            });
        }

        return Ok(MapConfigToResponse(config));
    }

    [HttpPut("certification-assistance")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> UpdateCertificationAssistanceConfig(
        [FromBody] UpdateCertificationAssistanceConfigRequest request)
    {
        var config = await _db.CertificationAssistanceConfigs.FirstOrDefaultAsync();
        var isNew = config == null;

        if (isNew)
        {
            config = new CertificationAssistanceConfig();
            _db.CertificationAssistanceConfigs.Add(config);
        }

        config!.IsEnabled = request.IsEnabled;
        config.Price = request.Price;
        config.Currency = request.Currency;
        config.Title = request.Title;
        config.Description = request.Description;
        config.IncludedItems = JsonSerializer.Serialize(request.IncludedItems);
        config.Requirements = JsonSerializer.Serialize(request.Requirements);
        config.ChargeOnNextBillingCycle = request.ChargeOnNextBillingCycle;
        config.EstimatedDays = request.EstimatedDays;
        config.UpdatedAtUtc = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(MapConfigToResponse(config));
    }

    private static CertificationAssistanceConfigResponse MapConfigToResponse(CertificationAssistanceConfig c) => new()
    {
        Id = c.Id,
        IsEnabled = c.IsEnabled,
        Price = c.Price,
        Currency = c.Currency,
        Title = c.Title,
        Description = c.Description,
        IncludedItems = TryDeserializeList(c.IncludedItems),
        Requirements = TryDeserializeList(c.Requirements),
        ChargeOnNextBillingCycle = c.ChargeOnNextBillingCycle,
        EstimatedDays = c.EstimatedDays,
    };

    private static List<string> TryDeserializeList(string json)
    {
        try { return JsonSerializer.Deserialize<List<string>>(json) ?? new(); }
        catch { return new(); }
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

    // ────────── QBO App Configuration ──────────

    private static readonly string[] QboConfigKeys = new[]
    {
        "QBO_CLIENT_ID", "QBO_CLIENT_SECRET", "QBO_REDIRECT_URI",
        "QBO_ENVIRONMENT", "QBO_WEBHOOK_VERIFIER_TOKEN", "QBO_SCOPE"
    };

    private static readonly HashSet<string> QboSecretKeys = new()
    {
        "QBO_CLIENT_SECRET", "QBO_WEBHOOK_VERIFIER_TOKEN"
    };

    [HttpGet("qbo-config")]
    public async Task<IActionResult> GetQboConfig()
    {
        var dbSettings = await _db.AppSettings
            .Where(s => QboConfigKeys.Contains(s.Key))
            .ToListAsync();

        var result = new Dictionary<string, string?>();
        foreach (var key in QboConfigKeys)
        {
            var dbEntry = dbSettings.FirstOrDefault(s => s.Key == key);
            if (dbEntry != null)
            {
                var plainValue = dbEntry.IsSecret
                    ? _encryption.Decrypt(dbEntry.Value)
                    : dbEntry.Value;

                result[key] = QboSecretKeys.Contains(key) ? MaskSecret(plainValue) : plainValue;
            }
            else
            {
                // Fall back to env var / appsettings
                var envValue = _config.GetValue<string>(key);
                result[key] = QboSecretKeys.Contains(key) ? MaskSecret(envValue) : envValue;
            }
        }

        return Ok(result);
    }

    [HttpPut("qbo-config")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> UpdateQboConfig([FromBody] Dictionary<string, string?> settings)
    {
        var dbSettings = await _db.AppSettings
            .Where(s => QboConfigKeys.Contains(s.Key))
            .ToListAsync();

        foreach (var key in QboConfigKeys)
        {
            if (!settings.TryGetValue(key, out var value))
                continue;

            // Skip null or empty secret fields (means "keep current value")
            if (QboSecretKeys.Contains(key) && string.IsNullOrEmpty(value))
                continue;

            var isSecret = QboSecretKeys.Contains(key);
            var storedValue = isSecret ? _encryption.Encrypt(value!) : value ?? "";

            var existing = dbSettings.FirstOrDefault(s => s.Key == key);
            if (existing != null)
            {
                existing.Value = storedValue;
                existing.IsSecret = isSecret;
                existing.UpdatedAtUtc = DateTime.UtcNow;
            }
            else
            {
                _db.AppSettings.Add(new AppSetting
                {
                    Key = key,
                    Value = storedValue,
                    IsSecret = isSecret,
                });
            }
        }

        await _db.SaveChangesAsync();

        // Clear cached QBO config so services pick up the new values
        Eigdo.Infrastructure.Services.QboConfigProvider.ClearCache();

        return Ok(new { message = "Configuracion de QBO actualizada." });
    }

    // ────────── Alanube Reseller Configuration ──────────

    private static readonly string[] AlanubeConfigKeys = new[]
    {
        "Alanube:BaseUrl", "Alanube:JwtToken", "Alanube:Environment"
    };

    private static readonly HashSet<string> AlanubeSecretKeys = new()
    {
        "Alanube:JwtToken"
    };

    [HttpGet("alanube-config")]
    public async Task<IActionResult> GetAlanubeResellerConfig()
    {
        var dbSettings = await _db.AppSettings
            .Where(s => AlanubeConfigKeys.Contains(s.Key))
            .ToListAsync();

        var result = new Dictionary<string, string?>();
        foreach (var key in AlanubeConfigKeys)
        {
            var dbEntry = dbSettings.FirstOrDefault(s => s.Key == key);
            if (dbEntry != null)
            {
                var plainValue = dbEntry.IsSecret
                    ? _encryption.Decrypt(dbEntry.Value)
                    : dbEntry.Value;

                result[key] = AlanubeSecretKeys.Contains(key) ? MaskSecret(plainValue) : plainValue;
            }
            else
            {
                // Fall back to env var / appsettings
                var envKey = key switch
                {
                    "Alanube:BaseUrl" => "ALANUBE_BASE_URL",
                    "Alanube:JwtToken" => "ALANUBE_JWT_TOKEN",
                    "Alanube:Environment" => "ALANUBE_ENVIRONMENT",
                    _ => key
                };
                var envValue = _config.GetValue<string>(envKey);
                result[key] = AlanubeSecretKeys.Contains(key) ? MaskSecret(envValue) : envValue;
            }
        }

        return Ok(result);
    }

    [HttpPut("alanube-config")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> UpdateAlanubeResellerConfig([FromBody] Dictionary<string, string?> settings)
    {
        var dbSettings = await _db.AppSettings
            .Where(s => AlanubeConfigKeys.Contains(s.Key))
            .ToListAsync();

        foreach (var key in AlanubeConfigKeys)
        {
            if (!settings.TryGetValue(key, out var value))
                continue;

            // Skip null or empty secret fields (means "keep current value")
            if (AlanubeSecretKeys.Contains(key) && string.IsNullOrEmpty(value))
                continue;

            var isSecret = AlanubeSecretKeys.Contains(key);
            var storedValue = isSecret ? _encryption.Encrypt(value!) : value ?? "";

            var existing = dbSettings.FirstOrDefault(s => s.Key == key);
            if (existing != null)
            {
                existing.Value = storedValue;
                existing.IsSecret = isSecret;
                existing.UpdatedAtUtc = DateTime.UtcNow;
            }
            else
            {
                _db.AppSettings.Add(new AppSetting
                {
                    Key = key,
                    Value = storedValue,
                    IsSecret = isSecret,
                });
            }
        }

        await _db.SaveChangesAsync();

        // Clear cached Alanube config so services pick up the new values
        Eigdo.Infrastructure.Services.AlanubeConfigProvider.ClearCache();

        return Ok(new { message = "Configuracion de Alanube (reseller) actualizada." });
    }

    // ────────── Admin User Management ──────────

    [HttpGet("users")]
    public async Task<IActionResult> GetAdminUsers()
    {
        var users = await _db.Users
            .Where(u => u.SystemRole != null && AdminRoles.Contains(u.SystemRole))
            .OrderByDescending(u => u.CreatedAtUtc)
            .Select(u => new AdminUserDto
            {
                Id = u.Id,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Email = u.Email,
                SystemRole = u.SystemRole!,
                CreatedAtUtc = u.CreatedAtUtc,
                IsActive = u.IsActive,
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpPost("users")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> CreateAdminUser([FromBody] CreateAdminUserRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var requestedRole = request.SystemRole.Trim();

        // Validate role value
        if (requestedRole != "SuperAdmin" && requestedRole != "Admin" && requestedRole != "Support")
            return BadRequest(new { message = "Rol invalido. Valores permitidos: SuperAdmin, Admin, Support." });

        // Only SuperAdmin can create Admin or SuperAdmin users
        if (requestedRole is "Admin" or "SuperAdmin" && !CallerIsSuperAdmin())
            return Forbid();

        // Admin can only create Support users (already covered above, but explicit)
        // SuperAdmin can create any role

        var emailNormalized = request.Email.ToLower().Trim();

        if (await _db.Users.AnyAsync(u => u.Email == emailNormalized))
            return BadRequest(new { message = "Ya existe un usuario con este email." });

        var user = new User
        {
            Email = emailNormalized,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            SystemRole = requestedRole,
            EmailConfirmed = true, // Admin-created users are pre-confirmed
            IsActive = true,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Ok(new AdminUserDto
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            SystemRole = user.SystemRole!,
            CreatedAtUtc = user.CreatedAtUtc,
            IsActive = user.IsActive,
        });
    }

    [HttpPut("users/{id:guid}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    public async Task<IActionResult> UpdateAdminUser(Guid id, [FromBody] UpdateAdminUserRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u =>
            u.Id == id && u.SystemRole != null && AdminRoles.Contains(u.SystemRole));

        if (user == null)
            return NotFound(new { message = "Usuario administrativo no encontrado." });

        // Role change requires SuperAdmin
        if (request.SystemRole != null)
        {
            var newRole = request.SystemRole.Trim();

            if (newRole != "SuperAdmin" && newRole != "Admin" && newRole != "Support")
                return BadRequest(new { message = "Rol invalido. Valores permitidos: SuperAdmin, Admin, Support." });

            if (!CallerIsSuperAdmin())
                return Forbid();

            user.SystemRole = newRole;
        }

        // Admin cannot modify another Admin or SuperAdmin (only Support)
        if (!CallerIsSuperAdmin() && user.SystemRole is "SuperAdmin" or "Admin")
            return Forbid();

        if (request.FirstName != null)
            user.FirstName = request.FirstName.Trim();

        if (request.LastName != null)
            user.LastName = request.LastName.Trim();

        if (request.IsActive.HasValue)
        {
            // Only SuperAdmin can deactivate Admin/SuperAdmin users
            if (user.SystemRole is "SuperAdmin" or "Admin" && !CallerIsSuperAdmin())
                return Forbid();

            user.IsActive = request.IsActive.Value;
        }

        user.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new AdminUserDto
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            SystemRole = user.SystemRole!,
            CreatedAtUtc = user.CreatedAtUtc,
            IsActive = user.IsActive,
        });
    }

    [HttpDelete("users/{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> DeactivateAdminUser(Guid id)
    {
        var callerId = GetUserId();
        if (callerId.HasValue && callerId.Value == id)
            return BadRequest(new { message = "No puedes desactivar tu propia cuenta." });

        var user = await _db.Users.FirstOrDefaultAsync(u =>
            u.Id == id && u.SystemRole != null && AdminRoles.Contains(u.SystemRole));

        if (user == null)
            return NotFound(new { message = "Usuario administrativo no encontrado." });

        user.IsActive = false;
        user.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Usuario desactivado exitosamente." });
    }

    // ────────── Private Helpers ──────────

    private static string? MaskSecret(string? value)
    {
        if (string.IsNullOrEmpty(value)) return null;
        if (value.Length <= 8) return new string('*', value.Length);
        return value[..4] + new string('*', value.Length - 8) + value[^4..];
    }

    private static string? MaskApiKey(string? key)
    {
        if (string.IsNullOrEmpty(key) || key.Length < 8) return null;
        return key[..4] + new string('*', key.Length - 8) + key[^4..];
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

public class CreatePlanRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int MaxCompanies { get; set; } = 1;
    public int IncludedDocumentsPerMonth { get; set; }
    public int SortOrder { get; set; }
}

public class UpdatePlanRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int MaxCompanies { get; set; } = 1;
    public int IncludedDocumentsPerMonth { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}

public class CreatePriceRequest
{
    public decimal Amount { get; set; }
    public string? Currency { get; set; }
    public string Interval { get; set; } = "monthly";
}

public class UpdatePriceRequest
{
    public decimal Amount { get; set; }
    public string? Currency { get; set; }
    public string Interval { get; set; } = "monthly";
    public bool IsActive { get; set; } = true;
}

public class AdminReplyRequest
{
    public string Message { get; set; } = string.Empty;
}

public class UpdateTicketStatusRequest
{
    public string Status { get; set; } = string.Empty;
    public string? Priority { get; set; }
}

public class UpdateAlanubeConfigRequest
{
    public string? ApiKey { get; set; }
    public string? Environment { get; set; }
}
