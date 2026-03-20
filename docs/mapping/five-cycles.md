# eigdo v2 — The 5 Mapping Cycles

## Overview

eigdo transforms QuickBooks Online (QBO) documents into Dominican Republic electronic tax invoices (e-CF) through 5 sequential mapping cycles. Each cycle handles a different part of the Alanube payload.

```
QBO Invoice/Bill/Expense
        │
        ▼
┌─── Cycle 1: EMISOR (Sender) ────────────────────────┐
│ FiscalSettings → ecf.emisor                          │
│ RNC, RazonSocial, address, defaults                  │
└──────────────────────────────────────────────────────┘
        │
        ▼
┌─── Cycle 2/3: COMPRADOR / PROVEEDOR (Buyer/Vendor) ─┐
│ CustomerMapping → ecf.comprador (E31,E32,E34,E44-46) │
│ VendorMapping → ecf.proveedor (E41,E43,E47)          │
│ RNC, RazonSocial, tipo comprobante                   │
└──────────────────────────────────────────────────────┘
        │
        ▼
┌─── Cycle 4: ITBIS (Tax Mapping) ────────────────────┐
│ TaxCodeMapping → billingIndicator per line item      │
│ 0=Exento, 1=ITBIS18%, 2=ITBIS16%, 3=ITBIS0%        │
│ Forced overrides: E43→4, E44→4, E46→3, E47→4        │
└──────────────────────────────────────────────────────┘
        │
        ▼
┌─── Cycle 5: ITEMS (Line Items) ─────────────────────┐
│ QBO line items → ecf.detalleGravado[]                │
│ ItemOverride → optional unitMeasure override         │
│ ItemOverride → optional goodServiceIndicator         │
│ Defaults from FiscalSettings when no override        │
└──────────────────────────────────────────────────────┘
        │
        ▼
┌─── Post-Processing ─────────────────────────────────┐
│ DiscountDistributor: global QBO discount → per-line  │
│ RetentionCalculator: ITBIS/ISR for E41 services      │
│ TaxCalculator: recalculate ITBIS (NEVER from QBO)    │
│ SequenceService: assign e-NCF with Redis lock        │
└──────────────────────────────────────────────────────┘
        │
        ▼
    Alanube API Payload (JSON)
```

---

## Cycle 1: Emisor (Sender)

**Source**: `FiscalSettings` table (one per company)

| FiscalSettings Field | Alanube Payload Field | Notes |
|---------------------|----------------------|-------|
| Rnc | ecf.emisor.rncEmisor | 9 or 11 digit RNC |
| RazonSocial | ecf.emisor.razonSocialEmisor | From DGII lookup |
| Direccion | ecf.emisor.direccionEmisor | |
| Telefono | ecf.emisor.telefonoEmisor | |
| Email | ecf.emisor.correoEmisor | |
| MunicipioDgiiId | ecf.emisor.municipioEmisor | DGII catalog code |
| ProvinciaDgiiId | ecf.emisor.provinciaEmisor | DGII catalog code |
| DefaultIncomeType | ecf.detalles[].tipoIngreso | Default for all items |
| DefaultUnitMeasure | ecf.detalles[].unidadMedida | Default when no ItemOverride |
| DefaultGoodServiceIndicator | ecf.detalles[].indicadorBienServicio | Default: 1=Bien, 2=Servicio |

---

## Cycle 2: Comprador (Customer Mapping)

**Source**: `CustomerMapping` table
**Used for**: E31, E32, E34, E44, E45, E46

| CustomerMapping Field | Alanube Payload Field | Notes |
|----------------------|----------------------|-------|
| QboCustomerId | — | Link to QBO |
| Rnc | ecf.comprador.rncComprador | Validated against DGII |
| RazonSocialDgii | ecf.comprador.razonSocialComprador | From DGII lookup |
| TipoComprobante | Determines e-CF type | E31, E32, E44, E45, E46 |
| ProvinciaDgiiId | ecf.comprador.provinciaComprador | |
| MunicipioDgiiId | ecf.comprador.municipioComprador | |
| Excluido | — | If true, skip emission |

### e-CF Type by TipoComprobante
| TipoComprobante | e-CF | Alanube Endpoint |
|----------------|------|-----------------|
| CreditoFiscal | E31 | `/invoice-fiscals` |
| Consumo | E32 | `/invoices` |
| RegimenEspecial | E44 | `/special-regimes` |
| Gubernamental | E45 | `/gubernamentals` |
| Exportacion | E46 | `/export-supports` |

