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
| DocumentsController | GET list, GET detail, GET stats | Authorized |
| EmissionController | POST transform-and-queue, POST preview | Authorized |
| **AdminController** | GET stats, companies, subscriptions, audit-logs | SuperAdmin |

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
- **CTAs navigate to app empresa** via `NEXT_PUBLIC_APP_URL` (default `http://localhost:3002/login`)

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
| Settings — Customers | Done | Customer mapping table + **inline editing** (RNC, razon social, tipo, excluido) |
| Settings — Vendors | Done | Vendor mapping table + **inline editing** (RNC, razon social, tipo, retenciones, excluido) |
| Settings — Taxes | Done | Tax code mapping + **inline editing** (billingIndicator select) |
| Settings — Items | Done | Item override table + **inline editing** (unitMeasure, goodServiceIndicator) |
| Settings — QBO | Done | Connect/disconnect QuickBooks, status display |

### Admin (port 3001) — DONE (v2 with API)
| Component | Status | Description |
|-----------|--------|-------------|
| lib/api.ts | Done | Admin API client — stats, companies, subscriptions, audit logs |
| Login page | Done | Admin-themed login with dark sidebar branding |
| (admin)/layout.tsx | Done | Dark sidebar nav, auth guard |
| Dashboard | Done | **Live stats** from API, recent companies + recent documents |
| Companies | Done | **Live table** with search, pagination, activate/deactivate |
| Plans | Done | 3-tier plan cards, **live subscriber counts**, subscriptions table |
| Audit | Done | **Live audit logs** with action/date filters, pagination |

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
# Option 1: Docker Compose (recommended)
docker compose up -d

# Option 2: Individual containers
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

## Tests (88 passing, 1 skipped)
```bash
cd backend && dotnet test tests/Eigdo.UnitTests/          # 25 tests (RNC validation, webhook HMAC)
cd backend && dotnet test tests/Eigdo.FiscalTests/         # 54 tests (TaxCalculator, RetentionCalculator, DiscountDistributor, PayloadTransformer)
cd backend && dotnet test tests/Eigdo.IntegrationTests/    # 9+1 tests (Health endpoint, Auth flow, WebApplicationFactory)
```

### PayloadTransformer Tests (30 tests)
- Cycle 1 Emisor: sets RNC, razon social, encabezado fields from FiscalSettings
- Cycle 2 Comprador: maps customer for sales e-CFs, handles missing mapping
- Cycle 3 Proveedor: maps vendor for purchase e-CFs, applies retentions for E41
- Cycle 4 Billing Indicator: uses TaxCodeMapping, forced overrides (E43→Special, E44→Special, E46→Itbis0, E47→Special), defaults
- Cycle 5 Item Overrides: applies unitMeasure/goodServiceIndicator overrides, falls back to fiscal defaults
- Tax Calculations: ITBIS 18%, mixed rates (18/16/0), subtotales correctness
- Discounts: global discount proportional distribution
- Line Items: numbering, quantity, descriptions, pagination

## Deployment Infrastructure

### Systemd Services (5 total)
| Service | Description | Port |
|---------|-------------|------|
| `eigdo-api.service` | ASP.NET Core API (Kestrel) | 5000 |
| `eigdo-worker.service` | Background emission/polling worker | — |
| `eigdo-landing.service` | Landing page (Next.js) | 3000 |
| `eigdo-app.service` | Empresa app (Next.js) | 3002 |
| `eigdo-admin.service` | Admin panel (Next.js) | 3001 |

### Nginx Configs (4 vhosts)
| Config | Domain |
|--------|--------|
| `eigdo-api.conf` | `api.eigdo.com` → :5000 |
| `eigdo-landing.conf` | `eigdo.com` / `www.eigdo.com` → :3000 |
| `eigdo-app.conf` | `app.eigdo.com` → :3002 |
| `eigdo-admin.conf` | `admin.eigdo.com` → :3001 |

### Scripts
- `setup-server.sh` — Full Ubuntu VPS setup (dotnet, node, postgres, redis, nginx, certbot, firewall)
- `deploy.sh` — Component-based deploy: `./deploy.sh [all|backend|frontend|landing|app|admin]`
- `backup.sh` — Daily pg_dump cron (2 AM, 30-day retention)

### CI/CD
- GitHub Actions: `.github/workflows/ci.yml`
  - Backend: restore, build, unit tests, fiscal tests (with Postgres + Redis services)
  - Frontend: build landing, app, admin (parallel jobs)

## Remaining Work (Priority Order)
1. **Integration tests** — Full emission flow end-to-end, QBO webhook processing
2. **Alanube Sandbox Certification** — 2-4 weeks process with DGII
3. **Production hardening** — Rate limiting, Sentry, structured logging (Serilog)
