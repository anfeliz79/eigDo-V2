# eigdo v2 — Project Memory

## What is eigdo
SaaS that connects QuickBooks Online (QBO) with Dominican Republic's mandatory electronic invoicing (e-CF / DGII), using Alanube as fiscal provider. All e-CF types (E31-E47) supported from day one.

**Deadline**: Mayo 15, 2026 (Fase 3 DGII obligatoria para PyMEs)

---

## Business Rules
- **Language**: ALL user-facing text in Spanish. Code, comments, and variable names in English
- **Currency**: RD$ (Dominican Republic peso / DOP)
- **No free trials** — purchase only model
- **Logo**: Bold wordmark "eigDo" — "eig" dark + "Do" blue (#2563EB)
- **ITBIS rule**: eigdo NEVER uses QBO tax amounts. TaxCalculator always recalculates ITBIS based on billingIndicator from TaxCodeMapping
- **Payload rule**: The fiscal payload (Alanube JSON) is ALWAYS built server-side. The frontend NEVER constructs fiscal payloads

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | .NET 8 / ASP.NET Core / Clean Architecture |
| Database | PostgreSQL 16 (snake_case naming convention) |
| Cache/Locks | Redis 7 |
| Frontend | 3 Next.js apps: `app` (empresa), `admin` (superadmin), `landing` (public) |
| Deploy | Systemd services + Nginx on Ubuntu (LiquidWeb VPS). NO Docker |
| Payments | Stripe + Azul |
| Fiscal Provider | Alanube (abstracted via `IFiscalProvider` for future swap) |

---

## Monorepo Structure
```
eigdo-v2/
├── backend/src/
│   ├── Eigdo.Api/              # ASP.NET Core Web API (port 5102)
│   ├── Eigdo.Worker/           # Background job processor
│   ├── Eigdo.Domain/           # Entities, enums, domain events, interfaces
│   ├── Eigdo.Application/      # Services, DTOs, validators
│   ├── Eigdo.Infrastructure/   # EF Core, Alanube client, QBO client, encryption
│   └── Eigdo.SharedKernel/     # Cross-cutting utilities
├── frontend/
│   ├── app/                    # Next.js — Company app (port 3000)
│   ├── admin/                  # Next.js — SuperAdmin panel (port 3001)
│   └── landing/                # Next.js — Public site (port 3002)
├── infra/
│   ├── nginx/                  # Nginx configs (api, app, admin, landing)
│   ├── systemd/                # 5 service files (api, worker, app, admin, landing)
│   └── scripts/                # deploy.sh, setup-server.sh, backup.sh
└── backend/tests/
    ├── Eigdo.UnitTests/
    ├── Eigdo.IntegrationTests/
    └── Eigdo.FiscalTests/
```

---

## Build & Run Commands

```bash
# Backend
cd backend && dotnet build            # Build all projects
cd backend && dotnet test              # Run all tests
cd backend/src/Eigdo.Api && dotnet run # Start API (port 5000)

# Frontend (each app)
cd frontend/app && npm run dev         # Dev server (port 3000)
cd frontend/app && npx next build      # Production build (validates types)

# Database
cd backend/src/Eigdo.Api && dotnet ef migrations add <Name> --project ../Eigdo.Infrastructure
cd backend/src/Eigdo.Api && dotnet ef database update --project ../Eigdo.Infrastructure
```

---

## API Architecture

### Response Wrapper
ALL API responses use `ApiResponse<T>`:
```csharp
{ "success": true, "data": T }           // Success
{ "success": false, "error": "message" }  // Error
```
Frontend (`api.ts`) auto-unwraps this — methods return `T` directly.

### Route Convention
- `[Route("api/[controller]")]` generates **PascalCase** routes
- Frontend calls: `/api/FiscalSettings`, `/api/CustomerMappings`, `/api/VendorMappings`, `/api/TaxMappings`, `/api/ItemOverrides`
- Hardcoded routes: `/api/documents`, `/api/admin`, `/api/emission`, `/api/qbo-webhook`
- QBO routes: `/api/Qbo/auth-url`, `/api/Qbo/status`, `/api/Qbo/company-info`, `/api/Qbo/disconnect`, `/api/Qbo/sync`
- DGII routes: `/api/Dgii/rnc/{rnc}`, `/api/Dgii/certification-assistance`
- Billing routes: `/api/billing/plans`, `/api/billing/checkout`, `/api/billing/subscription`, `/api/billing/portal`

### Authentication
- JWT HS256 with claims: `sub` (userId), `company` claim format: `"{companyId}:{Role}"`
- `EigdoControllerBase` provides: `GetCompanyId()`, `GetUserId()`, `GetCompanyRole()`
- Token in header: `Authorization: Bearer {token}`
- Frontend stores: `eigdo_token` and `eigdo_user` in localStorage
- On 401: auto-clears storage and redirects to `/login`

### Rate Limiting
- Global: 100 req/min per IP
- Auth endpoints: 10 req/min per IP
- Webhooks: 500 req/min

---

## Database Conventions
- **All table/column names**: snake_case (EF Core convention applied globally)
- **Base entity**: All entities extend `BaseEntity` with `Id` (Guid), `CreatedAtUtc`, `UpdatedAtUtc`
- **Soft tenancy**: `CompanyId` foreign key on all tenant-scoped entities
- **Encryption at rest**: QBO OAuth tokens and .p12 certificates stored encrypted via `IEncryptionService` (AES-256 / Data Protection API)
- **DbContext**: `EigdoDbContext` with ~27 DbSets organized by domain (Identity, Tenancy, Billing, Integration, Fiscal, Mapping, Emission, Support)

---

## QBO Integration

### Sandbox Mode
```csharp
private bool IsSandboxMode => string.IsNullOrEmpty(_config.GetValue<string>("QBO_CLIENT_ID"));
```
When `QBO_CLIENT_ID` is empty in config, ALL QBO endpoints return simulated data. Set in `appsettings.Development.json`.

### Token Lifecycle
- QBO access tokens expire in ~1 hour
- `EnsureValidToken()` in QboController auto-refreshes tokens 5 minutes before expiration
- If refresh fails, marks `QboConnection.IsActive = false`
- Tokens stored encrypted via `IEncryptionService`

### Sync Endpoint (`POST /api/Qbo/sync`)
In sandbox mode, creates mock mapping stubs:
- 6 customers (default E32), 4 vendors (default E41), 4 tax codes, 4 items
In production, fetches real data from QBO API and creates/updates mappings.

### OAuth Flow
1. `GET /api/Qbo/auth-url` → returns Intuit OAuth URL
2. User authorizes → Intuit redirects to `/api/qbo/callback`
3. Controller exchanges code for tokens, encrypts & stores, creates `QboConnection`
4. Frontend redirected to `/onboarding?qbo=connected`

---

## Onboarding (strict sequential gating)

### Steps (enum `OnboardingStep` values 0-9)
```
0. NotStarted
1. QboConnection       → Connect QuickBooks
2. CompanyData         → Fiscal settings (RNC, razon social, defaults)
3. CustomerMapping     → Map QBO customers to DGII data
4. VendorMapping       → Map QBO vendors to DGII data + retentions
5. TaxMapping          → Map QBO TaxCodes to billing indicators
6. ItemOverrides       → Override unit measure / good-service per item (OPTIONAL)
7. CertificateUpload   → Digital certificate (.p12)
8. SequenceSetup       → e-NCF number sequences
9. Complete
```

### Advancement Rules
- `POST /api/Onboarding/advance` with `{ step: "StepName" }`
- Backend validates: `(int)requestedStep == (int)currentStep + 1` (strict +1)
- Backend validates ALL previous steps are complete before advancing
- Frontend catches advance errors silently — navigates to next page anyway
- ItemOverrides (step 6) is always valid (optional step)

### Validation per Step
- **QboConnection**: Active `QboConnection` exists + subscription max companies not exceeded
- **CompanyData**: `FiscalSettings` has non-empty RNC and RazonSocial
- **CustomerMapping**: At least 1 non-excluded customer mapping exists
- **VendorMapping**: At least 1 non-excluded vendor mapping exists
- **TaxMapping**: At least 1 tax code mapping exists
- **ItemOverrides**: Always valid (optional)
- **CertificateUpload**: `FiscalSettings.CertificateConfigured == true`
- **SequenceSetup**: At least 1 `Sequence` exists for the company

---

## 5 Mapping Cycles (QBO to Alanube e-CF)

1. **Emisor** (FiscalSettings): RNC, razon social, address, defaults (income type, unit measure, good/service indicator)
2. **Comprador** (CustomerMapping): QBO Customer → DGII buyer. Fields: RNC, RazonSocialDgii, TipoComprobante, Excluido. For E31, E32, E34, E44, E45, E46
3. **Proveedor** (VendorMapping): QBO Vendor → DGII vendor. Fields: RNC, RazonSocialDgii, TipoComprobante, RetentionItbisRate, RetentionIsrRate, Excluido. For E41, E43, E47
4. **ITBIS** (TaxCodeMapping): QBO TaxCode → BillingIndicator (0=Exento, 1=ITBIS18%, 2=ITBIS16%, 3=ITBIS0%, 4=Especial). Forced overrides: E43→4, E44→4, E46→3, E47→4
5. **Items** (ItemOverride): Optional per-item overrides for unitMeasure and goodServiceIndicator

---

## e-CF Types and QBO Sources

| e-CF | Name | QBO Source | Mapping Cycle | Alanube Endpoint |
|------|------|-----------|---------------|-----------------|
| E31 | Credito Fiscal | Invoice | Customer (2) | `/invoice-fiscals` |
| E32 | Consumo | Invoice | Customer (2) | `/invoices` |
| E33 | Nota de Debito | Manual/eigdo | Customer (2) | `/debit-notes` |
| E34 | Nota de Credito | CreditMemo/RefundReceipt | Customer (2) | `/credit-notes` |
| E41 | Compras | Bill | Vendor (3) | `/purchases` |
| E43 | Gastos Menores | Expense/Purchase | Vendor (3) | `/minor-expenses` |
| E44 | Regimen Especial | Invoice | Customer (2) | `/special-regimes` |
| E45 | Gubernamental | Invoice | Customer (2) | `/gubernamentals` |
| E46 | Exportacion | Invoice | Customer (2) | `/export-supports` |
| E47 | Pagos al Exterior | Bill/Expense | Vendor (3) | `/payment-abroad-supports` |

---

## Frontend Architecture (app/)

### API Client (`lib/api.ts`)
- Singleton `ApiClient` class with typed methods for every endpoint
- Auto-unwraps `ApiResponse<T>` wrapper
- On 401: clears localStorage, redirects to `/login`
- All methods return unwrapped `T` directly (not the wrapper)

### Page Pattern
Each settings/mapping page follows:
1. Load data + check onboarding status on mount
2. Inline edit with row-level save
3. Sync button calls `POST /api/Qbo/sync`
4. RNC validation on blur (customers/vendors): calls `GET /api/Dgii/rnc/{rnc}`, auto-fills razonSocial
5. Onboarding navigation: "Volver" (back) + "Continuar" (advance step + navigate forward)
6. Progress summary showing mapped/unmapped counts

### All Frontend Pages (20 compiled routes)
- `/` — Landing/redirect
- `/login` — Auth login
- `/register` — Account registration
- `/dashboard` — Main dashboard with stat cards (todayCount, accepted, pending, rejected), recent docs table, onboarding banner
- `/onboarding` — Step wizard with progress bar, strict gating, locked steps
- `/documents` — Document list with stats summary, status filters, pagination, buyer/RNC columns, error messages
- `/settings/qbo` — QBO connection, sync button, sandbox indicator, onboarding nav
- `/settings/fiscal` — Fiscal settings with RNC validation, QBO pre-fill, certification assistance modal
- `/settings/customers` — Customer mappings with sync, RNC validation on blur, progress summary
- `/settings/vendors` — Vendor mappings with sync, RNC validation, retention rates, progress summary
- `/settings/taxes` — Tax code to billing indicator mapping with sync
- `/settings/items` — Optional item overrides with skip option
- `/settings/certificate` — Digital certificate upload (.p12/.pfx) with drag & drop, password, status display
- `/settings/sequences` — e-NCF sequence CRUD with progress bars, status badges, inline form
- `/settings/billing` — Subscription, plans, payments
- `/billing/success` — Post-checkout success page
- `/billing/cancelled` — Post-checkout cancellation page
- `/support` — Support tickets: list, detail/reply, new ticket creation
- `/_not-found` — 404 page

---

## DGII Integration

### RNC Lookup (`DgiiRncService`)
- Scrapes DGII website (ASP.NET WebForms): GET for ViewState → POST with form data
- Returns: RNC, RazonSocial, NombreComercial, Estado, RegimenPagos, EsActivo, EsFacturadorElectronico
- Frontend validates RNC on blur in fiscal settings and mapping pages

### Certification Assistance
- `CertificationAssistanceConfig` entity (singleton per system, managed by superadmin)
- Shown to users when their RNC is INACTIVO in DGII
- Configurable: price, description, included items, requirements, estimated days

---

## Security
- QBO tokens: AES-256 encrypted at rest via ASP.NET Data Protection API
- Certificates (.p12): Stored in `CertificateStore` table, encrypted
- JWT secret: Environment variable only, never in code
- CORS: Restrictive (only eigdo domains)
- Audit logs: All critical actions logged with before/after values

---

## Development Config (`appsettings.Development.json`)
- PostgreSQL: `localhost:5432` / `eigdo_dev` / `postgres:postgres`
- Redis: `localhost:6379`
- Allowed origins: `localhost:3000,3001,3002`
- QBO sandbox: `QBO_CLIENT_ID` and `QBO_CLIENT_SECRET` set to empty string activates sandbox mode
- QBO callback: `http://localhost:5102/api/qbo/callback`
- Alanube: `https://sandbox.alanube.co/dom/v1`

---

## QuickBooks Online API Reference

### Query Pattern
- All queries: `GET /v3/company/{realmId}/query?query={urlencoded_query}&minorversion=73`
- Response: `{ "QueryResponse": { "EntityName": [...], "startPosition": 1, "maxResults": N } }`
- Entity by ID: `GET /v3/company/{realmId}/{entityname}/{entityId}?minorversion=73`
- Sandbox base: `https://sandbox-quickbooks.api.intuit.com`
- Production base: `https://quickbooks.api.intuit.com`

### Key Entity Mappings
| QBO Field | eigdo Field | Notes |
|-----------|-------------|-------|
| CompanyInfo.LegalName | FiscalSettings.RazonSocial | Legal name |
| CompanyInfo.CompanyName | FiscalSettings.NombreComercial | Trade name |
| CompanyInfo.EIN | FiscalSettings.Rnc | Remove dashes |
| CompanyInfo.PrimaryPhone | FiscalSettings.Telefono | |
| CompanyInfo.Email | FiscalSettings.Email | |
| CompanyInfo.LegalAddr | FiscalSettings.Direccion | Preferred for fiscal |

### Webhook Verification
HMAC-SHA256 of request body with verifier token, compared to `intuit-signature` header.

---

## Backend Services (Fiscal Engine)

### Controllers (18 total)
`AuthController`, `OnboardingController`, `QboController`, `QboWebhookController`, `FiscalSettingsController`, `CustomerMappingsController`, `VendorMappingsController`, `TaxMappingsController`, `ItemOverridesController`, `SequencesController`, `DocumentsController`, `EmissionController`, `BillingController`, `DgiiController`, `AdminController`, `SupportController`, `HealthController` + `EigdoControllerBase`

### Application Services
| Service | Status | Purpose |
|---------|--------|---------|
| `AuthService` | DONE | Login, register, JWT, refresh tokens |
| `OnboardingService` | DONE | Step validation, advancement |
| `FiscalSettingsService` | DONE | CRUD fiscal config, RNC, defaults |
| `CustomerMappingService` | DONE | CRUD customer mappings |
| `VendorMappingService` | DONE | CRUD vendor mappings + retentions |
| `TaxMappingService` | DONE | CRUD tax code → billingIndicator |
| `ItemOverrideService` | DONE | CRUD optional item overrides |
| `SequenceService` | DONE | CRUD e-NCF sequences with validation |
| `SubscriptionService` | DONE | Plan enforcement, limits |
| `CheckoutService` | DONE | Stripe + Azul checkout sessions |
| `EmissionOrchestrator` | DONE | Main emission pipeline |
| `PayloadTransformer` | DONE | QBO → Alanube 5-cycle transform |
| `EmissionValidator` | DONE | All blocking rules (subscription, mappings, sequences, retentions) |
| `TaxCalculator` | DONE | Server-side ITBIS recalculation |
| `RetentionCalculator` | DONE | ITBIS/ISR retention for E41 services |
| `DiscountDistributor` | DONE | Proportional discount distribution |
| `QboWebhookHandler` | DONE | HMAC verification, enqueue |

### Certificate System
- `POST /api/FiscalSettings/certificate` — multipart .p12/.pfx upload with X509Certificate2 validation
- `GET /api/FiscalSettings/certificate` — returns status (subject, issuer, expiration, isExpired)
- Stored encrypted in `CertificateStore` table via `IEncryptionService`

### Sequence Management
- Full CRUD at `/api/Sequences`
- Validation: RangeStart < RangeEnd, no duplicate active EcfType, CurrentValue in range
- Lock distribuido via Redis for concurrent e-NCF assignment

---

## Deployment Architecture

### Target: Ubuntu 24.04 VPS (LiquidWeb 69.167.167.18), NO Docker
### Hostname: repulsive-yaks.metalseed.io

### Directory Layout on Server
```
/opt/eigdo/
├── api/                    # Published .NET API
├── worker/                 # Published .NET Worker
├── frontend/
│   ├── landing/            # Built Next.js (port 3000)
│   ├── app/                # Built Next.js (port 3002)
│   └── admin/              # Built Next.js (port 3001)
├── config/                 # .env, .env.landing, .env.app, .env.admin
├── backups/                # DB dumps + previous releases
├── logs/                   # Backup logs
└── scripts/                # backup.sh
```

### Domains
- `api.eigdo.com` → Nginx → `localhost:5000` (eigdo-api.service)
- `eigdo.com` / `staging.eigdo.com` → Nginx → `localhost:3002` (eigdo-app.service) — staging now, production later
- `www.eigdo.com` / `_` (default) → Nginx → `localhost:3000` (eigdo-landing.service)
- `admin.eigdo.com` → Nginx → `localhost:3001` (eigdo-admin.service)

### Domain Scheme
- **Production app**: `eigdo.com` (future — same Next.js build, just domain routing)
- **Staging app**: `staging.eigdo.com` (current work environment)
- **API**: `api.eigdo.com` (serves both staging and production)
- **Admin**: `admin.eigdo.com`
- **Landing**: `www.eigdo.com`
- Frontend built with `NEXT_PUBLIC_API_URL=http://api.eigdo.com/api`
- DNS: transferred to LiquidWeb (was on SiteGround NS)

### Scripts
- `infra/scripts/setup-server.sh` — First-time VPS setup (dotnet, node, pg, redis, nginx, certbot, ufw)
- `infra/scripts/deploy.sh` — Build + deploy (args: all|backend|frontend|api|worker|landing|app|admin)
- `infra/scripts/backup.sh` — pg_dump cron (daily 2 AM, keep 10)

### Environment Variables
See `.env.example` for full list. Key vars:
- `DATABASE_CONNECTION`, `REDIS_CONNECTION`, `JWT_SECRET`, `ENCRYPTION_KEY`
- `ALANUBE_BASE_URL`, `ALANUBE_JWT_TOKEN`
- `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_REDIRECT_URI`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `SMTP_*` for email
- `ALLOWED_ORIGINS` (comma-separated domains)

### NEXT_PUBLIC_* Build-Time Vars
Frontend apps need `NEXT_PUBLIC_API_URL` set at BUILD time (not runtime).
- `.env.production` files exist in `frontend/app/` and `frontend/admin/`
- Deploy script copies `/opt/eigdo/config/.env.$NAME` → `.env.production.local` before `npm run build`

---

## Common Gotchas
1. **Route casing**: Frontend must use PascalCase for auto-generated routes (`/api/FiscalSettings` not `/api/fiscal-settings`)
2. **Onboarding advance**: Must send the NEXT step name, not the current one. Backend validates `requestedStep == currentStep + 1`
3. **QBO token expiry**: Always call `EnsureValidToken()` before any QBO API call
4. **Sandbox detection**: `IsSandboxMode` checks for empty `QBO_CLIENT_ID`, not an explicit flag
5. **Tax amounts**: NEVER read tax totals from QBO. eigdo always recalculates ITBIS
6. **EF migrations**: Run from `Eigdo.Api` directory with `--project ../Eigdo.Infrastructure`
7. **Frontend ApiResponse unwrap**: `api.ts` auto-unwraps `{ success, data }` — methods return `data` directly, not the wrapper
8. **SuperAdmin credentials**: Email `argenis1989@gmail.com` — seeded at startup
9. **API port**: Dev runs on port 5102. Frontend `api.ts` has `API_BASE = localhost:5102/api`
10. **FormData uploads**: `api.ts` request() method detects FormData body and skips Content-Type header (browser sets multipart boundary)
11. **Sandbox sync without QboConnection**: Sync endpoint allows sandbox mode even without QboConnection record (`if (connection == null && !IsSandboxMode)`)
12. **NEXT_PUBLIC_API_URL**: Must be set at build time, not runtime. Missing it causes frontend to call localhost from browser in production
13. **Next.js standalone output**: All 3 frontends use `output: "standalone"` in `next.config.ts`. Deploy the entire `.next/standalone/` contents as root dir, then copy `.next/static/` into `.next/static` and `public/` into `public/` at the same level as `server.js`
14. **Standalone WorkingDirectory**: systemd services must point to the dir containing `server.js`, NOT `.next/standalone` — the structure is `server.js + .next/ + node_modules/ + public/`
15. **macOS tar xattr warnings**: Tarballs created on macOS produce `LIBARCHIVE.xattr.com.apple.provenance` warnings on Linux — harmless, ignore
16. **EF migrations in production**: `Program.cs` runs `MigrateAsync()` on every startup (not just Development). This creates tables on first deploy automatically
17. **PostgreSQL schema grants**: After creating the eigdo user, must also run `GRANT ALL ON SCHEMA public TO eigdo` for EF Core to create tables
18. **VPS SSH access**: Server `69.167.167.18` (repulsive-yaks.metalseed.io), root, password `Cl@ve112019`. Previous hostname credentials (metalseed) were stale — the panel password was correct
19. **UFW port management**: Production has ports 22, 80, 443, 3000, 3001, 3002, 5000 open. When domains + SSL are configured, close 3000-5000 and route everything through Nginx

---

## Documentation Index

| Document | Path | Content |
|----------|------|---------|
| Architecture Overview | `docs/architecture/overview.md` | System diagram, services, data flow, security model |
| Onboarding Flow | `docs/architecture/onboarding-flow.md` | 9-step wizard, validation rules, frontend patterns |
| 5 Mapping Cycles | `docs/mapping/five-cycles.md` | QBO → Alanube transformation, all cycles detailed |
| API Endpoints | `docs/api/endpoints.md` | Full REST API reference with request/response |
| Deployment Guide | `docs/deployment.md` | Step-by-step VPS deployment (setup, config, deploy, SSL) |
| Development Guide | `docs/development.md` | Local setup, build commands, project structure |
| Troubleshooting | `docs/troubleshooting.md` | Common issues and fixes (SSH, 502, SSL, DB, etc.) |

---

## Progress Tracker

### Completed
- [x] Monorepo structure + Clean Architecture
- [x] Identity: register, login, JWT, refresh tokens
- [x] Tenancy: company creation, roles
- [x] EncryptionService (Data Protection API)
- [x] QBO OAuth 2.0 (auth URL, callback, token refresh)
- [x] QBO Sync (customers, vendors, items, taxcodes)
- [x] QBO Webhook handler (HMAC verification)
- [x] Sandbox mode (full simulation)
- [x] Onboarding (9 steps, strict gating)
- [x] FiscalSettings CRUD + DGII RNC validation
- [x] CustomerMapping CRUD + RNC on blur
- [x] VendorMapping CRUD + retentions
- [x] TaxMapping CRUD + billingIndicator
- [x] ItemOverride CRUD (optional)
- [x] Certificate upload + X509 validation + encrypted storage
- [x] Sequence CRUD + Redis locks
- [x] EmissionOrchestrator + PayloadTransformer (5 cycles)
- [x] EmissionValidator (all blocking rules)
- [x] TaxCalculator, RetentionCalculator, DiscountDistributor
- [x] Billing: plans, checkout, subscription (Stripe + Azul)
- [x] Documents page with stats, filters, pagination
- [x] Dashboard with stat cards + recent docs
- [x] Support tickets (list, detail, reply, create)
- [x] Admin panel (companies, stats)
- [x] CI workflow (GitHub Actions)
- [x] Infra: systemd services, nginx configs, deploy script, backup script
- [x] 20 frontend pages compiled and working
- [x] Full documentation (7 docs)

### Completed (Deployment)
- [x] Deploy to production VPS (LiquidWeb 69.167.167.18) — 2026-03-20
- [x] VPS setup: Ubuntu 24.04, .NET 8.0.125, Node 20.20.1, PostgreSQL 16.13, Redis 7, Nginx 1.24
- [x] All 5 systemd services running (api, worker, landing, app, admin)
- [x] EF Core auto-migration on startup (creates all tables)
- [x] Seed data: 3 plans, SuperAdmin user
- [x] Nginx reverse proxy configured (HTTP, pending SSL)
- [x] UFW firewall active

### Remaining
- [ ] DNS configuration (eigdo.com, api/app/admin subdomains)
- [ ] SSL certificates (Let's Encrypt)
- [ ] Alanube sandbox certification testing
- [ ] DGII certification submission
- [ ] Landing page improvements (pricing, features, testimonials)
- [ ] Worker hardening (retry backoff, dead letter queue)
- [ ] Serilog structured logging + correlation IDs
- [ ] Sentry error monitoring
- [ ] Rate limiting on public endpoints (already configured, needs testing)
- [ ] Beta testing with 2-3 real companies
