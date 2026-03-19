using Eigdo.Application.DTOs.Onboarding;
using Eigdo.Application.Interfaces;
using Eigdo.Domain.Enums;
using Eigdo.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Eigdo.Application.Services;

public class OnboardingService
{
    private readonly IEigdoDbContext _db;
    private readonly IAuditService _audit;

    // Total steps excluding NotStarted and Complete
    private const int TotalSteps = 7;

    public OnboardingService(IEigdoDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<(OnboardingStatusResponse? Result, string? Error)> GetOnboardingStatusAsync(
        Guid companyId, CancellationToken ct = default)
    {
        var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == companyId, ct);
        if (company == null)
            return (null, "Company not found.");

        var missingItems = new Dictionary<OnboardingStep, List<string>>();
        var completedSteps = 0;

        // Step 1: CompanyData (FiscalSettings)
        var fiscalMissing = await GetFiscalSettingsMissingItemsAsync(companyId, ct);
        if (fiscalMissing.Count > 0)
            missingItems[OnboardingStep.CompanyData] = fiscalMissing;
        else
            completedSteps++;

        // Step 2: CustomerMapping
        var customerMissing = await GetCustomerMappingMissingItemsAsync(companyId, ct);
        if (customerMissing.Count > 0)
            missingItems[OnboardingStep.CustomerMapping] = customerMissing;
        else
            completedSteps++;

        // Step 3: VendorMapping
        var vendorMissing = await GetVendorMappingMissingItemsAsync(companyId, ct);
        if (vendorMissing.Count > 0)
            missingItems[OnboardingStep.VendorMapping] = vendorMissing;
        else
            completedSteps++;

        // Step 4: TaxMapping
        var taxMissing = await GetTaxMappingMissingItemsAsync(companyId, ct);
        if (taxMissing.Count > 0)
            missingItems[OnboardingStep.TaxMapping] = taxMissing;
        else
            completedSteps++;

        // Step 5: ItemOverrides — optional, always valid
        completedSteps++;

        // Step 6: CertificateUpload
        var certMissing = await GetCertificateMissingItemsAsync(companyId, ct);
        if (certMissing.Count > 0)
            missingItems[OnboardingStep.CertificateUpload] = certMissing;
        else
            completedSteps++;

        // Step 7: SequenceSetup
        var seqMissing = await GetSequenceMissingItemsAsync(companyId, ct);
        if (seqMissing.Count > 0)
            missingItems[OnboardingStep.SequenceSetup] = seqMissing;
        else
            completedSteps++;

        var percentage = (int)Math.Round((double)completedSteps / TotalSteps * 100);

        var response = new OnboardingStatusResponse
        {
            CurrentStep = company.OnboardingStep,
            CompletionPercentage = percentage,
            MissingItems = missingItems
        };

        return (response, null);
    }

    public async Task<(OnboardingStatusResponse? Result, string? Error)> AdvanceStepAsync(
        Guid companyId, AdvanceStepRequest request, CancellationToken ct = default)
    {
        return await AdvanceStepInternalAsync(companyId, request.Step, ct);
    }

    public async Task<(OnboardingStatusResponse? Result, string? Error)> AdvanceStepAsync(
        Guid companyId, OnboardingStep step, CancellationToken ct = default)
    {
        return await AdvanceStepInternalAsync(companyId, step, ct);
    }

    private async Task<(OnboardingStatusResponse? Result, string? Error)> AdvanceStepInternalAsync(
        Guid companyId, OnboardingStep step, CancellationToken ct = default)
    {
        var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == companyId, ct);
        if (company == null)
            return (null, "Company not found.");

        // Validate the requested step is the next one
        if ((int)step != (int)company.OnboardingStep + 1)
            return (null, $"Cannot advance to {step}. Current step is {company.OnboardingStep}.");

        // Validate current step is complete
        var validationError = await ValidateStepCompleteAsync(companyId, company.OnboardingStep, ct);
        if (validationError != null)
            return (null, validationError);

        var oldStep = company.OnboardingStep;
        company.OnboardingStep = step;
        company.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(companyId, null, "onboarding.step_advanced", "Company", companyId.ToString(),
            oldValues: new { Step = oldStep }, newValues: new { Step = step }, ct: ct);

