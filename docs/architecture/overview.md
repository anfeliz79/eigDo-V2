# eigdo v2 — Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        LiquidWeb VPS                            │
│                     Ubuntu 22.04 (69.167.167.18)                │
│                                                                 │
│  ┌──────────┐   ┌──────────────────────────────────────────┐   │
│  │  Nginx   │   │           Applications                    │   │
│  │ (SSL +   │   │                                           │   │
│  │  Proxy)  │──▶│  eigdo-api.service     → localhost:5000   │   │
│  │          │   │  eigdo-worker.service   → background      │   │
│  │ :80/:443 │   │  eigdo-landing.service  → localhost:3000  │   │
│  └──────────┘   │  eigdo-app.service      → localhost:3002  │   │
│                  │  eigdo-admin.service    → localhost:3001  │   │
│                  └──────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │  PostgreSQL 16   │  │    Redis 7       │                    │
│  │  eigdo_production│  │  Locks + Cache   │                    │
│  │  :5432           │  │  :6379           │                    │
│  └──────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘

External Services:
  ├── QuickBooks Online API (OAuth 2.0 + Webhooks)
  ├── Alanube (e-CF submission to DGII)
  ├── Stripe (payment processing)
  ├── Azul (Dominican payment gateway)
  └── DGII (RNC lookup via web scraping)
```

## Domain Mapping

```
eigdo.com / www.eigdo.com  →  Nginx  →  eigdo-landing  (port 3000)
api.eigdo.com              →  Nginx  →  eigdo-api      (port 5000)
app.eigdo.com              →  Nginx  →  eigdo-app      (port 3002)
admin.eigdo.com            →  Nginx  →  eigdo-admin    (port 3001)
```

## Backend Clean Architecture

```
Eigdo.Api (Controllers)
    │
    ▼
Eigdo.Application (Services, DTOs, Validators)
    │
    ▼
Eigdo.Domain (Entities, Enums, Interfaces, Events)
    │
    ▲
Eigdo.Infrastructure (EF Core, External APIs, Encryption)
    │
Eigdo.SharedKernel (Cross-cutting utilities)
```

### Controllers (18)
| Controller | Route | Purpose |
|-----------|-------|---------|
| AuthController | `/api/Auth` | Login, register, refresh, verify email |
| OnboardingController | `/api/Onboarding` | Status, advance step |
| QboController | `/api/Qbo` | OAuth, sync, status, disconnect |
| QboWebhookController | `/api/qbo-webhook` | Intuit webhook receiver |
| FiscalSettingsController | `/api/FiscalSettings` | Fiscal config + certificate upload |
| CustomerMappingsController | `/api/CustomerMappings` | Customer CRUD |
| VendorMappingsController | `/api/VendorMappings` | Vendor CRUD |
| TaxMappingsController | `/api/TaxMappings` | Tax code CRUD |
| ItemOverridesController | `/api/ItemOverrides` | Item override CRUD |
| SequencesController | `/api/Sequences` | e-NCF sequence CRUD |
| DocumentsController | `/api/documents` | e-CF document list + stats |
| EmissionController | `/api/emission` | Manual emission triggers |
| BillingController | `/api/billing` | Plans, checkout, subscription |
| DgiiController | `/api/Dgii` | RNC lookup, certification assistance |
| AdminController | `/api/admin` | SuperAdmin operations |
| SupportController | `/api/Support` | Support tickets |
| HealthController | `/health` | Health checks |

### Application Services
| Service | Purpose |
|---------|---------|
| AuthService | JWT authentication, registration, token refresh |
| OnboardingService | 9-step wizard validation and advancement |
| FiscalSettingsService | Company fiscal configuration |
| CustomerMappingService | QBO Customer → DGII buyer mapping |
| VendorMappingService | QBO Vendor → DGII vendor mapping + retentions |
| TaxMappingService | QBO TaxCode → BillingIndicator mapping |
| ItemOverrideService | Optional per-item overrides |
| SequenceService | e-NCF number sequences with Redis locks |
| SubscriptionService | Plan enforcement, monthly limits |
| CheckoutService | Stripe + Azul checkout sessions |
| EmissionOrchestrator | Main emission pipeline |
| PayloadTransformer | QBO → Alanube 5-cycle transformation |
| EmissionValidator | All blocking rules before emission |
| TaxCalculator | Server-side ITBIS recalculation |
| RetentionCalculator | ITBIS/ISR retention for E41 |
| DiscountDistributor | Proportional discount distribution |
| QboWebhookHandler | HMAC verification + enqueue |

## Data Flow: Invoice Emission

```
1. QBO Webhook → QboWebhookHandler (HMAC verify)
2. EmissionOrchestrator fetches QBO document
3. EmissionValidator checks:
   ├── Subscription active?
   ├── Onboarding complete?
   ├── Customer/Vendor mapped?
   ├── TaxCodes mapped?
   ├── Sequence available?
   ├── Payment methods mapped?
   └── Monthly limit not exceeded?
4. PayloadTransformer applies 5 cycles:
   ├── Cycle 1: Sender defaults (FiscalSettings)
   ├── Cycle 2/3: Buyer/Vendor mapping
   ├── Cycle 4: TaxCode → billingIndicator
   ├── Cycle 5: Item overrides
   ├── DiscountDistributor (if global discount)
   ├── RetentionCalculator (E41 services)
   └── TaxCalculator (ITBIS recalculation)
5. SequenceService assigns e-NCF (Redis lock)
6. EcfDocument saved as Queued
7. Worker dequeues → AlanubeClient.SubmitAsync()
8. Result: Accepted/Rejected/Retry
```

## Security Model

| Layer | Implementation |
|-------|---------------|
| Authentication | JWT HS256 (access + refresh tokens) |
| Authorization | Role-based: Owner, Admin, Billing, Operator |
| Encryption at rest | AES-256 via ASP.NET Data Protection API |
| Token storage | QBO OAuth tokens encrypted in DB |
| Certificate storage | .p12 files encrypted in CertificateStore table |
| Transport | TLS 1.2/1.3 via Let's Encrypt + Nginx |
| CORS | Restrictive: only eigdo.com domains |
| Rate limiting | Per-IP: 100/min global, 10/min auth, 500/min webhooks |
| Firewall | UFW: only ports 22, 80, 443 |
| Secrets | EnvironmentFile in systemd, never in code |
