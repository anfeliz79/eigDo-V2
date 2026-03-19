# eigdo v2 — Development Progress

## Architecture

```
eigdo-v2/
├── backend/                    (.NET 8 Clean Architecture)
│   ├── src/
│   │   ├── Eigdo.SharedKernel/     Constants, Extensions (DgiiConstants, RNC validation)
│   │   ├── Eigdo.Domain/           Entities, Enums, Interfaces (IFiscalProvider, ISequenceService, etc.)
│   │   ├── Eigdo.Application/      Services, DTOs, IEigdoDbContext interface
│   │   ├── Eigdo.Infrastructure/   EF Core, Redis, Alanube, QBO integrations
│   │   ├── Eigdo.Api/              Controllers, Program.cs (DI, JWT auth, Swagger)
│   │   └── Eigdo.Worker/           Background workers (emission, status polling)
│   └── tests/
│       ├── Eigdo.UnitTests/
│       ├── Eigdo.FiscalTests/
│       └── Eigdo.IntegrationTests/
├── frontend/
│   ├── landing/   (Next.js 16, port 3000) — Landing page, pricing
│   ├── app/       (Next.js 16, port 3002) — App empresa (dashboard, onboarding, docs)
│   └── admin/     (Next.js 16, port 3001) — Admin panel
└── docker-compose.yml (PostgreSQL, Redis)
```

