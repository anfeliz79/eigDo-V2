using Eigdo.SharedKernel.Extensions;

namespace Eigdo.UnitTests;

public class RncValidationTests
{
    [Theory]
    [InlineData("131000000", true)]       // 9-digit RNC
    [InlineData("00112345678", true)]     // 11-digit cedula
    [InlineData("131-000-000", true)]     // With dashes
    [InlineData("001-1234567-8", true)]   // Cedula with dashes
    [InlineData("12345678", false)]       // 8 digits — invalid
    [InlineData("1234567890", false)]     // 10 digits — invalid
    [InlineData("", false)]
    [InlineData(null, false)]
    [InlineData("ABCDEFGHI", false)]      // Letters
    [InlineData("131 000 000", true)]     // With spaces
    [InlineData("  131000000  ", true)]   // Trimmed
    public void IsValidRnc_ReturnsExpected(string? rnc, bool expected)
    {
        Assert.Equal(expected, rnc.IsValidRnc());
    }

    [Theory]
    [InlineData("131-000-000", "131000000")]
    [InlineData("001-1234567-8", "00112345678")]
    [InlineData("131 000 000", "131000000")]
    [InlineData("  131000000  ", "131000000")]
    public void CleanRnc_RemovesSeparators(string input, string expected)
    {
        Assert.Equal(expected, input.CleanRnc());
    }
}
