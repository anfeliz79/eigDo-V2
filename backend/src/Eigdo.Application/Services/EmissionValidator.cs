using Eigdo.Application.DTOs.Emission;
using Eigdo.Application.Interfaces;
using Eigdo.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Eigdo.Application.Services;

/// <summary>
/// Validates ALL preconditions before e-CF emission.
/// Returns a list of blocking error messages (in Spanish for end users).
/// </summary>
public class EmissionValidator
{
    private readonly IEigdoDbContext _db;

    public EmissionValidator(IEigdoDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Full validation against the EmissionContext.
    /// Returns an empty list when all checks pass.
    /// </summary>
    public async Task<List<string>> ValidateAsync(EmissionContext context, CancellationToken ct = default)
    {
        var errors = new List<string>();

        // ── 1. Company exists ──────────────────────────────────────────
        var companyExists = await _db.Companies
            .AnyAsync(c => c.Id == context.CompanyId, ct);

        if (!companyExists)
        {
            errors.Add("Empresa no encontrada.");
            return errors;
        }

        // ── 2. Fiscal settings / onboarding complete ───────────────────
        var fiscal = await _db.FiscalSettings
            .FirstOrDefaultAsync(fs => fs.CompanyId == context.CompanyId, ct);

        if (fiscal is null)
        {
            errors.Add("Datos fiscales no configurados. Completa el onboarding primero.");
            return errors;
        }

        if (string.IsNullOrWhiteSpace(fiscal.Rnc))
            errors.Add("RNC no configurado en los datos fiscales.");

        if (!fiscal.CertificateConfigured)
            errors.Add("Certificado digital no configurado.");

        var isSandbox = string.Equals(fiscal.AlanubeEnvironment, "sandbox", StringComparison.OrdinalIgnoreCase);

        // ── 3. Subscription check (skip in sandbox) ────────────────────
        if (!isSandbox)
        {
            var subscription = await _db.BillingAccounts
                .Where(ba => ba.CompanyId == context.CompanyId)
                .SelectMany(ba => ba.Subscriptions)
                .Where(s => s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trial)
                .Include(s => s.Plan)
                .FirstOrDefaultAsync(ct);

            if (subscription is null)
            {
                errors.Add("No tienes una suscripcion activa. Activa un plan para emitir comprobantes.");
            }
            else
            {
                // ── 8. Monthly document limit ──────────────────────────
                var monthlyLimit = subscription.Plan.IncludedDocumentsPerMonth;
                if (monthlyLimit > 0 && subscription.DocumentsEmittedThisPeriod >= monthlyLimit)
                {
                    errors.Add($"Has alcanzado el limite mensual de {monthlyLimit} documentos para tu plan.");
                }
            }
        }

        // ── 4. Customer/Vendor mapping ─────────────────────────────────
        if (IsSalesEcf(context.EcfType))
        {
            var customer = await _db.CustomerMappings
                .FirstOrDefaultAsync(cm => cm.CompanyId == context.CompanyId
                    && cm.QboCustomerId == context.QboSourceId, ct);

            if (customer is null)
            {
                errors.Add("Mapeo de cliente no encontrado para este cliente QBO.");
            }
            else
            {
                if (customer.Excluido)
                    errors.Add("El cliente esta excluido de la emision de e-CF.");

                // E32 (consumer) allows anonymous buyers — no RNC required
                if (string.IsNullOrWhiteSpace(customer.Rnc) && context.EcfType != EcfType.E32)
                    errors.Add("RNC del cliente no configurado.");
            }
        }

        if (IsPurchaseEcf(context.EcfType))
        {
            var vendor = await _db.VendorMappings
                .FirstOrDefaultAsync(vm => vm.CompanyId == context.CompanyId
                    && vm.QboVendorId == context.QboSourceId, ct);

            if (vendor is null)
            {
                errors.Add("Mapeo de proveedor no encontrado para este proveedor QBO.");
            }
            else
            {
                if (vendor.Excluido)
                    errors.Add("El proveedor esta excluido de la emision de e-CF.");

                if (string.IsNullOrWhiteSpace(vendor.Rnc))
                    errors.Add("RNC del proveedor no configurado.");

                // E41 with services requires retention rates
                if (context.EcfType == EcfType.E41 && context.HasServiceItems)
                {
                    if (vendor.RetentionItbisRate is null)
                        errors.Add("Tasa de retencion ITBIS del proveedor no configurada (requerida para E41).");
                    if (vendor.RetentionIsrRate is null)
                        errors.Add("Tasa de retencion ISR del proveedor no configurada (requerida para E41).");
                }
            }
        }

        // ── 5. All referenced tax codes are mapped ─────────────────────
        if (context.QboTaxCodeIds.Count > 0)
        {
            var mappedTaxCodes = await _db.TaxCodeMappings
                .Where(tc => tc.CompanyId == context.CompanyId
                    && context.QboTaxCodeIds.Contains(tc.QboTaxCodeId))
                .Select(tc => tc.QboTaxCodeId)
                .ToListAsync(ct);

            var unmapped = context.QboTaxCodeIds
                .Except(mappedTaxCodes)
                .ToList();

            foreach (var code in unmapped)
            {
                errors.Add($"El codigo de impuesto QBO '{code}' no tiene un mapeo configurado.");
            }
        }
        else
        {
            // At minimum, some tax mappings should exist
            var hasTaxMappings = await _db.TaxCodeMappings
                .AnyAsync(tc => tc.CompanyId == context.CompanyId, ct);

            if (!hasTaxMappings)
                errors.Add("No hay mapeos de codigos de impuestos configurados.");
        }

        // ── 6. Sequence available ──────────────────────────────────────
        var hasSequence = await _db.Sequences
            .AnyAsync(s => s.FiscalSettings.CompanyId == context.CompanyId
                && s.EcfType == context.EcfType
                && s.IsActive
                && s.DueDateUtc > DateTime.UtcNow
                && s.CurrentValue < s.RangeEnd, ct);

        if (!hasSequence)
            errors.Add($"No hay secuencia disponible para {context.EcfType}. Verifica que una secuencia este activa, no expirada y no agotada.");

        // ── 7. Payment method mappings ─────────────────────────────────
        var hasPaymentMappings = await _db.PaymentMethodMappings
            .AnyAsync(pm => pm.FiscalSettings.CompanyId == context.CompanyId, ct);

        if (!hasPaymentMappings)
            errors.Add("No hay mapeos de metodos de pago configurados.");

        return errors;
    }

    /// <summary>
    /// Simplified validation overload used by EmissionOrchestrator (backward compat).
    /// </summary>
    public async Task<(bool IsValid, List<string> Errors)> ValidateAsync(
        Guid companyId, EcfType ecfType, string qboSourceId, CancellationToken ct)
    {
        var context = new EmissionContext
        {
            CompanyId = companyId,
            EcfType = ecfType,
            QboSourceId = qboSourceId
        };

        var errors = await ValidateAsync(context, ct);
        return (errors.Count == 0, errors);
    }

    public static bool IsSalesEcf(EcfType ecfType) =>
        ecfType is EcfType.E31 or EcfType.E32 or EcfType.E33
            or EcfType.E34 or EcfType.E44 or EcfType.E45 or EcfType.E46;

    public static bool IsPurchaseEcf(EcfType ecfType) =>
        ecfType is EcfType.E41 or EcfType.E43 or EcfType.E47;
}
