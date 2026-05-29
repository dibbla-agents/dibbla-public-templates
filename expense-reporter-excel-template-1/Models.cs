using System.Text.Json.Serialization;

namespace ExpenseReporter;

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/// <summary>
/// A PDF receipt uploaded into a session. <see cref="Data"/> holds the raw
/// bytes and is never serialized to JSON (mirrors the Go `json:"-"` tag).
/// </summary>
public sealed class UploadedFile
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = "";

    [JsonPropertyName("name")]
    public string Name { get; set; } = "";

    [JsonPropertyName("size")]
    public long Size { get; set; }

    [JsonIgnore]
    public byte[] Data { get; set; } = Array.Empty<byte>();
}

/// <summary>An in-memory, cookie-keyed session holding a user's uploads.</summary>
public sealed class Session
{
    public string Id { get; set; } = "";
    public List<UploadedFile> Files { get; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// A structured expense extracted from receipt text by Claude. Field names map
/// to the JSON keys the model is asked to return (see the system prompt).
/// Amount/VAT are nullable so missing values serialize as JSON `null`.
/// </summary>
public sealed class Expense
{
    [JsonPropertyName("vendor")]
    public string? Vendor { get; set; }

    [JsonPropertyName("amount")]
    public double? Amount { get; set; }

    [JsonPropertyName("currency")]
    public string? Currency { get; set; }

    [JsonPropertyName("date")]
    public string? Date { get; set; }

    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("receipt_ref")]
    public string? ReceiptRef { get; set; }

    [JsonPropertyName("vat")]
    public double? Vat { get; set; }
}
