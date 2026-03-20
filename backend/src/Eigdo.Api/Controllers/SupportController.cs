using Eigdo.Application.DTOs;
using Eigdo.Application.Interfaces;
using Eigdo.Domain.Entities.Support;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Eigdo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SupportController : EigdoControllerBase
{
    private readonly IEigdoDbContext _db;

    public SupportController(IEigdoDbContext db)
    {
        _db = db;
    }

    // ────────── PUBLIC: Create ticket from landing page (anonymous) ──────────

    [HttpPost("tickets/public")]
    [AllowAnonymous]
    public async Task<IActionResult> CreatePublicTicket([FromBody] CreatePublicTicketRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Subject) || string.IsNullOrWhiteSpace(request.Description))
            return BadRequest(ApiResponse<object>.Fail("Todos los campos son requeridos."));

        var ticket = new SupportTicket
        {
            Subject = request.Subject.Trim(),
            Description = request.Description.Trim(),
            ContactEmail = request.Email.Trim().ToLower(),
            ContactName = request.Name?.Trim(),
            Status = "open",
            Priority = "normal"
        };

        _db.SupportTickets.Add(ticket);

        // Add the description as the first message
        var message = new SupportTicketMessage
        {
            Ticket = ticket,
            Message = request.Description.Trim(),
            IsStaffReply = false,
            SenderEmail = request.Email.Trim().ToLower(),
            SenderName = request.Name?.Trim()
        };

        _db.SupportTicketMessages.Add(message);
        await _db.SaveChangesAsync(ct);

        return Ok(ApiResponse<object>.Ok(new { ticketId = ticket.Id, message = "Ticket creado exitosamente. Te contactaremos pronto." }));
    }

    // ────────── AUTHENTICATED: User ticket operations ──────────

    [HttpGet("tickets")]
    [Authorize]
    public async Task<IActionResult> GetMyTickets(CancellationToken ct)
    {
        var userId = GetUserId();
        var companyId = GetCompanyId();

        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail("Usuario no identificado."));

        var tickets = await _db.SupportTickets
            .Where(t => t.UserId == userId.Value || t.CompanyId == companyId)
            .OrderByDescending(t => t.CreatedAtUtc)
            .Select(t => new
            {
                t.Id,
                t.Subject,
                t.Status,
                t.Priority,
                t.CreatedAtUtc,
                t.UpdatedAtUtc,
                MessageCount = t.Messages.Count()
            })
            .ToListAsync(ct);

        return Ok(ApiResponse<object>.Ok(tickets));
    }

    [HttpPost("tickets")]
    [Authorize]
    public async Task<IActionResult> CreateTicket([FromBody] CreateTicketRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        var companyId = GetCompanyId();

        if (userId == null)
            return Unauthorized(ApiResponse<object>.Fail("Usuario no identificado."));

        if (string.IsNullOrWhiteSpace(request.Subject) || string.IsNullOrWhiteSpace(request.Description))
            return BadRequest(ApiResponse<object>.Fail("Asunto y descripcion son requeridos."));

        var ticket = new SupportTicket
        {
            UserId = userId.Value,
            CompanyId = companyId,
            Subject = request.Subject.Trim(),
            Description = request.Description.Trim(),
            Status = "open",
            Priority = request.Priority ?? "normal"
        };

        _db.SupportTickets.Add(ticket);

        var message = new SupportTicketMessage
        {
            Ticket = ticket,
            UserId = userId.Value,
            Message = request.Description.Trim(),
            IsStaffReply = false,
        };

        _db.SupportTicketMessages.Add(message);
        await _db.SaveChangesAsync(ct);

        return Ok(ApiResponse<object>.Ok(new { ticketId = ticket.Id }));
    }

    [HttpGet("tickets/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> GetTicket(Guid id, CancellationToken ct)
    {
        var userId = GetUserId();
        var companyId = GetCompanyId();

        var ticket = await _db.SupportTickets
            .Include(t => t.Messages.OrderBy(m => m.CreatedAtUtc))
            .FirstOrDefaultAsync(t => t.Id == id, ct);

        if (ticket == null)
            return NotFound(ApiResponse<object>.Fail("Ticket no encontrado."));

        // Check access: user must own ticket or be from same company
        if (ticket.UserId != userId && ticket.CompanyId != companyId)
            return Forbid();

        return Ok(ApiResponse<object>.Ok(new
        {
            ticket.Id,
            ticket.Subject,
            ticket.Description,
            ticket.Status,
            ticket.Priority,
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
                m.CreatedAtUtc
            })
        }));
    }

    [HttpPost("tickets/{id:guid}/messages")]
    [Authorize]
    public async Task<IActionResult> ReplyToTicket(Guid id, [FromBody] ReplyRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        var companyId = GetCompanyId();

        var ticket = await _db.SupportTickets.FirstOrDefaultAsync(t => t.Id == id, ct);

        if (ticket == null)
            return NotFound(ApiResponse<object>.Fail("Ticket no encontrado."));

        if (ticket.UserId != userId && ticket.CompanyId != companyId)
            return Forbid();

        if (string.IsNullOrWhiteSpace(request.Message))
            return BadRequest(ApiResponse<object>.Fail("El mensaje es requerido."));

        var message = new SupportTicketMessage
        {
            TicketId = id,
            UserId = userId,
            Message = request.Message.Trim(),
            IsStaffReply = false,
        };

        _db.SupportTicketMessages.Add(message);

        // Reopen ticket if it was resolved/closed
        if (ticket.Status == "resolved" || ticket.Status == "closed")
        {
            ticket.Status = "open";
        }

        ticket.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return Ok(ApiResponse<object>.Ok(new { messageId = message.Id }));
    }
}

// DTOs
public class CreatePublicTicketRequest
{
    public string Email { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class CreateTicketRequest
{
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Priority { get; set; }
}

public class ReplyRequest
{
    public string Message { get; set; } = string.Empty;
}
