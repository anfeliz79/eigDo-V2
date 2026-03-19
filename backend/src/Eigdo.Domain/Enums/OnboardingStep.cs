namespace Eigdo.Domain.Enums;

public enum OnboardingStep
{
    NotStarted = 0,
    CompanyData = 1,        // Ciclo 1: Datos emisor
    CustomerMapping = 2,     // Ciclo 2: Mapeo clientes
    VendorMapping = 3,       // Ciclo 3: Mapeo proveedores
    TaxMapping = 4,          // Ciclo 4: Mapeo impuestos
    ItemOverrides = 5,       // Ciclo 5: Overrides items
    CertificateUpload = 6,   // Certificado digital
    SequenceSetup = 7,       // Secuencias e-NCF
    Complete = 8
}
