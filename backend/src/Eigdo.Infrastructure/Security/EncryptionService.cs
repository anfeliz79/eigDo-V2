using System.Security.Cryptography;
using Eigdo.Domain.Interfaces;
using Microsoft.Extensions.Configuration;

namespace Eigdo.Infrastructure.Security;

public class EncryptionService : IEncryptionService
{
    private readonly byte[] _key;

    public EncryptionService(IConfiguration configuration)
    {
        var keyBase64 = configuration.GetValue<string>("ENCRYPTION_KEY")
            ?? throw new InvalidOperationException("ENCRYPTION_KEY not configured");
        _key = Convert.FromBase64String(keyBase64);
    }

    public string Encrypt(string plainText)
    {
        var encrypted = EncryptBytes(System.Text.Encoding.UTF8.GetBytes(plainText));
        return Convert.ToBase64String(encrypted);
    }

    public string Decrypt(string cipherText)
    {
        var decrypted = DecryptBytes(Convert.FromBase64String(cipherText));
        return System.Text.Encoding.UTF8.GetString(decrypted);
    }

    public byte[] EncryptBytes(byte[] data)
    {
        using var aes = Aes.Create();
        aes.Key = _key;
        aes.GenerateIV();

        using var encryptor = aes.CreateEncryptor();
        var encrypted = encryptor.TransformFinalBlock(data, 0, data.Length);

        // Prepend IV to encrypted data
        var result = new byte[aes.IV.Length + encrypted.Length];
        aes.IV.CopyTo(result, 0);
        encrypted.CopyTo(result, aes.IV.Length);
        return result;
    }

    public byte[] DecryptBytes(byte[] encryptedData)
    {
        using var aes = Aes.Create();
        aes.Key = _key;

        var iv = new byte[aes.BlockSize / 8];
        var cipherText = new byte[encryptedData.Length - iv.Length];
        Array.Copy(encryptedData, 0, iv, 0, iv.Length);
        Array.Copy(encryptedData, iv.Length, cipherText, 0, cipherText.Length);

        aes.IV = iv;
        using var decryptor = aes.CreateDecryptor();
        return decryptor.TransformFinalBlock(cipherText, 0, cipherText.Length);
    }
}
