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

## Gestiones de Empresa (`/api/companies`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/companies` | Yes | — | `CompanyDto[]` |
| POST | `/api/companies` | Yes | `CreateCompanyRequest` | `CompanyDto` |

**CompanyDto**:
```json
{
  "id": "guid",
  "name": "Mi Empresa SRL",
  "rnc": "130123456",
  "isOnboardingComplete": true,
  "role": "Owner",
  "subscriptionStatus": "Active",
  "planName": "Pro",
  "hasQboConnection": true
}
```

**CreateCompanyRequest**:
```json
{
  "name": "Nueva Empresa SRL"
}
```

---

## Mapeo de Campos (`/api/FieldMappings`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/FieldMappings/{entityType}` | Yes | — | `FieldMappingResponse[]` |
| PUT | `/api/FieldMappings/{entityType}` | Yes | `SaveFieldMappingsRequest` | `FieldMappingResponse[]` |

`entityType` puede ser: `Customer`, `Vendor`, `Item`.

**FieldMappingResponse**:
```json
{
  "id": "guid",
  "companyId": "guid",
  "entityType": "Customer",
  "targetField": "rnc",
  "sourceType": "QboField",
  "qboFieldPath": "PrimaryTaxIdentifier",
  "fixedValue": null,
  "createdAtUtc": "2026-01-15T10:00:00Z",
  "updatedAtUtc": null
}
```

**SaveFieldMappingsRequest**:
```json
{
  "mappings": [
    {
      "targetField": "rnc",
      "sourceType": "QboField",
      "qboFieldPath": "PrimaryTaxIdentifier",
      "fixedValue": null
    },
    {
      "targetField": "tipoPago",
      "sourceType": "Fixed",
      "qboFieldPath": null,
      "fixedValue": "credito"
    }
  ]
}
```

---

## Perfil de Usuario (`/api/Auth`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/Auth/profile` | Yes | — | `ProfileResponse` |
| PUT | `/api/Auth/profile` | Yes | `UpdateProfileRequest` | `{ message }` |
| PUT | `/api/Auth/password` | Yes | `ChangePasswordRequest` | `{ message }` |

**ProfileResponse**:
```json
{
  "firstName": "Juan",
  "lastName": "Perez",
  "email": "juan@ejemplo.com",
  "systemRole": "User",
  "createdAtUtc": "2026-01-10T08:00:00Z"
}
```

**UpdateProfileRequest**:
```json
{
  "firstName": "Juan",
  "lastName": "Perez"
}
```

**ChangePasswordRequest**:
```json
{
  "currentPassword": "contraseña_actual",
  "newPassword": "nueva_contraseña_8chars"
}
```

---

## Admin (`/api/admin`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/api/admin/login` | No | `{ email, password }` | `{ token }` |
| GET | `/api/admin/companies` | Admin | — | `Company[]` |
| GET | `/api/admin/stats` | Admin | — | `AdminStats` |

---

## Admin — Gestion de Usuarios (`/api/admin/users`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/admin/users` | Admin | — | `AdminUserDto[]` |
| POST | `/api/admin/users` | SuperAdmin/Admin | `CreateAdminUserRequest` | `AdminUserDto` |
| PUT | `/api/admin/users/{id}` | SuperAdmin/Admin | `UpdateAdminUserRequest` | `AdminUserDto` |
| DELETE | `/api/admin/users/{id}` | SuperAdmin | — | `{ message }` |

Solo devuelve usuarios con rol administrativo (SuperAdmin, Admin, Support). DELETE no elimina el usuario, lo desactiva (soft delete).

**AdminUserDto**:
```json
{
  "id": "guid",
  "firstName": "Maria",
  "lastName": "Lopez",
  "email": "maria@eigdo.com",
  "systemRole": "Admin",
  "createdAtUtc": "2026-01-05T12:00:00Z",
  "isActive": true
}
```

**CreateAdminUserRequest**:
```json
{
  "email": "nuevo@eigdo.com",
  "firstName": "Carlos",
  "lastName": "Garcia",
  "password": "password123",
  "systemRole": "Support"
}
```

**UpdateAdminUserRequest** (todos los campos opcionales):
```json
{
  "firstName": "Carlos",
  "lastName": "Garcia",
  "systemRole": "Admin",
  "isActive": false
}
```

---

## Admin — Configuracion Alanube Reseller (`/api/admin/alanube-config`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/admin/alanube-config` | Admin | — | `Dictionary<string, string?>` |
| PUT | `/api/admin/alanube-config` | SuperAdmin/Admin | `Dictionary<string, string?>` | `{ message }` |

Gestiona la configuracion global del reseller de Alanube. Las claves son: `Alanube:BaseUrl`, `Alanube:JwtToken`, `Alanube:Environment`. Los valores secretos se devuelven enmascarados.

**GET Response**:
```json
{
  "Alanube:BaseUrl": "https://api.alanube.co",
  "Alanube:JwtToken": "eyJh****abcd",
  "Alanube:Environment": "production"
}
```

**PUT Request** (enviar solo las claves a actualizar; secretos vacios se ignoran):
```json
{
  "Alanube:BaseUrl": "https://api.alanube.co",
  "Alanube:JwtToken": "nuevo_token_jwt",
  "Alanube:Environment": "sandbox"
}
```

---

## Admin — Configuracion QBO (`/api/admin/qbo-config`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/admin/qbo-config` | Admin | — | `Dictionary<string, string?>` |
| PUT | `/api/admin/qbo-config` | SuperAdmin/Admin | `Dictionary<string, string?>` | `{ message }` |

Gestiona la configuracion global de la aplicacion QuickBooks Online. Las claves son: `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_REDIRECT_URI`, `QBO_ENVIRONMENT`, `QBO_WEBHOOK_VERIFIER_TOKEN`, `QBO_SCOPE`. Los valores secretos se devuelven enmascarados.

**GET Response**:
```json
{
  "QBO_CLIENT_ID": "ABcd1234...",
  "QBO_CLIENT_SECRET": "ABcd****efgh",
  "QBO_REDIRECT_URI": "https://api.eigdo.com/api/Qbo/callback",
  "QBO_ENVIRONMENT": "production",
  "QBO_WEBHOOK_VERIFIER_TOKEN": "abcd****wxyz",
  "QBO_SCOPE": "com.intuit.quickbooks.accounting"
}
```

**PUT Request** (enviar solo las claves a actualizar; secretos vacios se ignoran):
```json
{
  "QBO_CLIENT_ID": "nuevo_client_id",
  "QBO_CLIENT_SECRET": "nuevo_client_secret",
  "QBO_REDIRECT_URI": "https://api.eigdo.com/api/Qbo/callback",
  "QBO_ENVIRONMENT": "sandbox",
  "QBO_WEBHOOK_VERIFIER_TOKEN": "nuevo_verifier",
  "QBO_SCOPE": "com.intuit.quickbooks.accounting"
}
```

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
