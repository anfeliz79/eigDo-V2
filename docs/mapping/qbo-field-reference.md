# QuickBooks Online Field Reference for eigdo

Documentación de los campos disponibles en la API de QBO y cómo mapean a los campos fiscales dominicanos.

---

## Disponibilidad de campos por entidad

### Customer (Cliente)

| Campo QBO | Disponible en API | Enmascarado | Uso en eigdo |
|-----------|------------------|-------------|--------------|
| `Id` | ✅ | No | `QboCustomerId` |
| `DisplayName` | ✅ | No | `QboDisplayName`, fallback para `RazonSocialDgii` |
| `CompanyName` | ✅ | No | Fuente primaria para `RazonSocialDgii` |
| `PrimaryEmailAddr` | ✅ | No | No almacenado actualmente |
| `PrimaryPhone` | ✅ | No | No almacenado actualmente |
| `Notes` | ✅ | No | No almacenado actualmente |
| `PrimaryTaxIdentifier` | ✅ | **SÍ** ⚠️ | No se puede usar para RNC |
| `BillAddr` | ❌ | N/A | No se puede usar en SELECT — `QueryValidationError` |

**Nota crítica sobre `PrimaryTaxIdentifier`**: Intuit enmascara este campo en las respuestas de la API. Solo muestra los últimos 4-5 caracteres (ej. `XXXX-1234`). El RNC completo **NO puede obtenerse desde QBO**. Los usuarios deben ingresarlo manualmente y validarlo contra el padrón de la DGII.

### Vendor (Proveedor)

| Campo QBO | Disponible en API | Enmascarado | Uso en eigdo |
|-----------|------------------|-------------|--------------|
| `Id` | ✅ | No | `QboVendorId` |
| `DisplayName` | ✅ | No | `QboDisplayName`, fallback para `RazonSocialDgii` |
| `CompanyName` | ✅ | No | Fuente primaria para `RazonSocialDgii` |
| `PrimaryEmailAddr` | ✅ | No | No almacenado actualmente |
| `PrimaryPhone` | ✅ | No | No almacenado actualmente |
| `Notes` | ✅ | No | No almacenado actualmente |
| `TaxIdentifier` | ✅ | **SÍ** ⚠️ | No se puede usar para RNC |
| `BillAddr` | ❌ | N/A | No se puede usar en SELECT — `QueryValidationError` |

### Item (Producto/Servicio)

| Campo QBO | Disponible en API | Enmascarado | Uso en eigdo |
|-----------|------------------|-------------|--------------|
| `Id` | ✅ | No | `QboItemId` |
| `Name` | ✅ | No | `QboItemName` |
| `Type` | ✅ | No | `QboItemType` (Service, NonInventory, etc.) |

### TaxCode (Código de Impuesto)

| Campo QBO | Disponible en API | Uso en eigdo |
|-----------|------------------|--------------|
| `Id` | ✅ | `QboTaxCodeId` |
| `Name` | ✅ | `QboTaxCodeName` |

---

## Queries QBO utilizados en sync

```sql
-- Customers
SELECT Id, DisplayName, CompanyName, PrimaryEmailAddr, PrimaryPhone, Notes
FROM Customer WHERE Active = true
ORDERBY MetaData.LastUpdatedTime DESC MAXRESULTS 500

-- Vendors
SELECT Id, DisplayName, CompanyName, PrimaryEmailAddr, PrimaryPhone, Notes
FROM Vendor WHERE Active = true
ORDERBY MetaData.LastUpdatedTime DESC MAXRESULTS 500

-- TaxCodes
SELECT Id, Name FROM TaxCode WHERE Active = true MAXRESULTS 100

-- Items
SELECT Id, Name, Type FROM Item WHERE Active = true
ORDERBY MetaData.LastUpdatedTime DESC MAXRESULTS 500
```

