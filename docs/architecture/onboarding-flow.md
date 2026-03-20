# eigdo v2 — Onboarding Flow

## Overview

The onboarding wizard guides companies through 8 mandatory steps (+ 1 optional) to configure everything needed for automatic e-CF emission. Steps are **strictly sequential** — you cannot skip ahead.

```
┌─────────────────────────────────────────────────────────────┐
│                    ONBOARDING WIZARD                         │
│                                                              │
│  Step 1   Step 2   Step 3   Step 4   Step 5   Step 6       │
│  ┌─┐      ┌─┐      ┌─┐      ┌─┐      ┌─┐      ┌─┐        │
│  │●│─────▶│●│─────▶│○│─────▶│○│─────▶│○│─────▶│○│        │
│  └─┘      └─┘      └─┘      └─┘      └─┘      └─┘        │
│  QBO      Fiscal   Clientes Proveed. Impuest. Items        │
│                                                (opcional)    │
│                                                              │
│  Step 7   Step 8   Step 9                                   │
│  ┌─┐      ┌─┐      ┌─┐                                     │
│  │○│─────▶│○│─────▶│✓│                                     │
│  └─┘      └─┘      └─┘                                     │
│  Certif.  Secuenc. ¡Listo!                                  │
│                                                              │
│  ● = Completado   ○ = Pendiente   ✓ = Onboarding Completo  │
└─────────────────────────────────────────────────────────────┘
```

## Steps Detail

### Step 1: QBO Connection (`/settings/qbo`)
**Enum**: `OnboardingStep.QboConnection` (value: 1)

**What the user does**:
- Clicks "Conectar QuickBooks"
- Redirected to Intuit OAuth consent screen
- Authorizes eigdo
- Redirected back to `/onboarding?qbo=connected`

**Validation**: Active `QboConnection` record exists for this company

**Frontend flow**:
```
handleConnect() → api.getQboAuthUrl() → window.location.href = authUrl
→ Intuit OAuth → /api/qbo/callback → redirect to /onboarding?qbo=connected
```

**Sandbox mode**: Clicking "Conectar" creates a mock QboConnection with realmId "SANDBOX-xxx"

---

### Step 2: Company Data / Fiscal Settings (`/settings/fiscal`)
**Enum**: `OnboardingStep.CompanyData` (value: 2)

**What the user does**:
- RNC is validated on blur against DGII
- Auto-fills razonSocial, nombreComercial from DGII
- QBO company info pre-fills phone, email, address
- Sets defaults: income type, unit measure, good/service indicator
- Sets province/municipality from DGII catalogs

**Validation**: `FiscalSettings.Rnc` and `FiscalSettings.RazonSocial` are non-empty

**Key behavior**:
- If RNC is INACTIVO in DGII, shows certification assistance modal
- "Obtener desde QBO" button fills data from QBO CompanyInfo
- Province/Municipality dropdowns from seed data (DGII catalogs)

---

### Step 3: Customer Mapping (`/settings/customers`)
**Enum**: `OnboardingStep.CustomerMapping` (value: 3)

**What the user does**:
- Clicks "Sincronizar desde QBO" → creates customer mapping stubs
- For each customer: enters RNC (validated on blur), selects TipoComprobante
- Can mark customers as "Excluido" to skip
- Progress bar shows mapped vs total

**Validation**: At least 1 non-excluded CustomerMapping exists

**Frontend features**:
- Sync button → `POST /api/Qbo/sync`
- RNC blur → `GET /api/Dgii/rnc/{rnc}` → auto-fill razonSocial
- Onboarding nav: "Volver a Datos Fiscales" / "Continuar a Proveedores"

---

### Step 4: Vendor Mapping (`/settings/vendors`)
**Enum**: `OnboardingStep.VendorMapping` (value: 4)

**What the user does**:
- Same as customers + retention rate inputs
- Sets RetentionItbisRate and RetentionIsrRate per vendor
- Info banner explains retention rates

**Validation**: At least 1 non-excluded VendorMapping exists

**Frontend features**:
- Same as customers + retention rate fields
- Onboarding nav: "Volver a Clientes" / "Continuar a Impuestos"

