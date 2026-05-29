using System.Text;
using UglyToad.PdfPig;
using UglyToad.PdfPig.DocumentLayoutAnalysis.TextExtractor;

namespace ExpenseReporter;

/// <summary>
/// Extracts plain text from a PDF. Tolerant of per-page failures: a page that
/// can't be read is skipped rather than aborting the whole document (mirrors
/// the Go <c>extractTextFromPDF</c>).
/// </summary>
public static class PdfTextExtractor
{
    public static string Extract(byte[] data)
    {
        using var doc = PdfDocument.Open(data);
        var sb = new StringBuilder();
        foreach (var page in doc.GetPages())
        {
            try
            {
                sb.Append(ContentOrderTextExtractor.GetText(page));
                sb.Append('\n');
            }
            catch
            {
                // Skip pages that fail to extract — keep whatever we have.
            }
        }
        return sb.ToString();
    }
}
