namespace Eigdo.SharedKernel.Extensions;

public static class StringExtensions
{
    public static bool IsValidRnc(this string? rnc)
    {
        if (string.IsNullOrWhiteSpace(rnc)) return false;
        var cleaned = rnc.Replace("-", "").Replace(" ", "").Trim();
        return (cleaned.Length == 9 || cleaned.Length == 11) && cleaned.All(char.IsDigit);
    }

    public static string CleanRnc(this string rnc)
    {
        return rnc.Replace("-", "").Replace(" ", "").Trim();
    }
}
