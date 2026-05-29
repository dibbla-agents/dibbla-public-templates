using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using ClosedXML.Excel;

namespace ExpenseReporter;

/// <summary>
/// Builds the styled expense-report workbook in memory and uploads it to the
/// user's OneDrive via Microsoft Graph. Reproduces the Go excelize layout.
/// </summary>
public sealed class ExcelReportBuilder(IHttpClientFactory httpClientFactory)
{
    private const string Dark = "#0A0A0A";
    private const string Green = "#76B360";
    private const string AltFill = "#F5F5F5";
    private const string TotalFill = "#D9D9D9";
    private const string NumFmt = "#,##0.00";
    private const int NumCols = 8;

    /// <summary>
    /// Layout:
    ///   Row 1: "EXPENSE REPORT" (merged A1:H1, dark bg, green bold title)
    ///   Row 2: "Generated &lt;date&gt; by Dibbla Expense Reporter" (merged, muted)
    ///   Row 3: spacer
    ///   Row 4: column headers (green bg, white bold)
    ///   Row 5+: data rows (alternating light gray)
    ///   Last: totals row with SUM formulas (bold, top border, mid gray)
    ///   Last+2: "dibbla.com" footer
    /// </summary>
    public byte[] Build(IReadOnlyList<Expense> expenses)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Sheet1");

        const int titleRow = 1;
        const int subtitleRow = 2;
        const int headerRow = 4;
        const int dataStart = 5;

        // Title
        var title = ws.Range(titleRow, 1, titleRow, NumCols).Merge();
        title.Value = "EXPENSE REPORT";
        title.Style.Fill.BackgroundColor = XLColor.FromHtml(Dark);
        title.Style.Font.Bold = true;
        title.Style.Font.FontSize = 16;
        title.Style.Font.FontColor = XLColor.FromHtml(Green);
        title.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
        title.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        title.Style.Alignment.Indent = 1;
        ws.Row(titleRow).Height = 30;

        // Subtitle
        var subtitle = ws.Range(subtitleRow, 1, subtitleRow, NumCols).Merge();
        subtitle.Value = $"Generated {DateTime.Now.ToString("MMMM d, yyyy", CultureInfo.InvariantCulture)} by Dibbla Expense Reporter";
        subtitle.Style.Fill.BackgroundColor = XLColor.FromHtml(Dark);
        subtitle.Style.Font.FontSize = 9;
        subtitle.Style.Font.FontColor = XLColor.FromHtml("#999999");
        subtitle.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
        subtitle.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        subtitle.Style.Alignment.Indent = 1;
        ws.Row(subtitleRow).Height = 18;

        // Column headers
        var headers = new[] { "Date", "Vendor", "Category", "Description", "Currency", "Amount", "VAT", "Receipt Ref" };
        for (var i = 0; i < headers.Length; i++)
        {
            ws.Cell(headerRow, i + 1).Value = headers[i];
        }
        var headerRange = ws.Range(headerRow, 1, headerRow, NumCols);
        headerRange.Style.Fill.BackgroundColor = XLColor.FromHtml(Green);
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Font.FontSize = 10;
        headerRange.Style.Font.FontColor = XLColor.White;
        headerRange.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
        headerRange.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
        // Amount + VAT headers right-aligned (cols F, G)
        ws.Range(headerRow, 6, headerRow, 7).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
        ws.Row(headerRow).Height = 22;

        // Data rows
        for (var i = 0; i < expenses.Count; i++)
        {
            var e = expenses[i];
            var row = dataStart + i;
            var alt = i % 2 == 1;

            ws.Cell(row, 1).Value = e.Date ?? "";
            ws.Cell(row, 2).Value = e.Vendor ?? "";
            ws.Cell(row, 3).Value = e.Category ?? "";
            ws.Cell(row, 4).Value = e.Description ?? "";
            ws.Cell(row, 5).Value = e.Currency ?? "";
            if (e.Amount.HasValue) ws.Cell(row, 6).Value = e.Amount.Value;
            if (e.Vat.HasValue) ws.Cell(row, 7).Value = e.Vat.Value;
            ws.Cell(row, 8).Value = e.ReceiptRef ?? "";

            var full = ws.Range(row, 1, row, NumCols);
            full.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            if (alt) full.Style.Fill.BackgroundColor = XLColor.FromHtml(AltFill);

            // Description (D) wraps
            ws.Cell(row, 4).Style.Alignment.WrapText = true;
            // Amount + VAT (F, G) right-aligned with number format
            var amounts = ws.Range(row, 6, row, 7);
            amounts.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
            amounts.Style.NumberFormat.Format = NumFmt;
        }

