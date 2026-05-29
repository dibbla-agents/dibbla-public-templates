using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace ExpenseReporter;

/// <summary>
/// Raised when the user hasn't granted the required Microsoft scopes. Carries
/// the <see cref="LoginUrl"/> the frontend should redirect to for consent.
/// </summary>
public sealed class MissingScopesException(string loginUrl) : Exception("missing required Microsoft scopes")
{
    public string LoginUrl { get; } = loginUrl;
}

/// <summary>
/// Calls platform services through the Dibbla gateway and the AI gateway:
/// expense extraction (Claude) and Microsoft Graph token vending. Mirrors the
/// Go <c>PlatformClient</c>.
/// </summary>
public sealed class PlatformClient(IHttpClientFactory httpClientFactory, ILogger<PlatformClient> logger)
{
    private const string RequiredMicrosoftScope = "Files.ReadWrite.All";

    private const string ExpenseExtractorSystemPrompt =
        "You are an expense report assistant. You read receipt text and extract structured expense data.\n" +
        "Always respond with valid JSON only — no markdown, no explanation, no code fences.\n" +
        "Return a JSON array where each element has these fields:\n" +
        "- vendor: company or merchant name\n" +
        "- amount: total amount as a number (after tax)\n" +
        "- currency: 3-letter ISO code (e.g. USD, EUR, SEK)\n" +
        "- date: in YYYY-MM-DD format\n" +
        "- category: one of Travel, Meals, Office Supplies, Software, Equipment, Transportation, Accommodation, Other\n" +
        "- description: brief description of the purchase\n" +
        "- receipt_ref: receipt or invoice number if present, otherwise null\n" +
        "- vat: VAT/tax amount as a number if listed separately, otherwise null\n" +
        "If you cannot determine a field, use null.";

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    /// <summary>Dibbla gateway base URL (env <c>GATEWAY_URL</c>, default api.dibbla.net).</summary>
    public string GatewayUrl =>
        (Environment.GetEnvironmentVariable("GATEWAY_URL") is { Length: > 0 } g
            ? g
            : "https://api.dibbla.net").TrimEnd('/');

    /// <summary>
    /// Calls Claude via the Dibbla AI Gateway to extract structured expense data
    /// from raw receipt text. The user's Dibbla token authenticates the call;
    /// the gateway swaps it for the platform-managed Anthropic key.
    /// </summary>
    public async Task<List<Expense>> ExtractExpensesAsync(string receiptsText, string authToken)
    {
        var aiGatewayUrl = (Environment.GetEnvironmentVariable("DIBBLA_AI_GATEWAY_URL") is { Length: > 0 } v
            ? v
            : "https://ai.dibbla.net").TrimEnd('/');

        var payload = new
        {
            model = "claude-sonnet-4-6",
            max_tokens = 4096,
            system = ExpenseExtractorSystemPrompt,
            messages = new[]
            {
                new { role = "user", content = receiptsText },
            },
        };

        using var req = new HttpRequestMessage(HttpMethod.Post, aiGatewayUrl + "/anthropic/v1/messages")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"),
        };
        req.Headers.TryAddWithoutValidation("x-api-key", authToken);
        req.Headers.TryAddWithoutValidation("anthropic-version", "2023-06-01");
        if (Environment.GetEnvironmentVariable("DIBBLA_ALIAS") is { Length: > 0 } alias)
        {
            req.Headers.TryAddWithoutValidation("X-Dibbla-App", alias);
        }

        var client = httpClientFactory.CreateClient("platform");
        using var resp = await client.SendAsync(req);
        var respBody = await resp.Content.ReadAsStringAsync();
        if (resp.StatusCode != HttpStatusCode.OK)
        {
            throw new InvalidOperationException($"ai gateway returned {(int)resp.StatusCode}: {respBody}");
        }

        var parsed = JsonSerializer.Deserialize<AnthropicResponse>(respBody, JsonOpts);
        var raw = parsed?.Content?.FirstOrDefault(c => c.Type == "text")?.Text?.Trim() ?? "";

        if (raw.StartsWith("```"))
        {
            if (raw.StartsWith("```json")) raw = raw["```json".Length..];
            else raw = raw["```".Length..];
            if (raw.EndsWith("```")) raw = raw[..^3];
            raw = raw.Trim();
        }

