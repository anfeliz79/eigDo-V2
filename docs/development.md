# eigdo v2 — Development Guide

## Prerequisites

- .NET 8 SDK
- Node.js 20 LTS
- PostgreSQL 16 (local)
- Redis 7 (local)

## Quick Start

### 1. Database Setup

```bash
# Create database
psql -U postgres -c "CREATE DATABASE eigdo_dev;"

# Run migrations
cd backend/src/Eigdo.Api
dotnet ef database update --project ../Eigdo.Infrastructure
```

### 2. Start Backend

```bash
cd backend/src/Eigdo.Api
dotnet run
# API starts on http://localhost:5102 (puerto configurado en launchSettings.json)
# Health check: http://localhost:5102/health
```

> **Nota**: El puerto 5102 es solo para desarrollo (definido en `Properties/launchSettings.json`). En producción, el API corre en el puerto 5000 (definido por la variable de entorno `ASPNETCORE_URLS`).

### 3. Start Frontend (Company App)

```bash
cd frontend/app
npm install
npm run dev
# App starts on http://localhost:3000
```

### 4. Start Frontend (Admin)

```bash
cd frontend/admin
npm install
npm run dev
# Admin starts on http://localhost:3001
```

### 5. Start Frontend (Landing)

```bash
cd frontend/landing
npm install
npm run dev
# Landing starts on http://localhost:3002
```

---

## Development Configuration

### Backend (`appsettings.Development.json`)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=eigdo_dev;Username=postgres;Password=postgres"
  },
  "Redis": {
    "Connection": "localhost:6379"
  },
  "ALLOWED_ORIGINS": "http://localhost:3000,http://localhost:3001,http://localhost:3002",
  "QBO_CLIENT_ID": "",
  "QBO_CLIENT_SECRET": "",
  "QBO_REDIRECT_URI": "http://localhost:5102/api/qbo/callback"
}
```

**Sandbox mode**: When `QBO_CLIENT_ID` is empty, all QBO endpoints return simulated data.

### Frontend (`frontend/app/.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:5102/api
```

### Frontend (`frontend/admin/.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:5102/api
```

---

## Build Commands

```bash
# Backend — build all projects
cd backend && dotnet build

# Backend — run tests
cd backend && dotnet test

# Backend — run specific test project
cd backend && dotnet test tests/Eigdo.UnitTests/
cd backend && dotnet test tests/Eigdo.FiscalTests/
cd backend && dotnet test tests/Eigdo.IntegrationTests/

# Frontend — type-check build (validates types)
cd frontend/app && npx next build
cd frontend/admin && npx next build
cd frontend/landing && npx next build

# Database — add migration
cd backend/src/Eigdo.Api
dotnet ef migrations add <MigrationName> --project ../Eigdo.Infrastructure

# Database — apply migrations
cd backend/src/Eigdo.Api
dotnet ef database update --project ../Eigdo.Infrastructure

# Database — revert last migration
cd backend/src/Eigdo.Api
dotnet ef migrations remove --project ../Eigdo.Infrastructure
```

---

## Project Structure

### Backend Controllers → Frontend Pages Mapping

| Controller | Route | Frontend Page |
|-----------|-------|--------------|
| AuthController | `/api/Auth` | `/login`, `/register` |
| OnboardingController | `/api/Onboarding` | `/onboarding` |
| QboController | `/api/Qbo` | `/settings/qbo` |
| FiscalSettingsController | `/api/FiscalSettings` | `/settings/fiscal`, `/settings/certificate` |
| CustomerMappingsController | `/api/CustomerMappings` | `/settings/customers` |
| VendorMappingsController | `/api/VendorMappings` | `/settings/vendors` |
| TaxMappingsController | `/api/TaxMappings` | `/settings/taxes` |
| ItemOverridesController | `/api/ItemOverrides` | `/settings/items` |
| SequencesController | `/api/Sequences` | `/settings/sequences` |
| DocumentsController | `/api/documents` | `/documents` |
| BillingController | `/api/billing` | `/settings/billing` |
| SupportController | `/api/Support` | `/support` |
| AdminController | `/api/admin` | (admin app) |

### Frontend API Client (`lib/api.ts`)

All API calls go through the singleton `api` object:

```typescript
import { api } from '@/lib/api';

