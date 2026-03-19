using Eigdo.Application.Interfaces;
using Eigdo.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Eigdo.Application.Services;

public class EmissionValidator
{
    private readonly IEigdoDbContext _db;

    public EmissionValidator(IEigdoDbContext db)
    {
        _db = db;
    }

    public async Task<(bool IsValid, List<string> Errors)> ValidateAsync(
        Guid companyId, EcfType ecfType, string qboSourceId, CancellationToken ct)
    {
        var errors = new List<string>();

        // 1. Company exists
        var companyExists = await _db.Companies
            .AnyAsync(c => c.Id == companyId, ct);

        if (!companyExists)
        {
            errors.Add("Company not found.");
            return (false, errors);
        }

        // 2. Onboarding complete — FiscalSettings exists with RNC set
        var fiscalSettings = await _db.FiscalSettings
            .FirstOrDefaultAsync(fs => fs.CompanyId == companyId, ct);

        if (fiscalSettings is null)
        {
            errors.Add("Fiscal settings not configured. Complete onboarding first.");
            return (false, errors);
        }

        if (string.IsNullOrWhiteSpace(fiscalSettings.Rnc))
        {
            errors.Add("RNC not configured in fiscal settings.");
        }

        // 3. Certificate uploaded
        if (!fiscalSettings.CertificateConfigured)
        {
            errors.Add("Digital certificate not configured.");
        }

        // 4. Sales e-CF: customer mapping
        if (IsSalesEcf(ecfType))
        {
            var customer = await _db.CustomerMappings
                .FirstOrDefaultAsync(cm => cm.CompanyId == companyId && cm.QboCustomerId == qboSourceId, ct);

            if (customer is null)
            {
                errors.Add("Customer mapping not found for this QBO customer.");
            }
            else
            {
                if (customer.Excluido)
                {
                    errors.Add("Customer is excluded from e-CF emission.");
                }

                if (string.IsNullOrWhiteSpace(customer.Rnc))
                {
                    errors.Add("Customer RNC not configured.");
                }
            }
        }

        // 5. Purchase e-CF: vendor mapping
        if (IsPurchaseEcf(ecfType))
        {
            var vendor = await _db.VendorMappings
                .FirstOrDefaultAsync(vm => vm.CompanyId == companyId && vm.QboVendorId == qboSourceId, ct);

            if (vendor is null)
            {
                errors.Add("Vendor mapping not found for this QBO vendor.");
            }
            else
            {
                if (vendor.Excluido)
                {
                    errors.Add("Vendor is excluded from e-CF emission.");
                }

                if (string.IsNullOrWhiteSpace(vendor.Rnc))
                {
                    errors.Add("Vendor RNC not configured.");
                }

                // E41 with services requires retention rates
                if (ecfType == EcfType.E41)
                {
                    if (vendor.RetentionItbisRate is null)
                    {
                        errors.Add("Vendor ITBIS retention rate not configured (required for E41).");
                    }

                    if (vendor.RetentionIsrRate is null)
                    {
                        errors.Add("Vendor ISR retention rate not configured (required for E41).");
                    }
                }
            }
        }

        // 6. At least one TaxCodeMapping exists
        var hasTaxMappings = await _db.TaxCodeMappings
            .AnyAsync(tc => tc.CompanyId == companyId, ct);

        if (!hasTaxMappings)
        {
            errors.Add("No tax code mappings configured.");
        }

        // 7. Sequence available for ecfType (active, not expired, not exhausted)
        var hasSequence = await _db.Sequences
            .AnyAsync(s => s.FiscalSettings.CompanyId == companyId
                           && s.EcfType == ecfType
                           && s.IsActive
                           && s.DueDateUtc > DateTime.UtcNow
                           && s.CurrentValue < s.RangeEnd, ct);

        if (!hasSequence)
        {
            errors.Add($"No available sequence for {ecfType}. Check that a sequence is active, not expired, and not exhausted.");
        }

        // 8. Payment method mappings exist
        var hasPaymentMappings = await _db.PaymentMethodMappings
            .AnyAsync(pm => pm.FiscalSettings.CompanyId == companyId, ct);

        if (!hasPaymentMappings)
        {
            errors.Add("No payment method mappings configured.");
        }

        return (errors.Count == 0, errors);
    }

    public static bool IsSalesEcf(EcfType ecfType) =>
        ecfType is EcfType.E31 or EcfType.E32 or EcfType.E33
            or EcfType.E34 or EcfType.E44 or EcfType.E45 or EcfType.E46;

    public static bool IsPurchaseEcf(EcfType ecfType) =>
        ecfType is EcfType.E41 or EcfType.E43 or EcfType.E47;
}
