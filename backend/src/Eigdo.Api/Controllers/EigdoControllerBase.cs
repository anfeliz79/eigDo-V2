using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace Eigdo.Api.Controllers;

[ApiController]
public abstract class EigdoControllerBase : ControllerBase
{
    /// <summary>
    /// Extracts the companyId from the first "company" JWT claim.
    /// Claim format: "{companyId}:{Role}"
    /// </summary>
    protected Guid? GetCompanyId()
    {
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