**Limitaciones conocidas de QBO SQL:**
- `BillAddr` NO puede estar en el SELECT — causa `QueryValidationError: Property BillAddr not found for Entity Customer`
- `BillAddr` SÍ está disponible en respuestas `SELECT *` pero no en queries con campos específicos
- Los campos de objetos anidados (como `PrimaryEmailAddr.Address`) tampoco se pueden seleccionar directamente

---

## Mapeo RNC / RazonSocial

### Por qué el RNC no se puede obtener desde QBO

Intuit enmascara los campos de identificación fiscal (`PrimaryTaxIdentifier` en Customer, `TaxIdentifier` en Vendor) en todas las respuestas de la API. Se muestra algo como `XXXX-1234` o `***-1234` pero nunca el valor completo.

**Flujo correcto para RNC en eigdo:**
1. QBO sync crea stubs de CustomerMapping / VendorMapping con `Rnc = null`
2. El usuario ingresa el RNC manualmente en `/settings/customers` o `/settings/vendors`
3. El frontend valida el RNC contra el padrón de la DGII (`GET /api/Dgii/rnc/{rnc}`)
4. Si el RNC es válido, se auto-rellena `RazonSocialDgii` con el nombre oficial de la DGII

### Fuente de RazonSocial durante sync

```csharp
// Lógica de fallback durante sync:
var companyName = c.TryGetProperty("CompanyName", ...) ? cn.GetString() : null;
var razonSocial = !string.IsNullOrWhiteSpace(companyName) ? companyName : displayName;
```

`CompanyName` es preferido sobre `DisplayName` porque:
- `CompanyName` contiene el nombre legal de la empresa (cuando el cliente de QBO es una empresa)
- `DisplayName` puede ser el nombre comercial, apodo, o nombre del contacto
- Si el cliente en QBO es una persona natural, `CompanyName` estará vacío y se usa `DisplayName`

---

## CompanyInfo (Datos de la Empresa)

Estos campos se usan para pre-rellenar `FiscalSettings` al conectar QBO:

| Campo QBO | Campo eigdo | Notas |
|-----------|-------------|-------|
| `CompanyInfo.LegalName` | `FiscalSettings.RazonSocial` | Nombre legal |
| `CompanyInfo.CompanyName` | `FiscalSettings.NombreComercial` | Nombre comercial |
| `CompanyInfo.EIN` | `FiscalSettings.Rnc` | Quitar guiones |
| `CompanyInfo.PrimaryPhone.FreeFormNumber` | `FiscalSettings.Telefono` | |
| `CompanyInfo.Email.Address` | `FiscalSettings.Email` | |
| `CompanyInfo.LegalAddr` | `FiscalSettings.Direccion` | Preferida para fiscal |
| `CompanyInfo.CompanyAddr` | `FiscalSettings.Direccion` | Fallback si no hay LegalAddr |

**Nota**: `EIN` del CompanyInfo tampoco está enmascarado en este endpoint. Es el identificador fiscal de la empresa QBO (equivalente al RNC del emisor).

---

## Field Mapping UI (/settings/customers)

El sistema de Field Mapping permite configurar qué campo de QBO se usa como fuente para cada campo DGII. Los campos disponibles en el dropdown son los que se sincronizan desde QBO:

| Campo en dropdown | Valor típico |
|-------------------|-------------|
| `Id` | ID único de QBO (GUID/número) |
| `DisplayName` | Nombre de visualización en QBO |
| `CompanyName` | Nombre de empresa (preferido para RazonSocial) |
| `PrimaryEmailAddr` | Email (disponible en QBO, no almacenado en eigdo actualmente) |
| `PrimaryPhone` | Teléfono (disponible en QBO, no almacenado en eigdo actualmente) |
| `Notes` | Notas (disponible en QBO, no almacenado en eigdo actualmente) |

**Estado actual**: Los FieldMappings guardados en DB son configurables por UI, pero la lógica de sync usa actualmente `CompanyName ?? DisplayName` para `RazonSocial` de forma hardcoded. Los FieldMappings están pensados para una fase futura donde el sync los consulte dinámicamente.
