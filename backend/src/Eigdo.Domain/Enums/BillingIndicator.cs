namespace Eigdo.Domain.Enums;

public enum BillingIndicator
{
    NonBillable = 0,   // Exento
    Itbis18 = 1,       // Gravado ITBIS 18%
    Itbis16 = 2,       // Gravado ITBIS 16%
    Itbis0 = 3,        // Gravado ITBIS 0%
    Special = 4        // Gastos menores, régimen especial, exportación, pagos exterior
}
