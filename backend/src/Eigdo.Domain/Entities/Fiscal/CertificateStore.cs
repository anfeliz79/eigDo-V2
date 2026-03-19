using Eigdo.Domain.Entities.Tenancy;

namespace Eigdo.Domain.Entities.Fiscal;

public class CertificateStore : BaseEntity
{
    public Guid CompanyId { get; set; }
    public byte[] EncryptedCertificateData { get; set; } = Array.Empty<byte>();
    public string EncryptedPassword { get; set; } = string.Empty;
    public string? SubjectName { get; set; }
    public string? IssuerName { get; set; }
    public string? SerialNumber { get; set; }
    public DateTime? ValidFromUtc { get; set; }
    public DateTime? ValidToUtc { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public Company Company { get; set; } = null!;
}
