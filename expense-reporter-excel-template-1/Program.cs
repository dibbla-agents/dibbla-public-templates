using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.Json.Serialization;
using ExpenseReporter;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.FileProviders;

// Load optional .env (dev convenience). Mirrors godotenv.Load(): real process
// environment variables always win, so a committed dev .env can never override
// the values Dibbla injects in production.
if (File.Exists(".env"))
{
    DotNetEnv.Env.Load(".env", new DotNetEnv.LoadOptions(clobberExistingVars: false));
}

var builder = WebApplication.CreateBuilder(args);

// Pick the listen port up front, mimicking the Go listenWithRetry: prefer PORT
// (default 80), then fall back to the next 20 ports if it's taken.
var preferredPort = int.TryParse(Environment.GetEnvironmentVariable("PORT"), out var p) && p > 0 ? p : 80;
var chosenPort = ChoosePort(preferredPort);
builder.WebHost.UseUrls($"http://0.0.0.0:{chosenPort}");

builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 50 * 1024 * 1024);
builder.Services.Configure<FormOptions>(o =>
{
    o.MultipartBodyLengthLimit = 50 * 1024 * 1024;
});

// Preserve exact JSON keys (login_url, workbook_url, …); rely on explicit
// [JsonPropertyName] attributes on DTOs.
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.PropertyNamingPolicy = null;
    o.SerializerOptions.PropertyNameCaseInsensitive = true;
    o.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
});

builder.Services.AddHttpClient("platform", c => c.Timeout = TimeSpan.FromMinutes(5));
builder.Services.AddHttpClient("graph", c => c.Timeout = TimeSpan.FromSeconds(60));
builder.Services.AddSingleton<SessionStore>();
builder.Services.AddHostedService<SessionCleanupService>();
builder.Services.AddSingleton<PlatformClient>();
builder.Services.AddSingleton<ExcelReportBuilder>();

var app = builder.Build();

if (Environment.GetEnvironmentVariable("MODE") == "dev")
{
    app.Logger.LogInformation("Running in DEV mode — using DIBBLA_TOKEN for gateway auth");
}

var store = app.Services.GetRequiredService<SessionStore>();
var platform = app.Services.GetRequiredService<PlatformClient>();
var excel = app.Services.GetRequiredService<ExcelReportBuilder>();

// ---------------------------------------------------------------------------
// Static frontend (built to dist/) + SPA fallback
// ---------------------------------------------------------------------------
var distPath = ResolveDistPath();
Directory.CreateDirectory(distPath);
var distProvider = new PhysicalFileProvider(distPath);

app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = distProvider });
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = distProvider,
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.CacheControl = "public, max-age=3600";
    },
});

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

// Upload PDFs
app.MapPost("/api/upload", async (HttpContext ctx) =>
{
    var sessId = GetSessionId(ctx);
    var sess = store.GetOrCreate(sessId);

    if (!ctx.Request.HasFormContentType)
    {
        return Results.Json(new { error = "invalid multipart form" }, statusCode: 400);
    }

    var form = await ctx.Request.ReadFormAsync();
    var files = form.Files.GetFiles("files");
    if (files.Count == 0)
    {
        return Results.Json(new { error = "no files provided" }, statusCode: 400);
    }

    var added = new List<object>();
    foreach (var fh in files)
    {
        if (sess.Files.Count >= 20)
        {
            return Results.Json(new { error = "maximum 20 files per session" }, statusCode: 400);
        }
        if (fh.Length > 10 * 1024 * 1024)
        {
            return Results.Json(new { error = $"file \"{fh.FileName}\" exceeds 10MB limit" }, statusCode: 400);
        }

        byte[] data;
        using (var ms = new MemoryStream())
        {
            await fh.CopyToAsync(ms);
            data = ms.ToArray();
        }

        if (data.Length < 4 || Encoding.ASCII.GetString(data, 0, 4) != "%PDF")
        {
            return Results.Json(new { error = $"file \"{fh.FileName}\" is not a valid PDF" }, statusCode: 400);
        }

        var uf = new UploadedFile
        {
            Id = Guid.NewGuid().ToString(),
            Name = fh.FileName,
            Size = fh.Length,
            Data = data,
        };
        sess.Files.Add(uf);
        added.Add(new { id = uf.Id, name = uf.Name, size = uf.Size });
    }

    return Results.Json(new { files = added });
});

