namespace Eigdo.Application.DTOs.Qbo;

/// <summary>
/// Datos de la empresa traidos desde QuickBooks Online (CompanyInfo entity).
/// Se usa para pre-llenar los datos fiscales del emisor.
/// Ref: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/companyinfo
/// </summary>
public class QboCompanyInfoDto
{
    // Identity
    public string? CompanyName { get; set; }
    public string? LegalName { get; set; }
    public string? Ein { get; set; }

    // Contact
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Website { get; set; }

    // Company Address (CompanyAddr)
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? CountrySubDivisionCode { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public string? FullAddress { get; set; }

    // Legal Address (LegalAddr — may differ from CompanyAddr)
    public string? LegalAddressLine1 { get; set; }
    public string? LegalCity { get; set; }
    public string? LegalCountrySubDivisionCode { get; set; }
    public string? LegalPostalCode { get; set; }
    public string? LegalCountry { get; set; }
    public string? LegalFullAddress { get; set; }

    // Fiscal
    public string? FiscalYearStartMonth { get; set; }
    public string? CompanyStartDate { get; set; }
}
