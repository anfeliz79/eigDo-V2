using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Eigdo.Application.Interfaces;
using Eigdo.Domain.Entities.Emission;
using Eigdo.Domain.Enums;
using Eigdo.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace Eigdo.Infrastructure.Fiscal;

public class AlanubeClient : IFiscalProvider
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AlanubeClient> _logger;
    private readonly IEigdoDbContext _db;
    private readonly IAlanubeConfigProvider _configProvider;

    private static readonly Dictionary<EcfType, string> EndpointMap = new()
    {
        { EcfType.E31, "/invoice-fiscals" },
        { EcfType.E32, "/invoices" },
        { EcfType.E33, "/debit-notes" },
        { EcfType.E34, "/credit-notes" },
        { EcfType.E41, "/purchases" },
        { EcfType.E43, "/minor-expenses" },
        { EcfType.E44, "/special-regimes" },
        { EcfType.E45, "/gubernamentals" },
        { EcfType.E46, "/export-supports" },
        { EcfType.E47, "/payment-abroad-supports" }
    };

    public AlanubeClient(
        IHttpClientFactory httpClientFactory,
        ILogger<AlanubeClient> logger,
        IEigdoDbContext db,
        IAlanubeConfigProvider configProvider)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _db = db;
        _configProvider = configProvider;
    }

    // ────────── Reseller: Create Associated Company ──────────

    /// <summary>
    /// Registra una empresa asociada en Alanube bajo la cuenta reseller de eigdo.
    /// </summary>
    public async Task<(string? AlanubeCompanyId, string? Error)> CreateAssociatedCompanyAsync(
        string rnc, string companyName, string tradeName, string address,
        string province, string municipality, string phone, string email,
        byte[] certificateP12, string certificatePassword)
    {
        if (!await _configProvider.IsConfiguredAsync())
            return (null, "Alanube no esta configurado. Configure el token JWT en la administracion.");

        try
        {
            var client = await CreateAuthenticatedClientAsync();

            var payload = new
            {
                name = companyName,
                tradeName = tradeName,
                identification = rnc,
                address = address,
                province = province,
                municipality = municipality,
                phone = phone,
                mail = email,
                certificate = new
                {
                    file = Convert.ToBase64String(certificateP12),
                    password = certificatePassword,
                },
                type = "associated",
            };

            var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            });
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            _logger.LogInformation("Alanube: Creando empresa asociada RNC={Rnc}, Nombre={Name}", rnc, companyName);

            var response = await client.PostAsync("/company", content);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                var alanubeCompanyId = ExtractCompanyId(responseBody);
                if (string.IsNullOrEmpty(alanubeCompanyId))
                {
                    _logger.LogWarning("Alanube: Empresa creada pero no se pudo extraer el ID. Response: {Response}", responseBody);
                    return (null, "Empresa creada en Alanube pero no se pudo obtener el ID de respuesta.");
                }

                _logger.LogInformation("Alanube: Empresa asociada creada. AlanubeCompanyId={Id}", alanubeCompanyId);
                return (alanubeCompanyId, null);
            }
            else
            {
                var error = $"Alanube retorno HTTP {(int)response.StatusCode}: {responseBody}";
                _logger.LogWarning("Alanube: Error creando empresa asociada. {Error}", error);
                return (null, error);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Alanube: Excepcion creando empresa asociada RNC={Rnc}", rnc);
            return (null, $"Error de conexion con Alanube: {ex.Message}");
        }
    }

    // ────────── Reseller: Update Company Certificate ──────────

    /// <summary>
    /// Actualiza el certificado digital de una empresa asociada en Alanube.
    /// </summary>
    public async Task<(bool Success, string? Error)> UpdateCompanyCertificateAsync(
        string alanubeCompanyId, byte[] certificateP12, string certificatePassword)
    {
        if (!await _configProvider.IsConfiguredAsync())
            return (false, "Alanube no esta configurado. Configure el token JWT en la administracion.");

        try
        {
            var client = await CreateAuthenticatedClientAsync();

            var payload = new
            {
                certificate = new
                {
                    file = Convert.ToBase64String(certificateP12),
                    password = certificatePassword,
                },
            };

            var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            });
            var request = new HttpRequestMessage(HttpMethod.Patch, $"/company/{alanubeCompanyId}")
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json"),
            };

            _logger.LogInformation("Alanube: Actualizando certificado para empresa {CompanyId}", alanubeCompanyId);

            var response = await client.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Alanube: Certificado actualizado para empresa {CompanyId}", alanubeCompanyId);
                return (true, null);
            }
            else
            {
                var error = $"Alanube retorno HTTP {(int)response.StatusCode}: {responseBody}";
                _logger.LogWarning("Alanube: Error actualizando certificado. {Error}", error);
                return (false, error);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Alanube: Excepcion actualizando certificado para empresa {CompanyId}", alanubeCompanyId);
            return (false, $"Error de conexion con Alanube: {ex.Message}");
        }
    }

    // ────────── Emission (existing IFiscalProvider) ──────────

    public async Task<FiscalSubmitResult> SubmitAsync(EcfDocument document, string payloadJson, CancellationToken ct = default)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        if (!await _configProvider.IsConfiguredAsync())
            return new FiscalSubmitResult(false, null, "Alanube no esta configurado. Configure el token JWT en la administracion.", null);

        if (!EndpointMap.TryGetValue(document.EcfType, out var endpoint))
            return new FiscalSubmitResult(false, null, $"Tipo de e-CF no soportado: {document.EcfType}", null);

        HttpResponseMessage? response = null;
        string? responseBody = null;

        try
        {
            var client = await CreateAuthenticatedClientAsync();

            // Inject idCompany into payload if the company has an AlanubeCompanyId
            var finalPayload = await InjectCompanyIdIntoPayload(document.CompanyId, payloadJson);

            var content = new StringContent(finalPayload, Encoding.UTF8, "application/json");

            _logger.LogInformation("Alanube: Enviando {EcfType} a {Endpoint}", document.EcfType, endpoint);

            response = await client.PostAsync(endpoint, content, ct);
            responseBody = await response.Content.ReadAsStringAsync(ct);

            stopwatch.Stop();

            // Log the provider message
            await LogProviderMessage(document.Id, "POST", endpoint, finalPayload, responseBody, (int)response.StatusCode, stopwatch.ElapsedMilliseconds, ct);

            if (response.IsSuccessStatusCode)
            {
                var trackId = ExtractTrackId(responseBody);
                _logger.LogInformation("Alanube: Envio exitoso. TrackId: {TrackId}", trackId);
                return new FiscalSubmitResult(true, trackId, null, responseBody);
            }
            else
            {
                var error = $"Alanube retorno HTTP {(int)response.StatusCode}: {responseBody}";
                _logger.LogWarning("Alanube: Envio fallido. {Error}", error);
                return new FiscalSubmitResult(false, null, error, responseBody);
            }
        }
        catch (HttpRequestException ex)
        {
            stopwatch.Stop();
            var error = $"Error de conexion HTTP: {ex.Message}";
            _logger.LogError(ex, "Alanube: Error de conexion enviando {EcfType}", document.EcfType);
            await LogProviderMessage(document.Id, "POST", endpoint, payloadJson, ex.Message, 0, stopwatch.ElapsedMilliseconds, ct);
            return new FiscalSubmitResult(false, null, error, null);
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            stopwatch.Stop();
            var error = "Tiempo de espera agotado";
            _logger.LogWarning("Alanube: Timeout enviando {EcfType}", document.EcfType);
            await LogProviderMessage(document.Id, "POST", endpoint, payloadJson, error, 0, stopwatch.ElapsedMilliseconds, ct);
            return new FiscalSubmitResult(false, null, error, null);
        }
    }

    public async Task<FiscalStatusResult> GetStatusAsync(string trackId, CancellationToken ct = default)
    {
        if (!await _configProvider.IsConfiguredAsync())
            return new FiscalStatusResult(false, false, true, null, "Alanube no esta configurado.", null);

        try
        {
            var client = await CreateAuthenticatedClientAsync();

            var response = await client.GetAsync($"/documents/{trackId}/status", ct);
            var responseBody = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                return new FiscalStatusResult(false, false, true, null, $"HTTP {(int)response.StatusCode}", responseBody);
            }

            using var doc = JsonDocument.Parse(responseBody);
            var root = doc.RootElement;

            var status = root.TryGetProperty("status", out var statusProp) ? statusProp.GetString() : null;
            var message = root.TryGetProperty("message", out var msgProp) ? msgProp.GetString() : null;
            var encf = root.TryGetProperty("encf", out var encfProp) ? encfProp.GetString()
                     : root.TryGetProperty("eNCF", out var encfProp2) ? encfProp2.GetString()
                     : null;

            return status?.ToLower() switch
            {
                "accepted" or "approved" or "completed" => new FiscalStatusResult(true, false, false, encf, message, responseBody),
                "rejected" or "failed" or "error" => new FiscalStatusResult(false, true, false, null, message, responseBody),
                _ => new FiscalStatusResult(false, false, true, null, message ?? "Procesando", responseBody)
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error consultando estado para TrackId {TrackId}", trackId);
            return new FiscalStatusResult(false, false, true, null, ex.Message, null);
        }
    }

    public async Task<FiscalAnnulResult> AnnulAsync(string encf, string reason, CancellationToken ct = default)
    {
        if (!await _configProvider.IsConfiguredAsync())
            return new FiscalAnnulResult(false, "Alanube no esta configurado.");

        try
        {
            var client = await CreateAuthenticatedClientAsync();

            var payload = JsonSerializer.Serialize(new { encf, reason });
            var content = new StringContent(payload, Encoding.UTF8, "application/json");

            var response = await client.PostAsync("/annulments", content, ct);
            var responseBody = await response.Content.ReadAsStringAsync(ct);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Alanube: Anulacion enviada para {Encf}", encf);
                return new FiscalAnnulResult(true, "Anulacion enviada");
            }
            else
            {
                var error = $"Anulacion fallida: HTTP {(int)response.StatusCode}";
                _logger.LogWarning("Alanube: {Error} para {Encf}", error, encf);
                return new FiscalAnnulResult(false, error);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Alanube: Error anulando {Encf}", encf);
            return new FiscalAnnulResult(false, ex.Message);
        }
    }

    // ────────── Private Helpers ──────────

    private async Task<HttpClient> CreateAuthenticatedClientAsync()
    {
        var client = _httpClientFactory.CreateClient("alanube");

        // Override base address from DB config (may have changed since startup)
        var baseUrl = await _configProvider.GetBaseUrlAsync();
        if (!string.IsNullOrEmpty(baseUrl))
        {
            client.BaseAddress = new Uri(baseUrl);
        }

        // Set JWT token from DB config
        var token = await _configProvider.GetJwtTokenAsync();
        if (!string.IsNullOrEmpty(token))
        {
            client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        }

        return client;
    }

    /// <summary>
    /// Inyecta el idCompany en el payload JSON si la empresa tiene un AlanubeCompanyId registrado.
    /// </summary>
    private async Task<string> InjectCompanyIdIntoPayload(Guid companyId, string payloadJson)
    {
        try
        {
            var company = await _db.Companies.FindAsync(companyId);
            if (company?.AlanubeCompanyId == null)
                return payloadJson;

            using var doc = JsonDocument.Parse(payloadJson);
            var dict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(payloadJson)
                       ?? new Dictionary<string, JsonElement>();

            // Add idCompany at the top level
            using var ms = new System.IO.MemoryStream();
            using var writer = new Utf8JsonWriter(ms);
            writer.WriteStartObject();
            writer.WriteString("idCompany", company.AlanubeCompanyId);
            foreach (var kvp in dict)
            {
                writer.WritePropertyName(kvp.Key);
                kvp.Value.WriteTo(writer);
            }
            writer.WriteEndObject();
            writer.Flush();

            return Encoding.UTF8.GetString(ms.ToArray());
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo inyectar idCompany en el payload. Usando payload original.");
            return payloadJson;
        }
    }

    private string? ExtractCompanyId(string responseBody)
    {
        try
        {
            using var doc = JsonDocument.Parse(responseBody);
            var root = doc.RootElement;

            if (root.TryGetProperty("id", out var idProp))
                return idProp.ValueKind == JsonValueKind.Number ? idProp.GetInt64().ToString() : idProp.GetString();
            if (root.TryGetProperty("companyId", out var companyIdProp))
                return companyIdProp.ValueKind == JsonValueKind.Number ? companyIdProp.GetInt64().ToString() : companyIdProp.GetString();
            if (root.TryGetProperty("data", out var dataProp) && dataProp.TryGetProperty("id", out var dataIdProp))
                return dataIdProp.ValueKind == JsonValueKind.Number ? dataIdProp.GetInt64().ToString() : dataIdProp.GetString();

            return null;
        }
        catch
        {
            return null;
        }
    }

    private string? ExtractTrackId(string responseBody)
    {
        try
        {
            using var doc = JsonDocument.Parse(responseBody);
            var root = doc.RootElement;

            if (root.TryGetProperty("trackId", out var trackIdProp))
                return trackIdProp.GetString();
            if (root.TryGetProperty("track_id", out var trackIdSnake))
                return trackIdSnake.GetString();
            if (root.TryGetProperty("id", out var idProp))
                return idProp.GetString();

            return null;
        }
        catch
        {
            return null;
        }
    }

    private async Task LogProviderMessage(Guid docId, string method, string url, string? request, string? response, int statusCode, long durationMs, CancellationToken ct)
    {
        try
        {
            _db.ProviderMessages.Add(new ProviderMessage
            {
                EcfDocumentId = docId,
                Provider = "alanube",
                Direction = "outbound",
                HttpMethod = method,
                Url = url,
                RequestJson = request,
                ResponseJson = response,
                HttpStatusCode = statusCode,
                DurationMs = durationMs
            });
            await _db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error guardando mensaje del proveedor para documento {DocId}", docId);
        }
    }
}