## Business Rules
- **NO free trials** — purchase only model
- **Logo**: Bold wordmark "eigDo" — "eig" dark + "Do" blue (#2563EB)
- **Currency**: RD$ (Dominican Republic peso)
- **Language**: Spanish (UI and fiscal terms)

## Backend — Completed Components

### Domain Layer
- **22 Entities**: User, RefreshToken, Company, CompanyUser, BillingAccount, Plan, Price, Subscription, PaymentTransaction, CheckoutSession, QboConnection, QboSyncEvent, FiscalSettings, Sequence, PaymentMethodMapping, PaymentConditionMapping, CertificateStore, DgiiProvince, DgiiMunicipality, DgiiUnitMeasure, CustomerMapping, VendorMapping, TaxCodeMapping, ItemOverride, EcfDocument, EcfEvent, ProviderMessage, AuditLog, SupportTicket
- **12 Enums**: BillingIndicator, CompanyRole, DgiiPaymentMethod, DgiiPaymentType, EcfDocumentStatus, EcfType, GoodServiceIndicator, IncomeType, OnboardingStep, PaymentGateway, QboDocumentType, SubscriptionStatus
- **Interfaces**: IFiscalProvider, ISequenceService, IQboClient, IAuditService, IEncryptionService

### Application Layer (Services)
| Service | Status | Description |
|---------|--------|-------------|
| AuthService | Done | JWT login/register, password hashing |
| OnboardingService | Done | Step-by-step onboarding state machine |
| FiscalSettingsService | Done | CRUD for Cycle 1 fiscal data |
| CustomerMappingService | Done | CRUD for Cycle 2 customer maps |
| VendorMappingService | Done | CRUD for Cycle 3 vendor maps |
| TaxMappingService | Done | CRUD for Cycle 4 tax code maps |
| ItemOverrideService | Done | CRUD for Cycle 5 item overrides |
| TaxCalculator | Done | ITBIS calculation (18%, 16%, 0%) — NEVER use QBO tax |
| RetentionCalculator | Done | ITBIS/ISR retention for E41 |
| DiscountDistributor | Done | Proportional QBO discount distribution |
| EmissionValidator | Done | Pre-emission validation (settings, sequences, mappings) |
| EmissionOrchestrator | Done | Validate → assign e-NCF → queue EcfDocument |
| **PayloadTransformer** | Done | 5-cycle QBO→Alanube transformation |
| **QboWebhookHandler** | Done | HMAC-SHA256 verification + entity processing |

### Application Layer (DTOs)
- Auth: LoginRequest, RegisterRequest, AuthResponse
- Onboarding: OnboardingStatusDto, AdvanceStepRequest
- Fiscal: FiscalSettingsDto, PaymentMethodMappingDto, PaymentConditionMappingDto
- Mapping: CustomerMappingDto, VendorMappingDto, TaxCodeMappingDto, ItemOverrideDto
- Emission: EmissionRequestDto, EmissionResultDto, **AlanubePayload** (full DGII e-CF structure)

### Infrastructure Layer
| Component | Status | Description |
|-----------|--------|-------------|
| EigdoDbContext | Done | 22 DbSets, PostgreSQL, snake_case naming |
| AlanubeClient | Done | IFiscalProvider — submit, status polling, annulment |
| QboApiClient | Done | IQboClient — OAuth 2.0 flow, token refresh, entity queries |
| SequenceService | Done | ISequenceService — Redis distributed locks for e-NCF |
| DependencyInjection | Done | All services registered (IEigdoDbContext, Redis, HttpClients) |

### API Layer (Controllers)
| Controller | Endpoints | Auth |
|------------|-----------|------|
| AuthController | POST login, POST register | Anonymous |
| HealthController | GET /health | Anonymous |
| OnboardingController | GET status, POST advance | Authorized |
| FiscalSettingsController | GET, PUT | Authorized |
| CustomerMappingsController | GET, POST, PUT, DELETE | Authorized |
| VendorMappingsController | GET, POST, PUT, DELETE | Authorized |
| TaxMappingsController | GET, POST, PUT, DELETE | Authorized |
| ItemOverridesController | GET, POST, PUT, DELETE | Authorized |
| QboController | GET auth-url, GET callback, GET status, POST disconnect | Mixed |
| **QboWebhookController** | POST /api/qbo-webhook | Anonymous (HMAC) |

### Workers
| Worker | Status | Description |
|--------|--------|-------------|
| EmissionWorker | Done | Polls Draft→Queued docs, submits to Alanube |
| StatusPollingWorker | Done | Polls Submitted docs for Alanube acceptance |

### Database
- PostgreSQL via Docker (postgres/postgres, eigdo_dev)
- Migration: `20260319202157_InitialCreate` — 22 tables, snake_case
- Redis via Docker (port 6379) — sequence locks

## Frontend — Status

### Landing (port 3000) — DONE
- Full conversion-focused landing page
- Navbar, Hero, Problems/Solution, How It Works
- Two profile cards (Empresas/Firmas Contables)
- Pricing section (3 tiers in RD$)
- Final CTA, Footer
- Logo: bold Inter wordmark "eigDo" with dark/blue split
- All CTAs: "Comenzar Ahora" / "Crear Cuenta" (no "Gratis")

### App Empresa (port 3002) — DONE (v1)
| Component | Status | Description |
|-----------|--------|-------------|
| lib/api.ts | Done | API client with full type definitions (all endpoints) |
| lib/auth.tsx | Done | Auth context, localStorage token management |
| components/Logo.tsx | Done | "eigDo" bold wordmark component |
| components/Sidebar.tsx | Done | Nav sidebar with 8 routes, user info, logout |
| Root layout | Done | Inter font, Spanish lang, eigdo metadata |
| (authenticated)/layout.tsx | Done | Auth guard + Sidebar layout wrapper |
| Login page | Done | Login/register toggle, brand panel, error handling |
| Dashboard | Done | Greeting, onboarding banner, stats cards, quick actions, recent docs |
| Onboarding wizard | Done | 7-step progress tracker with step navigation |
| Documents list | Done | Paginated table with status badges, e-NCF, amounts |
| Settings — Fiscal | Done | Full form: RNC, razon social, defaults (income type, unit, etc.) |
| Settings — Customers | Done | Customer mapping table (Cycle 2) |
| Settings — Vendors | Done | Vendor mapping table with retention rates (Cycle 3) |
| Settings — Taxes | Done | Tax code mapping with billing indicator badges (Cycle 4) |
| Settings — Items | Done | Item override table (Cycle 5) |
| Settings — QBO | Done | Connect/disconnect QuickBooks, status display |

### Admin (port 3001) — NOT STARTED
- Company management
- Plan/billing admin
- Audit log viewer

## 5 Mapping Cycles
1. **Emisor** (FiscalSettings): RNC, razón social, defaults (incomeType, unitMeasure, goodServiceIndicator)
2. **Comprador** (CustomerMapping): For sales e-CFs (E31,E32,E34,E44,E45,E46)
3. **Proveedor** (VendorMapping): For purchase e-CFs (E41,E43,E47), retention rates
4. **ITBIS** (TaxCodeMapping): QBO TaxCode → billingIndicator. Forced: E43→4, E44→4, E46→3, E47→4
5. **Items** (ItemOverride): unitMeasure + goodServiceIndicator overrides per QBO item

## e-CF Types
| Type | Name | Direction |
|------|------|-----------|
| E31 | Factura de Crédito Fiscal | Sales |
| E32 | Factura de Consumo | Sales |
| E33 | Nota de Débito | Sales (ref) |
| E34 | Nota de Crédito | Sales (ref) |
| E41 | Comprobante de Compras | Purchase |
| E43 | Gastos Menores | Purchase |
| E44 | Régimen Especial | Sales |
| E45 | Gubernamental | Sales |
| E46 | Exportación | Sales |
| E47 | Pagos al Exterior | Purchase |

## Emission Flow
```
QBO Webhook → QboSyncEvent → PayloadTransformer (5 cycles)
→ EmissionOrchestrator (validate + assign e-NCF) → EcfDocument (Queued)
→ EmissionWorker (submit to Alanube) → EcfDocument (Submitted)
→ StatusPollingWorker (poll trackId) → EcfDocument (Accepted/Rejected)
```

## BillingIndicator Rules
| Value | Name | ITBIS Rate |
|-------|------|------------|
| 0 | NonBillable (Exento) | 0% |
| 1 | Itbis18 | 18% |
| 2 | Itbis16 | 16% |
| 3 | Itbis0 | 0% |
| 4 | Special (Régimen esp.) | 0% |

## Docker Services
```bash
docker run -d --name eigdo-postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16
docker run -d --name eigdo-redis -p 6379:6379 redis:7
```

## Key Commands
```bash
# Backend
cd backend && dotnet build Eigdo.sln
cd backend/src/Eigdo.Api && dotnet run

# Frontend
cd frontend/landing && npm run dev   # port 3000
cd frontend/app && npm run dev       # port 3002
cd frontend/admin && npm run dev     # port 3001
```

## Remaining Work (Priority Order)
1. **Admin Frontend** — company management, plans, billing, audit log
2. **Documents Controller** — GET /documents endpoint (paginated list, filters)
3. **Emission API** — POST /emit endpoint that triggers full flow
4. **Testing** — Unit tests for TaxCalculator, PayloadTransformer, RetentionCalculator
5. **Docker Compose** — All services in one compose file for local dev
6. **Deployment** — Env config, production Docker, CI/CD
7. **Alanube Sandbox Certification** — 2-4 weeks process with DGII