---

### Step 5: Tax Mapping (`/settings/taxes`)
**Enum**: `OnboardingStep.TaxMapping` (value: 5)

**What the user does**:
- Clicks sync to import QBO TaxCodes
- Maps each TaxCode to a BillingIndicator (0-3)
- Sees explanation of what each indicator means

**Validation**: At least 1 TaxCodeMapping exists

**Frontend features**:
- Dropdown per tax code: Exento (0), ITBIS 18% (1), ITBIS 16% (2), ITBIS 0% (3)
- Onboarding nav: "Volver a Proveedores" / "Continuar a Items"

---

### Step 6: Item Overrides (`/settings/items`) — OPTIONAL
**Enum**: `OnboardingStep.ItemOverrides` (value: 6)

**What the user does**:
- Optionally overrides unitMeasure or goodServiceIndicator per QBO item
- Can click "Saltar este paso" to skip entirely

**Validation**: Always passes (optional step)

**Frontend features**:
- "Saltar" (Skip) button that advances to next step
- Onboarding nav: "Volver a Impuestos" / "Continuar a Certificado"

---

### Step 7: Certificate Upload (`/settings/certificate`)
**Enum**: `OnboardingStep.CertificateUpload` (value: 7)

**What the user does**:
- Uploads .p12 or .pfx digital certificate file
- Enters certificate password
- System validates certificate (X509Certificate2)
- Shows certificate details (subject, issuer, expiration)

**Validation**: `FiscalSettings.CertificateConfigured == true`

**Frontend features**:
- Drag & drop or click-to-browse file upload
- Password field with show/hide toggle
- Certificate status: green (valid), amber (expiring), red (expired)
- Onboarding nav: "Volver a Items" / "Continuar a Secuencias"

**Backend**:
- `POST /api/FiscalSettings/certificate` — multipart form upload
- Validates X509Certificate2 with provided password
- Encrypts certificate data via `IEncryptionService`
- Stores in `CertificateStore` table

---

### Step 8: Sequence Setup (`/settings/sequences`)
**Enum**: `OnboardingStep.SequenceSetup` (value: 8)

**What the user does**:
- Creates e-NCF sequences for each e-CF type needed
- Sets prefix, range (start-end), expiration date
- Activates sequences

**Validation**: At least 1 `Sequence` exists for the company

**Frontend features**:
- CRUD table with inline create/edit form
- All 10 e-CF types available (E31-E47)
- Progress bars with color coding (>80% amber, >95% red)
- Status badges: Activa, Agotada, Vencida, Inactiva
- "Completar Configuracion" button

---

### Step 9: Complete
**Enum**: `OnboardingStep.Complete` (value: 9)

**Behavior**: Dashboard shows normal view instead of onboarding banner. System begins processing QBO webhooks for automatic emission.

---

## Backend Advancement Logic

```csharp
// OnboardingService.AdvanceAsync()
public async Task<OnboardingStatus> AdvanceAsync(Guid companyId, OnboardingStep requestedStep)
{
    var current = await GetCurrentStep(companyId);

    // STRICT: must be exactly next step
    if ((int)requestedStep != (int)current + 1)
        throw new InvalidOperationException("Invalid step");

    // Validate ALL previous steps
    foreach (var step in GetStepsUpTo(requestedStep))
    {
        if (!await IsStepValid(companyId, step))
            throw new InvalidOperationException($"Step {step} not complete");
    }

    // Save new step
    await SaveStep(companyId, requestedStep);
    return await GetStatus(companyId);
}
```

## Frontend Navigation Pattern

Each mapping page:
1. On mount: loads data + checks `api.getOnboardingStatus()`
2. Sets `isOnboarding = true` if `completionPercentage < 100`
3. Shows onboarding nav footer when `isOnboarding`
4. "Continuar" button: calls `api.advanceOnboarding(nextStep)` then navigates
5. Advance errors are caught silently — navigation proceeds regardless

```typescript
const handleContinueOnboarding = async () => {
  try {
    await api.advanceOnboarding('NextStepName');
  } catch {} // Silent — let onboarding page show status
  router.push('/settings/next-page');
};
```