// All methods return unwrapped data (not ApiResponse wrapper)
const status = await api.getOnboardingStatus();
const customers = await api.getCustomerMappings();
await api.updateCustomerMapping(id, data);
```

**Key behaviors**:
- Auto-unwraps `ApiResponse<T>` → returns `T`
- On 401: clears localStorage (`eigdo_token`, `eigdo_user`), redirects to `/login`
- FormData detection: skips Content-Type header for multipart uploads
- Base URL from `NEXT_PUBLIC_API_URL` env var
- Envía el header `X-Company-Id` automáticamente usando el valor de `eigdo_company` en localStorage

> **Importante**: La clave `eigdo_company` en localStorage es necesaria para todas las llamadas al API. Se establece al iniciar sesión o seleccionar una empresa. Si falta, las llamadas al API fallarán con "Empresa no identificada".

---

## Panel de Administración (Admin)

El panel de administración corre en el puerto **3001** durante desarrollo (`frontend/admin`).

### Configuración

```bash
cd frontend/admin
cp .env.example .env.local
# Editar .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:5102/api
npm install
npm run dev
```

### Funcionalidades principales

- Gestión de empresas y usuarios
- Visualización de suscripciones y pagos
- Soporte / tickets
- Acceso exclusivo para usuarios con rol SuperAdmin

### Acceso

Se requiere un usuario con rol `SuperAdmin` (el usuario seed `argenis1989@gmail.com` tiene este rol por defecto).

---

## Soporte Multi-Empresa y Header X-Company-Id

eigdo v2 soporta múltiples empresas por usuario. Cada llamada al API debe incluir el header `X-Company-Id` para identificar la empresa activa.

### Flujo

1. El usuario inicia sesión y obtiene la lista de empresas asociadas
2. Selecciona una empresa → se guarda en `localStorage` como `eigdo_company`
3. El cliente API (`lib/api.ts`) lee `eigdo_company` y lo envía como header `X-Company-Id` en cada request
4. El backend extrae el `X-Company-Id` del header y filtra los datos por empresa

### Consideraciones de desarrollo

- Si `eigdo_company` no existe en localStorage, el API retorna error "Empresa no identificada"
- Al cambiar de empresa, se actualiza `eigdo_company` y se recargan los datos
- En el panel admin, el header se maneja de forma diferente (acceso cross-empresa)

---

## Field Mapping (Mapeo de Campos)

El sistema de mapeo de campos permite configurar la equivalencia entre campos de QuickBooks Online (QBO) y los campos fiscales requeridos por la DGII (a través de Alanube).

### Ciclos de mapeo

| Mapeo | Endpoint | Descripción |
|-------|----------|-------------|
| Clientes | `/api/CustomerMappings` | Mapeo de clientes QBO → tipo de contribuyente (RNC/Cédula), tipo de ingreso (E31/E32/etc.) |
| Suplidores | `/api/VendorMappings` | Mapeo de suplidores QBO → tipo de gasto (E41/E42/etc.) |
| Impuestos | `/api/TaxMappings` | Mapeo de códigos de impuesto QBO → indicador de ITBIS |
| Items | `/api/ItemOverrides` | Sobreescrituras de unidad de medida y otros campos por item |
| Secuencias | `/api/Sequences` | Configuración de secuencias de comprobantes fiscales (NCF/e-CF) |

### Concepto clave

El mapeo es una **equivalencia de campos** (field mapping), NO una sincronización registro por registro. Se configura cómo traducir los valores de QBO a los valores fiscales dominicanos.

### Ejemplo de flujo

1. Se sincronizan clientes desde QBO
2. El usuario asigna a cada cliente su tipo de comprobante (E31, E32, etc.) y su RNC/Cédula
3. Al generar un documento fiscal, el sistema usa estos mapeos para construir el e-CF correcto

---

## Sandbox Mode Testing

With `QBO_CLIENT_ID=""` in config:

1. **QBO Connect**: Creates mock QboConnection immediately
2. **QBO Sync**: Creates sample data:
   - 6 customers (default type: E32 Consumo)
   - 4 vendors (default type: E41 Compras)
   - 4 tax codes
   - 4 items
3. **QBO Status**: Returns `{ connected: true, sandbox: true, realmId: "SANDBOX-xxx" }`

This allows full onboarding flow testing without Intuit OAuth credentials.

---

## Common Development Tasks

### Adding a New API Endpoint

1. Create DTO in `Eigdo.Application/DTOs/`
2. Create/update service in `Eigdo.Application/Services/`
3. Add controller action in `Eigdo.Api/Controllers/`
4. Add method to `frontend/app/src/lib/api.ts`
5. Create/update page in `frontend/app/src/app/`

### Adding a New Entity

1. Create entity in `Eigdo.Domain/Entities/`
2. Add DbSet to `EigdoDbContext`
3. Configure in `OnModelCreating` if needed
4. Run: `dotnet ef migrations add Add<EntityName> --project ../Eigdo.Infrastructure`
5. Run: `dotnet ef database update --project ../Eigdo.Infrastructure`

### Adding a New Onboarding Step

1. Add value to `OnboardingStep` enum
2. Add validation in `OnboardingService.IsStepValidAsync()`
3. Update `GetStatus()` to include new step
4. Create frontend page with onboarding navigation pattern
5. Update onboarding wizard page (`/onboarding`)

---

## Seeded Data

On first run, the API seeds:

- **SuperAdmin user**: `argenis1989@gmail.com` (check `SeedData.cs`)
- **Billing plans**: Basic, Pro, Enterprise
- **DGII catalogs**: Provinces, municipalities, units of measure

---

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`):

- **Backend job**: Restore → Build → Unit Tests → Fiscal Tests (with PostgreSQL + Redis services)
- **Frontend jobs**: 3 parallel jobs (landing, app, admin): `npm ci` → `npm run build`

Runs on push/PR to `main` branch.
