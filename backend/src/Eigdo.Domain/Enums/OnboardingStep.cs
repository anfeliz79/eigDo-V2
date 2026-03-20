namespace Eigdo.Domain.Enums;

public enum OnboardingStep
{
    NotStarted = 0,
    QboConnection = 1,       // Integracion QuickBooks Online (primero para traer datos empresa)
    CompanyData = 2,         // Ciclo 1: Datos emisor (pre-filled desde QBO)
    CustomerMapping = 3,     // Ciclo 2: Mapeo clientes
    VendorMapping = 4,       // Ciclo 3: Mapeo proveedores
    TaxMapping = 5,          // Ciclo 4: Mapeo impuestos
    ItemOverrides = 6,       // Ciclo 5: Overrides items
    CertificateUpload = 7,   // Certificado digital
    SequenceSetup = 8,       // Secuencias e-NCF
    Complete = 9
}
