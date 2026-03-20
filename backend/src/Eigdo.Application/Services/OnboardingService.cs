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
    private const int TotalSteps = 8;

    // Ordered list of required steps (strict sequential order)
    private static readonly OnboardingStep[] RequiredSteps =
    {
        OnboardingStep.QboConnection,
        OnboardingStep.CompanyData,
        OnboardingStep.CustomerMapping,
        OnboardingStep.VendorMapping,
        OnboardingStep.TaxMapping,
        OnboardingStep.ItemOverrides,
        OnboardingStep.CertificateUpload,
        OnboardingStep.SequenceSetup
    };

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
            return (null, "Empresa no encontrada.");

        var missingItems = new Dictionary<OnboardingStep, List<string>>();
        var completedSteps = 0;

        // Step 1: QboConnection
        var qboMissing = await GetQboConnectionMissingItemsAsync(companyId, ct);
        if (qboMissing.Count > 0)
            missingItems[OnboardingStep.QboConnection] = qboMissing;
        else
            completedSteps++;

        // Step 2: CompanyData (FiscalSettings)
        var fiscalMissing = await GetFiscalSettingsMissingItemsAsync(companyId, ct);
        if (fiscalMissing.Count > 0)
            missingItems[OnboardingStep.CompanyData] = fiscalMissing;
        else
            completedSteps++;

        // Step 3: CustomerMapping
        var customerMissing = await GetCustomerMappingMissingItemsAsync(companyId, ct);
        if (customerMissing.Count > 0)
            missingItems[OnboardingStep.CustomerMapping] = customerMissing;
        else
            completedSteps++;

        // Step 4: VendorMapping
        var vendorMissing = await GetVendorMappingMissingItemsAsync(companyId, ct);
        if (vendorMissing.Count > 0)
            missingItems[OnboardingStep.VendorMapping] = vendorMissing;
        else
            completedSteps++;

        // Step 5: TaxMapping
        var taxMissing = await GetTaxMappingMissingItemsAsync(companyId, ct);
        if (taxMissing.Count > 0)
            missingItems[OnboardingStep.TaxMapping] = taxMissing;
        else
            completedSteps++;

        // Step 6: ItemOverrides — optional, always valid
        completedSteps++;

        // Step 7: CertificateUpload
        var certMissing = await GetCertificateMissingItemsAsync(companyId, ct);
        if (certMissing.Count > 0)
            missingItems[OnboardingStep.CertificateUpload] = certMissing;
        else
            completedSteps++;

        // Step 8: SequenceSetup
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
            return (null, "Empresa no encontrada.");

        // Validate the requested step is the next one (strict sequential)
        if ((int)step != (int)company.OnboardingStep + 1)
            return (null, $"No puedes avanzar a {step}. Debes completar el paso actual ({company.OnboardingStep}) primero.");

        // Validate ALL previous steps are complete (strict gating)
        for (var i = OnboardingStep.QboConnection; i <= company.OnboardingStep; i++)
        {
            var validationError = await ValidateStepCompleteAsync(companyId, i, ct);
            if (validationError != null)
                return (null, $"El paso {i} no esta completo: {validationError}");
        }

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
            return (null, "Empresa no encontrada.");

        // Validate ALL required steps are complete (excluding ItemOverrides which is optional)
        var requiredValidation = new[]
        {
            OnboardingStep.QboConnection,
            OnboardingStep.CompanyData,
            OnboardingStep.CustomerMapping,
            OnboardingStep.VendorMapping,
            OnboardingStep.TaxMapping,
            // ItemOverrides is optional
            OnboardingStep.CertificateUpload,
            OnboardingStep.SequenceSetup
        };

        foreach (var step in requiredValidation)
        {
            var error = await ValidateStepCompleteAsync(companyId, step, ct);
            if (error != null)
                return (null, $"El paso {step} no esta completo: {error}");
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
            OnboardingStep.QboConnection => (await GetQboConnectionMissingItemsAsync(companyId, ct)).Count > 0
                ? "QuickBooks Online no esta conectado."
                : null,
            OnboardingStep.CompanyData => (await GetFiscalSettingsMissingItemsAsync(companyId, ct)).Count > 0
                ? "Los datos fiscales estan incompletos."
                : null,
            OnboardingStep.CustomerMapping => (await GetCustomerMappingMissingItemsAsync(companyId, ct)).Count > 0
                ? "El mapeo de clientes esta incompleto."
                : null,
            OnboardingStep.VendorMapping => (await GetVendorMappingMissingItemsAsync(companyId, ct)).Count > 0
                ? "El mapeo de proveedores esta incompleto."
                : null,
            OnboardingStep.TaxMapping => (await GetTaxMappingMissingItemsAsync(companyId, ct)).Count > 0
                ? "El mapeo de impuestos esta incompleto."
                : null,
            OnboardingStep.ItemOverrides => null, // Always valid (optional)
            OnboardingStep.CertificateUpload => (await GetCertificateMissingItemsAsync(companyId, ct)).Count > 0
                ? "El certificado digital no esta configurado."
                : null,
            OnboardingStep.SequenceSetup => (await GetSequenceMissingItemsAsync(companyId, ct)).Count > 0
                ? "Las secuencias e-NCF no estan configuradas."
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
            missing.Add("Los datos fiscales no han sido configurados.");
            return missing;
        }

        if (string.IsNullOrWhiteSpace(fs.Rnc)) missing.Add("El RNC es obligatorio.");
        if (string.IsNullOrWhiteSpace(fs.RazonSocial)) missing.Add("La Razon Social es obligatoria.");

        return missing;
    }

    /// <summary>
    /// Validates that QBO is connected and the company hasn't exceeded
    /// the MaxCompanies limit from its subscription plan.
    /// </summary>
    private async Task<List<string>> GetQboConnectionMissingItemsAsync(Guid companyId, CancellationToken ct)
    {
        var missing = new List<string>();

        // Check if QBO is connected
        var qboConnection = await _db.QboConnections
            .FirstOrDefaultAsync(q => q.CompanyId == companyId && q.IsActive, ct);

        if (qboConnection == null)
        {
            missing.Add("Debes conectar QuickBooks Online para continuar.");
            return missing;
        }

        // Validate subscription MaxCompanies limit
        var billingAccount = await _db.BillingAccounts
            .FirstOrDefaultAsync(ba => ba.CompanyId == companyId, ct);

        if (billingAccount != null)
        {
            var activeSubscription = await _db.Subscriptions
                .Include(s => s.Plan)
                .FirstOrDefaultAsync(s => s.BillingAccountId == billingAccount.Id
                    && (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trial), ct);

            if (activeSubscription != null)
            {
                // Count total active QBO connections across all companies in this billing account
                var allCompanyIds = await _db.BillingAccounts
                    .Where(ba => ba.Id == billingAccount.Id)
                    .Select(ba => ba.CompanyId)
                    .ToListAsync(ct);

                var activeQboConnections = await _db.QboConnections
                    .CountAsync(q => allCompanyIds.Contains(q.CompanyId) && q.IsActive, ct);

                if (activeQboConnections > activeSubscription.Plan.MaxCompanies)
                {
                    missing.Add($"Tu plan {activeSubscription.Plan.Name} permite hasta {activeSubscription.Plan.MaxCompanies} empresa(s) conectada(s). Actualmente tienes {activeQboConnections}.");
                }
            }
        }

        return missing;
    }

    private async Task<List<string>> GetCustomerMappingMissingItemsAsync(Guid companyId, CancellationToken ct)
    {
        var missing = new List<string>();
        var hasMapped = await _db.CustomerMappings
            .AnyAsync(m => m.CompanyId == companyId && !m.Excluido, ct);

        if (!hasMapped)
            missing.Add("Al menos 1 cliente debe estar mapeado (no excluido).");

        return missing;
    }

    private async Task<List<string>> GetVendorMappingMissingItemsAsync(Guid companyId, CancellationToken ct)
    {
        var missing = new List<string>();
        var hasMapped = await _db.VendorMappings
            .AnyAsync(m => m.CompanyId == companyId && !m.Excluido, ct);

        if (!hasMapped)
            missing.Add("Al menos 1 proveedor debe estar mapeado (no excluido).");

        return missing;
    }

    private async Task<List<string>> GetTaxMappingMissingItemsAsync(Guid companyId, CancellationToken ct)
    {
        var missing = new List<string>();
        var hasMapped = await _db.TaxCodeMappings
            .AnyAsync(m => m.CompanyId == companyId, ct);

        if (!hasMapped)
            missing.Add("Al menos 1 codigo de impuesto debe estar mapeado.");

        return missing;
    }

    private async Task<List<string>> GetCertificateMissingItemsAsync(Guid companyId, CancellationToken ct)
    {
        var missing = new List<string>();
        var fs = await _db.FiscalSettings.FirstOrDefaultAsync(f => f.CompanyId == companyId, ct);

        if (fs == null || !fs.CertificateConfigured)
            missing.Add("El certificado digital debe ser subido y configurado.");

        return missing;
    }

    private async Task<List<string>> GetSequenceMissingItemsAsync(Guid companyId, CancellationToken ct)
    {
        var missing = new List<string>();
        var hasSequences = await _db.Sequences
            .AnyAsync(s => s.FiscalSettings!.CompanyId == companyId, ct);

        if (!hasSequences)
            missing.Add("Al menos 1 secuencia e-NCF debe estar configurada.");

        return missing;
    }
}
