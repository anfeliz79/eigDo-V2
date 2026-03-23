using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace Eigdo.Api.Controllers;

[ApiController]
public abstract class EigdoControllerBase : ControllerBase
{
    /// <summary>
    /// Resuelve el companyId activo.
    /// 1. Si el header X-Company-Id esta presente, lo usa (requiere validacion de acceso).
    /// 2. Si no, extrae el companyId del primer claim "company" del JWT.
    /// Claim format: "{companyId}:{Role}"
    /// </summary>
    protected Guid? GetCompanyId()
    {
        // 1. Check X-Company-Id header first
        if (Request.Headers.TryGetValue("X-Company-Id", out var headerValue))
        {
            var raw = headerValue.FirstOrDefault();
            if (!string.IsNullOrEmpty(raw) && Guid.TryParse(raw, out var headerCompanyId))
                return headerCompanyId;
        }

        // 2. Fallback: first "company" JWT claim
        var companyClaim = User.FindFirst("company")?.Value;
        if (string.IsNullOrEmpty(companyClaim))
            return null;

        var parts = companyClaim.Split(':');
        if (parts.Length < 2)
            return null;

        return Guid.TryParse(parts[0], out var companyId) ? companyId : null;
    }

    /// <summary>
    /// Extracts the userId from the NameIdentifier claim.
    /// </summary>
    protected Guid? GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : null;
    }

    /// <summary>
    /// Extracts the role from the first "company" JWT claim.
    /// Claim format: "{companyId}:{Role}"
    /// </summary>
    protected string? GetCompanyRole()
    {
        var companyClaim = User.FindFirst("company")?.Value;
        if (string.IsNullOrEmpty(companyClaim))
            return null;

        var parts = companyClaim.Split(':');
        return parts.Length >= 2 ? parts[1] : null;
    }
}