// List uploaded files
app.MapGet("/api/uploads", (HttpContext ctx) =>
{
    var sessId = GetSessionId(ctx);
    var sess = store.Get(sessId);
    if (sess is null)
    {
        return Results.Json(new { files = Array.Empty<object>() });
    }
    var files = sess.Files.Select(f => (object)new { id = f.Id, name = f.Name, size = f.Size }).ToList();
    return Results.Json(new { files });
});

// Delete uploaded file
app.MapDelete("/api/uploads/{id}", (HttpContext ctx, string id) =>
{
    var sessId = GetSessionId(ctx);
    var sess = store.Get(sessId);
    if (sess is null)
    {
        return Results.Json(new { ok = true });
    }
    var idx = sess.Files.FindIndex(f => f.Id == id);
    if (idx >= 0)
    {
        sess.Files.RemoveAt(idx);
    }
    return Results.Json(new { ok = true });
});

// Check Microsoft scopes — frontend calls this on page load
app.MapGet("/api/check-scopes", async (HttpContext ctx) =>
{
    var authToken = GetAuthToken(ctx);
    if (string.IsNullOrEmpty(authToken))
    {
        return Results.Json(new { ok = true }); // no auth token yet, proxy will handle login
    }

    var returnTo = GetReturnTo(ctx);
    try
    {
        await platform.GetMicrosoftTokenAsync(authToken, returnTo);
    }
    catch (MissingScopesException scopeErr)
    {
        return Results.Json(new { error = "missing_scopes", login_url = ResolveLoginUrl(scopeErr.LoginUrl) }, statusCode: 403);
    }
    catch (Exception ex)
    {
        // Non-scope error (token validation failed, or a localhost 403 with no
        // login_url) — don't hide it; the [msauth] logs show which step failed.
        app.Logger.LogInformation("[check-scopes] non-scope error, returning ok=true to frontend: {Error}", ex.Message);
    }
    return Results.Json(new { ok = true });
});

// Generate expense report
app.MapPost("/api/generate-report", async (HttpContext ctx) =>
{
    var sessId = GetSessionId(ctx);
    var sess = store.Get(sessId);
    if (sess is null || sess.Files.Count == 0)
    {
        return Results.Json(new { error = "no files uploaded" }, statusCode: 400);
    }

    var authToken = GetAuthToken(ctx);
    if (string.IsNullOrEmpty(authToken))
    {
        return Results.Json(new { error = "not authenticated — please log in" }, statusCode: 401);
    }

    // 1. Extract text from all PDFs
    var allText = new StringBuilder();
    foreach (var f in sess.Files)
    {
        try
        {
            var text = PdfTextExtractor.Extract(f.Data);
            allText.Append($"\n--- Receipt: {f.Name} ---\n{text}\n");
        }
        catch
        {
            allText.Append($"\n--- {f.Name} (failed to extract text) ---\n");
        }
    }

    var receiptsText = allText.ToString().Trim();
    if (receiptsText.Length == 0)
    {
        return Results.Json(new { error = "could not extract text from any PDF" }, statusCode: 400);
    }

    // 2. Extract expenses via the Dibbla AI Gateway
    List<Expense> expenses;
    try
    {
        expenses = await platform.ExtractExpensesAsync(receiptsText, authToken);
    }
    catch (Exception ex)
    {
        app.Logger.LogError("Expense extraction failed: {Error}", ex.Message);
        return Results.Json(new { error = "failed to extract expenses from receipts" }, statusCode: 500);
    }

    // 3. Get Microsoft token
    string msToken;
    try
    {
        msToken = await platform.GetMicrosoftTokenAsync(authToken, GetReturnTo(ctx));
    }
    catch (MissingScopesException scopeErr)
    {
        app.Logger.LogInformation("[generate-report] Microsoft auth needs (re-)consent, redirecting to login_url");
        return Results.Json(new
        {
            error = "Microsoft OneDrive permission is required. You will be redirected to grant access.",
            login_url = ResolveLoginUrl(scopeErr.LoginUrl),
        }, statusCode: 403);
    }
    catch (Exception ex)
    {
        app.Logger.LogInformation("[generate-report] Microsoft token unavailable (see [msauth] logs for the failing step): {Error}", ex.Message);
        return Results.Json(new { error = "failed to get Microsoft authorization — you may need to re-login with Microsoft" }, statusCode: 401);
    }

    // 4. Build the workbook and upload to OneDrive
    try
    {
        var xlsxBytes = excel.Build(expenses);
        var workbookUrl = await excel.UploadToOneDriveAsync(msToken, xlsxBytes);
        return Results.Json(new { workbook_url = workbookUrl, expenses });
    }
    catch (Exception ex)
    {
        app.Logger.LogError("Excel workbook creation failed: {Error}", ex.Message);
        return Results.Json(new { error = "failed to create Excel workbook", expenses }, statusCode: 500);
    }
});

