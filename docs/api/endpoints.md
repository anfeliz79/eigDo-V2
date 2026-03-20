# eigdo v2 — API Endpoints Reference

## Base URL
- **Development**: `http://localhost:5102/api`
- **Production**: `https://api.eigdo.com/api`

## Response Format
All endpoints return `ApiResponse<T>`:
```json
// Success
{ "success": true, "data": <T> }

// Error
{ "success": false, "error": "Error message" }
```

## Authentication
- JWT Bearer token in `Authorization` header
- Claims: `sub` (userId), `company` (`"{companyId}:{Role}"`)
- On 401: frontend clears localStorage, redirects to `/login`

---

## Auth (`/api/Auth`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/api/Auth/register` | No | `{ email, password, firstName, lastName }` | `{ token, refreshToken, user }` |
| POST | `/api/Auth/login` | No | `{ email, password }` | `{ token, refreshToken, user }` |
| POST | `/api/Auth/refresh` | No | `{ refreshToken }` | `{ token, refreshToken }` |
| POST | `/api/Auth/verify-email` | No | `{ token }` | `{ message }` |
| GET | `/api/Auth/me` | Yes | — | `{ id, email, firstName, lastName, companies }` |

---

## Onboarding (`/api/Onboarding`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/Onboarding/status` | Yes | — | `OnboardingStatus` |
| POST | `/api/Onboarding/advance` | Yes | `{ step: "StepName" }` | `OnboardingStatus` |

**OnboardingStatus**:
```json
{
  "currentStep": "CustomerMapping",
  "completionPercentage": 45,
  "steps": [
    { "step": "QboConnection", "completed": true, "label": "..." },
    { "step": "CompanyData", "completed": true, "label": "..." },
    ...
  ]
}
```

---

## QBO Integration (`/api/Qbo`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/Qbo/auth-url` | Yes | — | `{ authUrl }` |
| GET | `/api/Qbo/callback` | No | Query params | Redirect |
| GET | `/api/Qbo/status` | Yes | — | `{ connected, realmId, lastSync, sandbox }` |
| GET | `/api/Qbo/company-info` | Yes | — | `{ companyName, legalName, ein, ... }` |
| POST | `/api/Qbo/sync` | Yes | — | `{ message }` |
| POST | `/api/Qbo/disconnect` | Yes | — | `{ message }` |

---

## Fiscal Settings (`/api/FiscalSettings`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/FiscalSettings` | Yes | — | `FiscalSettingsDto` |
| PUT | `/api/FiscalSettings` | Yes | `FiscalSettingsDto` | `FiscalSettingsDto` |
| POST | `/api/FiscalSettings/certificate` | Yes | Multipart (file + password) | `CertificateInfo` |
| GET | `/api/FiscalSettings/certificate` | Yes | — | `CertificateInfo` |

---

## Customer Mappings (`/api/CustomerMappings`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/CustomerMappings` | Yes | — | `CustomerMapping[]` |
| PUT | `/api/CustomerMappings/{id}` | Yes | `CustomerMappingDto` | `CustomerMapping` |

---

## Vendor Mappings (`/api/VendorMappings`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/VendorMappings` | Yes | — | `VendorMapping[]` |
| PUT | `/api/VendorMappings/{id}` | Yes | `VendorMappingDto` | `VendorMapping` |

---

## Tax Mappings (`/api/TaxMappings`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/TaxMappings` | Yes | — | `TaxMapping[]` |
| PUT | `/api/TaxMappings/{id}` | Yes | `{ billingIndicator }` | `TaxMapping` |

---

## Item Overrides (`/api/ItemOverrides`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/ItemOverrides` | Yes | — | `ItemOverride[]` |
| PUT | `/api/ItemOverrides/{id}` | Yes | `{ unitMeasure, goodServiceIndicator }` | `ItemOverride` |

---

## Sequences (`/api/Sequences`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/Sequences` | Yes | — | `SequenceDto[]` |
| POST | `/api/Sequences` | Yes | `CreateSequenceDto` | `SequenceDto` |
| PUT | `/api/Sequences/{id}` | Yes | `UpdateSequenceDto` | `SequenceDto` |
| DELETE | `/api/Sequences/{id}` | Yes | — | 204 |

**CreateSequenceDto**:
```json
{
  "ecfType": "E31",
  "prefix": "E310000001",
  "rangeStart": 1,
  "rangeEnd": 500,
  "expirationDate": "2026-12-31",
  "isActive": true,
  "alertThreshold": 80
}
```

---

## Documents (`/api/documents`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/documents?page=1&pageSize=20` | Yes | — | `{ items, total }` |
| GET | `/api/documents/stats` | Yes | — | `DocumentStats` |
| GET | `/api/documents/{id}` | Yes | — | `EcfDocument` |

**DocumentStats**:
```json
{
  "total": 150,
  "todayCount": 12,
  "accepted": 140,
  "pending": 5,
  "rejected": 5
}
```

---

## Billing (`/api/billing`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/billing/plans` | No | — | `Plan[]` |
| POST | `/api/billing/checkout` | Yes | `{ planId, gateway }` | `{ sessionUrl }` |
| GET | `/api/billing/subscription` | Yes | — | `SubscriptionDto` |
| POST | `/api/billing/portal` | Yes | — | `{ portalUrl }` |

---

## DGII (`/api/Dgii`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/Dgii/rnc/{rnc}` | Yes | — | `DgiiRncResult` |
| GET | `/api/Dgii/certification-assistance` | Yes | — | `CertAssistanceConfig` |

**DgiiRncResult**:
```json
{
  "rnc": "130123456",
  "razonSocial": "EMPRESA SRL",
  "nombreComercial": "Mi Empresa",
  "estado": "ACTIVO",
  "regimenPagos": "NORMAL",
  "esActivo": true,
  "esFacturadorElectronico": true
}
```

---

## Support (`/api/Support`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/Support/tickets?page=1&pageSize=10` | Yes | — | `{ items, total }` |
| POST | `/api/Support/tickets` | Yes | `{ subject, message, priority }` | `SupportTicket` |
| GET | `/api/Support/tickets/{id}` | Yes | — | `SupportTicketDetail` |
| POST | `/api/Support/tickets/{id}/reply` | Yes | `{ message }` | `SupportTicketMessage` |

---

## Admin (`/api/admin`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/api/admin/login` | No | `{ email, password }` | `{ token }` |
| GET | `/api/admin/companies` | Admin | — | `Company[]` |
| GET | `/api/admin/stats` | Admin | — | `AdminStats` |

---

## Webhooks

### QBO Webhook (`/api/qbo-webhook`)
| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/api/qbo-webhook` | HMAC-SHA256 | Intuit payload | 200 OK |

Verification: `intuit-signature` header contains HMAC-SHA256 of body using `QBO_WEBHOOK_VERIFIER_TOKEN`.

### Stripe Webhook (`/api/billing/webhook`)
| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/api/billing/webhook` | Stripe signature | Stripe event | 200 OK |

---

## Health (`/health`)

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/health` | No | `"Healthy"` (200) or `"Unhealthy"` (503) |