        try
        {
            return JsonSerializer.Deserialize<List<Expense>>(raw, JsonOpts) ?? new List<Expense>();
        }
        catch (JsonException ex)
        {
            var snippet = raw.Length > 200 ? raw[..200] : raw;
            throw new InvalidOperationException($"parse expenses JSON: {ex.Message} (raw: {snippet})", ex);
        }
    }

    /// <summary>
    /// Validates the user's auth token and returns a fresh Microsoft Graph access
    /// token. Logs each step under the "[msauth]" prefix so the exact failure
    /// point is visible in the backend logs. Throws <see cref="MissingScopesException"/>
    /// when the gateway returns a 403 carrying a recovery login_url.
    /// </summary>
    public async Task<string> GetMicrosoftTokenAsync(string authToken, string returnTo)
    {
        var gatewayUrl = GatewayUrl;
        var client = httpClientFactory.CreateClient("platform");

        // Step 1: validate the Dibbla token and resolve the user id.
        using var validateReq = new HttpRequestMessage(HttpMethod.Post, gatewayUrl + "/api/auth/v1/tokens/validate");
        validateReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", authToken);

        HttpResponseMessage validateResp;
        try
        {
            validateResp = await client.SendAsync(validateReq);
        }
        catch (Exception ex)
        {
            logger.LogError("[msauth] step 1 FAILED: validate request error: {Error}", ex.Message);
            throw new InvalidOperationException($"validate token failed: {ex.Message}", ex);
        }

        using (validateResp)
        {
            if (validateResp.StatusCode != HttpStatusCode.OK)
            {
                var body = await validateResp.Content.ReadAsStringAsync();
                logger.LogError("[msauth] step 1 FAILED: validate returned {Status}: {Body}", (int)validateResp.StatusCode, body);
                throw new InvalidOperationException($"token validation returned {(int)validateResp.StatusCode}");
            }

            var uc = JsonSerializer.Deserialize<ValidateResponse>(await validateResp.Content.ReadAsStringAsync(), JsonOpts);
            if (uc is null || string.IsNullOrEmpty(uc.UserId))
            {
                logger.LogError("[msauth] step 1 FAILED: validate returned 200 but no user_id");
                throw new InvalidOperationException("no user_id in validate response");
            }

            // Step 2: vend a Microsoft Graph token for that user. The endpoint
            // authenticates per-user, so the caller can never obtain another
            // user's token by passing a different user_id.
            var tokenUrl = $"{gatewayUrl}/auth/oauth/microsoft/token?user_id={uc.UserId}&scopes={Uri.EscapeDataString(RequiredMicrosoftScope)}";
            if (!string.IsNullOrEmpty(returnTo))
            {
                tokenUrl += "&return_to=" + Uri.EscapeDataString(returnTo);
            }

            using var tokenReq = new HttpRequestMessage(HttpMethod.Get, tokenUrl);
            tokenReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", authToken);

            HttpResponseMessage tokenResp;
            try
            {
                tokenResp = await client.SendAsync(tokenReq);
            }
            catch (Exception ex)
            {
                logger.LogError("[msauth] step 2 FAILED: microsoft token request error: {Error}", ex.Message);
                throw new InvalidOperationException($"get microsoft token failed: {ex.Message}", ex);
            }

            using (tokenResp)
            {
                if (tokenResp.StatusCode == HttpStatusCode.Forbidden)
                {
                    var body = await tokenResp.Content.ReadAsStringAsync();
                    var scopeErr = SafeDeserialize<ScopeError>(body);
                    logger.LogError(
                        "[msauth] step 2: gateway returned 403 — error={Error} message={Message} granted={Granted} missing={Missing} login_url_present={HasLogin}",
                        scopeErr?.Error, scopeErr?.Message, scopeErr?.GrantedScopes, scopeErr?.MissingScopes, !string.IsNullOrEmpty(scopeErr?.LoginUrl));
                    logger.LogError("[msauth] step 2: full 403 body: {Body}", body);

                    if (!string.IsNullOrEmpty(scopeErr?.LoginUrl))
                    {
                        throw new MissingScopesException(scopeErr.LoginUrl);
                    }

                    logger.LogError("[msauth] step 2 FAILED: 403 with no login_url — likely no Microsoft connection, or running locally (returnTo={ReturnTo})", returnTo);
                    throw new InvalidOperationException($"microsoft token returned 403 with no login_url: {body}");
                }

                if (tokenResp.StatusCode != HttpStatusCode.OK)
                {
                    var body = await tokenResp.Content.ReadAsStringAsync();
                    logger.LogError("[msauth] step 2 FAILED: gateway returned {Status}: {Body}", (int)tokenResp.StatusCode, body);
                    throw new InvalidOperationException($"microsoft token returned {(int)tokenResp.StatusCode}: {body}");
                }

                var tokenData = JsonSerializer.Deserialize<MicrosoftTokenResponse>(await tokenResp.Content.ReadAsStringAsync(), JsonOpts);
                if (tokenData is null || string.IsNullOrEmpty(tokenData.AccessToken))
                {
                    logger.LogError("[msauth] step 2 FAILED: gateway returned 200 but empty access_token");
                    throw new InvalidOperationException("microsoft token response had empty access_token");
                }

                logger.LogInformation("[msauth] step 2 OK: received Microsoft access token ({Length} chars)", tokenData.AccessToken.Length);
                return tokenData.AccessToken;
            }
        }
    }

    private static T? SafeDeserialize<T>(string body)
    {
        try
        {
            return JsonSerializer.Deserialize<T>(body, JsonOpts);
        }
        catch
        {
            return default;
        }
    }

    // --- gateway response DTOs ---------------------------------------------

    private sealed class AnthropicResponse
    {
        [JsonPropertyName("content")]
        public List<AnthropicContent>? Content { get; set; }
    }

    private sealed class AnthropicContent
    {
        [JsonPropertyName("type")]
        public string? Type { get; set; }

        [JsonPropertyName("text")]
        public string? Text { get; set; }
    }

    private sealed class ValidateResponse
    {
        [JsonPropertyName("user_id")]
        public string? UserId { get; set; }
    }

    private sealed class ScopeError
    {
        [JsonPropertyName("error")]
        public string? Error { get; set; }

        [JsonPropertyName("message")]
        public string? Message { get; set; }

        [JsonPropertyName("login_url")]
        public string? LoginUrl { get; set; }

        [JsonPropertyName("missing_scopes")]
        public List<string>? MissingScopes { get; set; }

        [JsonPropertyName("granted_scopes")]
        public List<string>? GrantedScopes { get; set; }
    }

    private sealed class MicrosoftTokenResponse
    {
        [JsonPropertyName("access_token")]
        public string? AccessToken { get; set; }
    }
}