        // Totals row
        var totalRow = dataStart + expenses.Count;
        if (expenses.Count > 0)
        {
            ws.Cell(totalRow, 5).Value = "TOTAL";
            ws.Cell(totalRow, 6).FormulaA1 = $"SUM(F{dataStart}:F{totalRow - 1})";
            ws.Cell(totalRow, 7).FormulaA1 = $"SUM(G{dataStart}:G{totalRow - 1})";

            var totals = ws.Range(totalRow, 1, totalRow, NumCols);
            totals.Style.Fill.BackgroundColor = XLColor.FromHtml(TotalFill);
            totals.Style.Font.Bold = true;
            totals.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
            totals.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            totals.Style.Border.TopBorder = XLBorderStyleValues.Medium;
            totals.Style.Border.TopBorderColor = XLColor.FromHtml(Dark);
            // Amount + VAT totals keep the number format
            ws.Range(totalRow, 6, totalRow, 7).Style.NumberFormat.Format = NumFmt;
        }

        // Footer row
        var footerRow = expenses.Count == 0 ? headerRow + 2 : totalRow + 2;
        var footer = ws.Cell(footerRow, 8);
        footer.Value = "dibbla.com";
        footer.Style.Font.FontSize = 8;
        footer.Style.Font.Italic = true;
        footer.Style.Font.FontColor = XLColor.FromHtml("#808080");
        footer.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

        // Column widths
        ws.Column("A").Width = 14;
        ws.Column("B").Width = 22;
        ws.Column("C").Width = 16;
        ws.Column("D").Width = 50;
        ws.Column("E").Width = 10;
        ws.Column("F").Width = 12;
        ws.Column("G").Width = 10;
        ws.Column("H").Width = 18;

        // Freeze the header rows (everything above row 5)
        ws.SheetView.FreezeRows(headerRow);

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    /// <summary>
    /// PUTs the workbook bytes to the user's OneDrive root and returns the webUrl
    /// Excel Online can open. conflictBehavior=rename avoids clobbering a file
    /// created in the same second.
    /// </summary>
    public async Task<string> UploadToOneDriveAsync(string msToken, byte[] xlsxBytes)
    {
        var fileName = $"Expense Report - {DateTime.Now.ToString("yyyy-MM-dd HH-mm-ss", CultureInfo.InvariantCulture)}.xlsx";
        var graphUrl =
            $"https://graph.microsoft.com/v1.0/me/drive/root:/{Uri.EscapeDataString(fileName)}:/content?@microsoft.graph.conflictBehavior=rename";

        using var req = new HttpRequestMessage(HttpMethod.Put, graphUrl)
        {
            Content = new ByteArrayContent(xlsxBytes),
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", msToken);
        req.Content.Headers.ContentType =
            new MediaTypeHeaderValue("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        var client = httpClientFactory.CreateClient("graph");
        using var resp = await client.SendAsync(req);
        if (resp.StatusCode != HttpStatusCode.OK && resp.StatusCode != HttpStatusCode.Created)
        {
            var body = await resp.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"upload workbook returned {(int)resp.StatusCode}: {body}");
        }

        var item = JsonSerializer.Deserialize<DriveItem>(await resp.Content.ReadAsStringAsync());
        return item?.WebUrl ?? "";
    }

    private sealed class DriveItem
    {
        [JsonPropertyName("webUrl")]
        public string? WebUrl { get; set; }
    }
}