**E32 (Consumo)** allows anonymous buyers (no RNC required).

---

## Cycle 3: Proveedor (Vendor Mapping)

**Source**: `VendorMapping` table
**Used for**: E41, E43, E47

| VendorMapping Field | Alanube Payload Field | Notes |
|--------------------|----------------------|-------|
| QboVendorId | — | Link to QBO |
| Rnc | ecf.proveedor.rncProveedor | Validated against DGII |
| RazonSocialDgii | ecf.proveedor.razonSocialProveedor | From DGII lookup |
| TipoComprobante | Determines e-CF type | E41, E43, E47 |
| RetentionItbisRate | Used by RetentionCalculator | decimal (e.g., 0.30 = 30%) |
| RetentionIsrRate | Used by RetentionCalculator | decimal (e.g., 0.10 = 10%) |
| Excluido | — | If true, skip emission |

### e-CF Type by TipoComprobante
| TipoComprobante | e-CF | Alanube Endpoint |
|----------------|------|-----------------|
| Compras | E41 | `/purchases` |
| GastosMenores | E43 | `/minor-expenses` |
| PagosExterior | E47 | `/payment-abroad-supports` |

---

## Cycle 4: ITBIS (Tax Code Mapping)

**Source**: `TaxCodeMapping` table
**Critical Rule**: eigdo NEVER uses QBO tax amounts. TaxCalculator always recalculates.

| TaxCodeMapping Field | Purpose |
|---------------------|---------|
| QboTaxCodeId | Link to QBO TaxCode |
| QboTaxCodeName | Display name (from QBO sync) |
| BillingIndicator | 0-4 (see below) |

### Billing Indicator Values
| Value | Meaning | ITBIS Rate |
|-------|---------|-----------|
| 0 | Exento (exempt) | 0% |
| 1 | Gravado ITBIS 18% | 18% |
| 2 | Gravado ITBIS 16% | 16% |
| 3 | Gravado ITBIS 0% | 0% |
| 4 | Especial | Varies |

### Forced Overrides by e-CF Type
Some e-CF types force specific billing indicators regardless of TaxCodeMapping:

| e-CF | Forced BillingIndicator | Reason |
|------|------------------------|--------|
| E43 (Gastos Menores) | 4 (Especial) | DGII regulation |
| E44 (Regimen Especial) | 4 (Especial) | DGII regulation |
| E46 (Exportacion) | 3 (ITBIS 0%) | Exports are 0% |
| E47 (Pagos Exterior) | 4 (Especial) | DGII regulation |

---

## Cycle 5: Items (Line Items)

**Source**: QBO Invoice/Bill line items + `ItemOverride` table (optional)

For each QBO line item:

1. Read `Description`, `Qty`, `UnitPrice` from QBO
2. Check if `ItemOverride` exists for this QBO item:
   - If yes: use override's `UnitMeasure` and `GoodServiceIndicator`
   - If no: use `FiscalSettings.DefaultUnitMeasure` and `DefaultGoodServiceIndicator`
3. Apply `BillingIndicator` from Cycle 4 (per line item's TaxCode)
4. Calculate line total: `Qty × UnitPrice`

---

## Post-Processing

### Discount Distribution
QBO can have global `DiscountLine` items. eigdo distributes these proportionally across all line items:

```
For each line item:
  lineDiscount = (lineTotal / subtotal) × globalDiscount
```

Supports both percentage and fixed-amount discounts.

### Retention Calculation (E41 only)
For Bills with service items:

```
retentionItbis = totalItbis × vendorMapping.RetentionItbisRate
retentionIsr = subtotal × vendorMapping.RetentionIsrRate
```

**Blocking rule**: If vendor has no retention rates configured and bill contains service items, emission is blocked.

### Tax Calculation
eigdo ALWAYS recalculates ITBIS server-side:

```
For each line item:
  if billingIndicator == 1: itbis = lineTotal × 0.18
  if billingIndicator == 2: itbis = lineTotal × 0.16
  if billingIndicator == 0 or 3: itbis = 0
  if billingIndicator == 4: itbis = 0 (special regime)
```

### e-NCF Assignment
- `SequenceService` assigns next available number with Redis distributed lock
- Prevents duplicate assignment under concurrent emissions
- Validates sequence is not exhausted or expired
- Alert when > 80% used, critical when > 95%
