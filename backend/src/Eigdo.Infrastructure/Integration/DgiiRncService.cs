using System.Net;
using System.Text.RegularExpressions;
using Eigdo.Application.DTOs.Dgii;
using Microsoft.Extensions.Logging;

namespace Eigdo.Infrastructure.Integration;

public interface IDgiiRncService
{
    Task<DgiiRncResultDto?> LookupRncAsync(string rnc, CancellationToken ct = default);
    Task<List<DgiiRncResultDto>> SearchByNameAsync(string name, CancellationToken ct = default);
}

public class DgiiRncService : IDgiiRncService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<DgiiRncService> _logger;
    private const string DgiiUrl = "https://dgii.gov.do/app/WebApps/ConsultasWeb2/ConsultasWeb/consultas/rnc.aspx";

    public DgiiRncService(IHttpClientFactory httpClientFactory, ILogger<DgiiRncService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<DgiiRncResultDto?> LookupRncAsync(string rnc, CancellationToken ct = default)
    {
        try
        {
            // Clean RNC: remove dashes, spaces
            rnc = rnc.Replace("-", "").Replace(" ", "").Trim();

            var handler = new HttpClientHandler
            {
                CookieContainer = new CookieContainer(),
                UseCookies = true,
                AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate
            };

            using var client = new HttpClient(handler);
            client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

            // Step 1: GET the page to get ViewState and cookies
            var getResponse = await client.GetStringAsync(DgiiUrl, ct);

            var viewState = ExtractHiddenField(getResponse, "__VIEWSTATE");
            var viewStateGenerator = ExtractHiddenField(getResponse, "__VIEWSTATEGENERATOR");
            var eventValidation = ExtractHiddenField(getResponse, "__EVENTVALIDATION");

            if (string.IsNullOrEmpty(viewState) || string.IsNullOrEmpty(eventValidation))
            {
                _logger.LogWarning("DGII: No se pudieron extraer los campos ocultos del formulario");
                return null;
            }

            // Step 2: POST the RNC search
            var postData = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["__VIEWSTATE"] = viewState,
                ["__VIEWSTATEGENERATOR"] = viewStateGenerator ?? "",
                ["__EVENTVALIDATION"] = eventValidation,
                ["ctl00$cphMain$txtRNCCedula"] = rnc,
                ["ctl00$cphMain$btnBuscarPorRNC"] = "Buscar",
                ["ctl00$cphMain$hidActiveTab"] = "tabByRNC"
            });

            var request = new HttpRequestMessage(HttpMethod.Post, DgiiUrl)
            {
                Content = postData
            };
            request.Headers.Add("Referer", DgiiUrl);
            request.Headers.Add("Origin", "https://dgii.gov.do");

            var response = await client.SendAsync(request, ct);
            var html = await response.Content.ReadAsStringAsync(ct);

            // Step 3: Parse the result
            return ParseResult(html);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DGII: Error al consultar RNC {Rnc}", rnc);
            return null;
        }
    }

    public async Task<List<DgiiRncResultDto>> SearchByNameAsync(string name, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length < 4)
            return new();

        try
        {
            var handler = new HttpClientHandler
            {
                CookieContainer = new CookieContainer(),
                UseCookies = true,
                AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate
            };

            using var client = new HttpClient(handler);
            client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

            var getResponse = await client.GetStringAsync(DgiiUrl, ct);
            var viewState = ExtractHiddenField(getResponse, "__VIEWSTATE");
            var viewStateGenerator = ExtractHiddenField(getResponse, "__VIEWSTATEGENERATOR");
            var eventValidation = ExtractHiddenField(getResponse, "__EVENTVALIDATION");

            if (string.IsNullOrEmpty(viewState) || string.IsNullOrEmpty(eventValidation))
                return new();

            var postData = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["__VIEWSTATE"] = viewState,
                ["__VIEWSTATEGENERATOR"] = viewStateGenerator ?? "",
                ["__EVENTVALIDATION"] = eventValidation,
                ["ctl00$cphMain$txtRazonSocial"] = name.Trim(),
                ["ctl00$cphMain$btnBuscarPorRazonSocial"] = "Buscar",
                ["ctl00$cphMain$hidActiveTab"] = "razonsocial"
            });

            var request = new HttpRequestMessage(HttpMethod.Post, DgiiUrl)
            {
                Content = postData
            };
            request.Headers.Add("Referer", DgiiUrl);
            request.Headers.Add("Origin", "https://dgii.gov.do");

            var response = await client.SendAsync(request, ct);
            var html = await response.Content.ReadAsStringAsync(ct);

            return ParseNameSearchResults(html);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DGII: Error al buscar por nombre '{Name}'", name);
            return new();
        }
    }

    private static List<DgiiRncResultDto> ParseNameSearchResults(string html)
    {
        var results = new List<DgiiRncResultDto>();

        // Table id="cphMain_gvBuscRazonSocial"
        // Columns: Cédula/RNC | Nombre/Razón Social | Nombre Comercial | Categoría | Régimen de pagos | Estado | Facturador Electrónico | ...
        var tableMatch = Regex.Match(html,
            @"id=""cphMain_gvBuscRazonSocial"".*?<tbody[^>]*>(.*?)</tbody>",
            RegexOptions.Singleline | RegexOptions.IgnoreCase);

        // Fallback: no tbody — parse rows directly from table
        if (!tableMatch.Success)
        {
            tableMatch = Regex.Match(html,
                @"id=""cphMain_gvBuscRazonSocial""[^>]*>(.*?)</table>",
                RegexOptions.Singleline | RegexOptions.IgnoreCase);
        }

        if (!tableMatch.Success) return results;

        var tableHtml = tableMatch.Groups[1].Value;
        var rowPattern = @"<tr[^>]*class=""TbRow""[^>]*>(.*?)</tr>";
        var cellPattern = @"<td[^>]*>(.*?)</td>";

        foreach (Match rowMatch in Regex.Matches(tableHtml, rowPattern, RegexOptions.Singleline | RegexOptions.IgnoreCase))
        {
            var cells = Regex.Matches(rowMatch.Groups[1].Value, cellPattern, RegexOptions.Singleline);
            if (cells.Count < 3) continue;

            var rnc = StripHtml(cells[0].Groups[1].Value).Replace("-", "").Trim();
            var razonSocial = StripHtml(cells[1].Groups[1].Value).Trim();
            var nombreComercial = StripHtml(cells[2].Groups[1].Value).Trim();
            var estado = cells.Count > 5 ? StripHtml(cells[5].Groups[1].Value).Trim() : "";
            var esFE = cells.Count > 6 && StripHtml(cells[6].Groups[1].Value).Trim().Equals("SI", StringComparison.OrdinalIgnoreCase);

            if (string.IsNullOrEmpty(rnc)) continue;

            results.Add(new DgiiRncResultDto
            {
                Rnc = rnc,
                RazonSocial = razonSocial,
                NombreComercial = nombreComercial == "&nbsp;" ? "" : nombreComercial,
                Estado = estado,
                EsFacturadorElectronico = esFE
            });
        }

        return results;
    }

    private static string? ExtractHiddenField(string html, string fieldName)
    {
        // Match: id="__VIEWSTATE" ... value="..."
        var pattern = $"id=\"{fieldName}\"[^>]*value=\"([^\"]*)\"";
        var match = Regex.Match(html, pattern);
        return match.Success ? match.Groups[1].Value : null;
    }

    private DgiiRncResultDto? ParseResult(string html)
    {
        // Find all <tr> with <td> pairs in the results section
        var rowPattern = @"<tr[^>]*>(.*?)</tr>";
        var cellPattern = @"<td[^>]*>(.*?)</td>";

        var fields = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (Match rowMatch in Regex.Matches(html, rowPattern, RegexOptions.Singleline))
        {
            var cells = Regex.Matches(rowMatch.Groups[1].Value, cellPattern, RegexOptions.Singleline);
            if (cells.Count == 2)
            {
                var label = StripHtml(cells[0].Groups[1].Value).Trim();
                var value = StripHtml(cells[1].Groups[1].Value).Trim();
                if (!string.IsNullOrEmpty(label) && !string.IsNullOrEmpty(value))
                {
                    fields[label] = value;
                }
            }
        }

        if (fields.Count == 0)
        {
            _logger.LogWarning("DGII: No se encontraron resultados para el RNC consultado");
            return null;
        }

        var dto = new DgiiRncResultDto();

        foreach (var kvp in fields)
        {
            var key = kvp.Key.ToLowerInvariant();

            if (key.Contains("rnc") || key.Contains("dula"))
                dto.Rnc = kvp.Value.Replace("-", "").Trim();
            else if (key.Contains("raz") && key.Contains("social"))
                dto.RazonSocial = kvp.Value;
            else if (key.Contains("nombre") && key.Contains("comercial"))
                dto.NombreComercial = kvp.Value;
            else if (key.Contains("estado"))
                dto.Estado = kvp.Value;
            else if (key.Contains("gimen"))
                dto.RegimenPagos = kvp.Value;
            else if (key.Contains("actividad"))
                dto.ActividadEconomica = kvp.Value;
            else if (key.Contains("administracion") || key.Contains("administración"))
                dto.AdministracionLocal = kvp.Value;
            else if (key.Contains("facturador"))
                dto.EsFacturadorElectronico = kvp.Value.Equals("SI", StringComparison.OrdinalIgnoreCase);
        }

        return string.IsNullOrEmpty(dto.RazonSocial) ? null : dto;
    }

    private static string StripHtml(string html)
    {
        var text = Regex.Replace(html, @"<[^>]+>", "");
        return WebUtility.HtmlDecode(text).Trim();
    }
}