        return await GetOnboardingStatusAsync(companyId, ct);
    }

    public async Task<(OnboardingStatusResponse? Result, string? Error)> CompleteOnboardingAsync(
        Guid companyId, CancellationToken ct = default)
    {
        var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == companyId, ct);
        if (company == null)
            return (null, "Company not found.");

        // Validate ALL required steps are complete
        var steps = new[]
        {
            OnboardingStep.CompanyData,
            OnboardingStep.CustomerMapping,
            OnboardingStep.VendorMapping,
            OnboardingStep.TaxMapping,
            // ItemOverrides is optional
            OnboardingStep.CertificateUpload,
            OnboardingStep.SequenceSetup
        };

        foreach (var step in steps)
        {
            var error = await ValidateStepCompleteAsync(companyId, step, ct);
            if (error != null)
                return (null, $"Step {step} is not complete: {error}");
        }

        company.OnboardingStep = OnboardingStep.Complete;
        company.IsOnboardingComplete = true;
        company.UpdatedAtUtc = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        await _audit.LogAsync(companyId, null, "onboarding.completed", "Company", companyId.ToString(), ct: ct);

        return await GetOnboardingStatusAsync(companyId, ct);
    }

    private async Task<string?> ValidateStepCompleteAsync(
        Guid companyId, OnboardingStep step, CancellationToken ct)
    {
        return step switch
        {
            OnboardingStep.CompanyData => (await GetFiscalSettingsMissingItemsAsync(companyId, ct)).Count > 0
                ? "Fiscal settings are incomplete."
                : null,
            OnboardingStep.CustomerMapping => (await GetCustomerMappingMissingItemsAsync(companyId, ct)).Count > 0
                ? "Customer mapping is incomplete."
                : null,
            OnboardingStep.VendorMapping => (await GetVendorMappingMissingItemsAsync(companyId, ct)).Count > 0
                ? "Vendor mapping is incomplete."
                : null,
            OnboardingStep.TaxMapping => (await GetTaxMappingMissingItemsAsync(companyId, ct)).Count > 0
                ? "Tax mapping is incomplete."
                : null,
            OnboardingStep.ItemOverrides => null, // Always valid (optional)
            OnboardingStep.CertificateUpload => (await GetCertificateMissingItemsAsync(companyId, ct)).Count > 0
                ? "Certificate is not configured."
                : null,
            OnboardingStep.SequenceSetup => (await GetSequenceMissingItemsAsync(companyId, ct)).Count > 0
                ? "Sequences are not configured."
                : null,
            _ => null
        };
    }

    private async Task<List<string>> GetFiscalSettingsMissingItemsAsync(Guid companyId, CancellationToken ct)
    {
        var missing = new List<string>();
        var fs = await _db.FiscalSettings.FirstOrDefaultAsync(f => f.CompanyId == companyId, ct);

        if (fs == null)
        {
            missing.Add("Fiscal settings not created.");
            return missing;
        }

        if (string.IsNullOrWhiteSpace(fs.Rnc)) missing.Add("RNC is required.");
        if (string.IsNullOrWhiteSpace(fs.RazonSocial)) missing.Add("Razon Social is required.");

        return missing;
    }

    private async Task<List<string>> GetCustomerMappingMissingItemsAsync(Guid companyId, CancellationToken ct)
    {
        var missing = new List<string>();
        var hasMapped = await _db.CustomerMappings
            .AnyAsync(m => m.CompanyId == companyId && !m.Excluido, ct);

        if (!hasMapped)
            missing.Add("At least 1 customer must be mapped (not excluded).");

        return missing;
    }

    private async Task<List<string>> GetVendorMappingMissingItemsAsync(Guid companyId, CancellationToken ct)
    {
        var missing = new List<string>();
        var hasMapped = await _db.VendorMappings
            .AnyAsync(m => m.CompanyId == companyId && !m.Excluido, ct);

        if (!hasMapped)
            missing.Add("At least 1 vendor must be mapped (not excluded).");

        return missing;
    }

    private async Task<List<string>> GetTaxMappingMissingItemsAsync(Guid companyId, CancellationToken ct)
    {
        var missing = new List<string>();
        var hasMapped = await _db.TaxCodeMappings
            .AnyAsync(m => m.CompanyId == companyId, ct);

        if (!hasMapped)
            missing.Add("At least 1 tax code must be mapped.");

        return missing;
    }

    private async Task<List<string>> GetCertificateMissingItemsAsync(Guid companyId, CancellationToken ct)
    {
        var missing = new List<string>();
        var fs = await _db.FiscalSettings.FirstOrDefaultAsync(f => f.CompanyId == companyId, ct);

        if (fs == null || !fs.CertificateConfigured)
            missing.Add("Digital certificate must be uploaded and configured.");

        return missing;
    }

    private async Task<List<string>> GetSequenceMissingItemsAsync(Guid companyId, CancellationToken ct)
    {
        var missing = new List<string>();
        var hasSequences = await _db.Sequences
            .AnyAsync(s => s.FiscalSettings!.CompanyId == companyId, ct);

        if (!hasSequences)
            missing.Add("At least 1 e-NCF sequence must be configured.");

        return missing;
    }
}
