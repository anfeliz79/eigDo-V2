namespace Eigdo.SharedKernel.Constants;

public static class DgiiConstants
{
    // Billing Indicator rates
    public const decimal Itbis18Rate = 0.18m;
    public const decimal Itbis16Rate = 0.16m;
    public const decimal Itbis0Rate = 0.00m;

    // e-NCF prefixes
    public const string E31Prefix = "E31";
    public const string E32Prefix = "E32";
    public const string E33Prefix = "E33";
    public const string E34Prefix = "E34";
    public const string E41Prefix = "E41";
    public const string E43Prefix = "E43";
    public const string E44Prefix = "E44";
    public const string E45Prefix = "E45";
    public const string E46Prefix = "E46";
    public const string E47Prefix = "E47";

    // RNC validation
    public const int RncLength9 = 9;
    public const int RncLength11 = 11;

    // Payment methods DGII codes
    public const int PaymentCash = 1;
    public const int PaymentCheck = 2;
    public const int PaymentCreditCard = 3;
    public const int PaymentCredit = 4;
    public const int PaymentGiftCard = 5;
    public const int PaymentSwap = 6;
    public const int PaymentCreditNote = 7;
    public const int PaymentOther = 8;

    // Income types
    public const int IncomeNonFinancial = 1;
    public const int IncomeFinancial = 2;
    public const int IncomeExtraordinary = 3;
    public const int IncomeLeasing = 4;
    public const int IncomeAssetSale = 5;
    public const int IncomeOther = 6;
}
