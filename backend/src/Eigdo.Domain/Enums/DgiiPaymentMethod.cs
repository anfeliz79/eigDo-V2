namespace Eigdo.Domain.Enums;

public enum DgiiPaymentMethod
{
    Cash = 1,           // Efectivo
    Check = 2,          // Cheque / Transferencia / Depósito
    CreditCard = 3,     // Tarjeta de Crédito / Débito
    Credit = 4,         // Venta a Crédito
    GiftCard = 5,       // Bonos o Certificados de Regalo
    Swap = 6,           // Permuta
    CreditNote = 7,     // Nota de Crédito
    Other = 8           // Mixto
}