// SPA fallback: any non-API, non-asset path serves index.html for client-side routing.
app.MapFallback((HttpContext ctx) =>
{
    var indexPath = Path.Combine(distPath, "index.html");
    if (!File.Exists(indexPath))
    {
        return Results.NotFound();
    }
    return Results.File(indexPath, "text/html");
});

// Publish the bound port + pid so the Vite dev proxy can find us even if we
// fell back to a non-preferred port; clean up on shutdown (SIGINT/SIGTERM).
app.Lifetime.ApplicationStarted.Register(() =>
{
    WriteDevPortFiles(chosenPort);
    app.Logger.LogInformation("Backend listening on http://127.0.0.1:{Port}", chosenPort);
});
app.Lifetime.ApplicationStopping.Register(CleanupDevPortFiles);

app.Run();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

static string GetSessionId(HttpContext ctx)
{
    var id = ctx.Request.Cookies["session_id"];
    if (string.IsNullOrEmpty(id))
    {
        id = Guid.NewGuid().ToString();
        ctx.Response.Cookies.Append("session_id", id, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            MaxAge = TimeSpan.FromSeconds(7200),
        });
    }
    return id;
}

// In dev mode (MODE=dev), use DIBBLA_TOKEN from the environment. In production,
// read the auth_token cookie set by the gateway proxy.
static string GetAuthToken(HttpContext ctx)
{
    if (Environment.GetEnvironmentVariable("MODE") == "dev")
    {
        var token = Environment.GetEnvironmentVariable("DIBBLA_TOKEN");
        if (!string.IsNullOrEmpty(token))
        {
            return token;
        }
    }
    return ctx.Request.Cookies["auth_token"] ?? "";
}

string ResolveLoginUrl(string loginUrl) =>
    loginUrl.StartsWith('/') ? platform.GatewayUrl + loginUrl : loginUrl;

// The URL the Microsoft consent flow returns the browser to. Deployed, the
// request host is the public URL and works as-is. In local dev the Vite proxy
// (changeOrigin) hides the browser's real origin, so set APP_PUBLIC_URL (e.g.
// http://localhost:5305) to round-trip consent back to the running frontend.
static string GetReturnTo(HttpContext ctx)
{
    var pub = Environment.GetEnvironmentVariable("APP_PUBLIC_URL");
    if (!string.IsNullOrEmpty(pub))
    {
        return pub.TrimEnd('/');
    }
    return $"{ctx.Request.Scheme}://{ctx.Request.Host.Value}";
}

static string ResolveDistPath()
{
    // In the container, dist/ sits next to the DLL. In local dev (dotnet run
    // from the repo root), it's the dist/ at the working directory.
    var candidates = new[]
    {
        Path.Combine(AppContext.BaseDirectory, "dist"),
        Path.Combine(Directory.GetCurrentDirectory(), "dist"),
    };
    foreach (var c in candidates)
    {
        if (Directory.Exists(c))
        {
            return c;
        }
    }
    return candidates[0];
}

void WriteDevPortFiles(int port)
{
    try
    {
        Directory.CreateDirectory(".dev");
        File.WriteAllText(".dev/backend.port", port.ToString());
        File.WriteAllText(".dev/backend.pid", Environment.ProcessId.ToString());
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning("could not write .dev port files: {Error}", ex.Message);
    }
}

static void CleanupDevPortFiles()
{
    try { File.Delete(".dev/backend.port"); } catch { /* best effort */ }
    try { File.Delete(".dev/backend.pid"); } catch { /* best effort */ }
}

static int ChoosePort(int preferred)
{
    const int maxAttempts = 20;
    for (var attempt = 0; attempt < maxAttempts; attempt++)
    {
        var port = preferred + attempt;
        if (port > 65535)
        {
            break;
        }
        try
        {
            var listener = new TcpListener(IPAddress.Any, port);
            listener.Start();
            listener.Stop();
            if (attempt > 0)
            {
                Console.WriteLine($"Using port {port} instead");
            }
            return port;
        }
        catch (SocketException)
        {
            if (attempt == 0)
            {
                Console.WriteLine($"Port {port} is in use, trying another one...");
            }
        }
    }
    throw new IOException($"no free port found in range {preferred}–{preferred + maxAttempts - 1}");
}
