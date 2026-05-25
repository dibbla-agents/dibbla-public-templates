package main

import (
	"bytes"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/ledongthuc/pdf"
	"github.com/xuri/excelize/v2"
)

//go:embed dist/*
var embedDist embed.FS

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

type UploadedFile struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Size int64  `json:"size"`
	Data []byte `json:"-"`
}

type Session struct {
	ID        string
	Files     []UploadedFile
	CreatedAt time.Time
}

type Expense struct {
	Vendor      string   `json:"vendor"`
	Amount      *float64 `json:"amount"`
	Currency    string   `json:"currency"`
	Date        string   `json:"date"`
	Category    string   `json:"category"`
	Description string   `json:"description"`
	ReceiptRef  string   `json:"receipt_ref"`
	VAT         *float64 `json:"vat"`
}

// ---------------------------------------------------------------------------
// Session store
// ---------------------------------------------------------------------------

type SessionStore struct {
	mu       sync.RWMutex
	sessions map[string]*Session
}

func NewSessionStore() *SessionStore {
	s := &SessionStore{sessions: make(map[string]*Session)}
	go s.cleanup()
	return s
}

func (s *SessionStore) Get(id string) *Session {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.sessions[id]
}

func (s *SessionStore) GetOrCreate(id string) *Session {
	s.mu.Lock()
	defer s.mu.Unlock()
	if sess, ok := s.sessions[id]; ok {
		return sess
	}
	sess := &Session{ID: id, CreatedAt: time.Now()}
	s.sessions[id] = sess
	return sess
}

func (s *SessionStore) cleanup() {
	for {
		time.Sleep(30 * time.Minute)
		s.mu.Lock()
		for id, sess := range s.sessions {
			if time.Since(sess.CreatedAt) > 2*time.Hour {
				delete(s.sessions, id)
			}
		}
		s.mu.Unlock()
	}
}

// ---------------------------------------------------------------------------
// PDF text extraction
// ---------------------------------------------------------------------------

func extractTextFromPDF(data []byte) (string, error) {
	reader, err := pdf.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", fmt.Errorf("open PDF: %w", err)
	}

	var buf strings.Builder
	for i := 1; i <= reader.NumPage(); i++ {
		page := reader.Page(i)
		if page.V.IsNull() {
			continue
		}
		text, err := page.GetPlainText(nil)
		if err != nil {
			continue
		}
		buf.WriteString(text)
		buf.WriteString("\n")
	}

	return buf.String(), nil
}

// ---------------------------------------------------------------------------
// Platform client — calls services through the gateway
// ---------------------------------------------------------------------------

type PlatformClient struct {
	gatewayURL string
	httpClient *http.Client
}

func (pc *PlatformClient) doRequest(method, path string, body io.Reader, contentType string, authToken string) (*http.Response, error) {
	req, err := http.NewRequest(method, pc.gatewayURL+path, body)
	if err != nil {
		return nil, err
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	if authToken != "" {
		req.Header.Set("Authorization", "Bearer "+authToken)
	}
	return pc.httpClient.Do(req)
}

const expenseExtractorSystemPrompt = `You are an expense report assistant. You read receipt text and extract structured expense data.
Always respond with valid JSON only — no markdown, no explanation, no code fences.
Return a JSON array where each element has these fields:
- vendor: company or merchant name
- amount: total amount as a number (after tax)
- currency: 3-letter ISO code (e.g. USD, EUR, SEK)
- date: in YYYY-MM-DD format
- category: one of Travel, Meals, Office Supplies, Software, Equipment, Transportation, Accommodation, Other
- description: brief description of the purchase
- receipt_ref: receipt or invoice number if present, otherwise null
- vat: VAT/tax amount as a number if listed separately, otherwise null
If you cannot determine a field, use null.`

// ExtractExpenses calls Claude via the Dibbla AI Gateway to extract structured
// expense data from raw receipt text. The user's Dibbla token authenticates the
// call; the gateway swaps it for the platform-managed Anthropic key.
func (pc *PlatformClient) ExtractExpenses(receiptsText string, authToken string) ([]Expense, error) {
	aiGatewayURL := strings.TrimRight(os.Getenv("DIBBLA_AI_GATEWAY_URL"), "/")
	if aiGatewayURL == "" {
		aiGatewayURL = "https://ai.dibbla.net"
	}

	body, _ := json.Marshal(map[string]any{
		"model":      "claude-sonnet-4-6",
		"max_tokens": 4096,
		"system":     expenseExtractorSystemPrompt,
		"messages": []map[string]any{
			{"role": "user", "content": receiptsText},
		},
	})

	req, err := http.NewRequest("POST", aiGatewayURL+"/anthropic/v1/messages", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", authToken)
	req.Header.Set("anthropic-version", "2023-06-01")
	if alias := os.Getenv("DIBBLA_ALIAS"); alias != "" {
		req.Header.Set("X-Dibbla-App", alias)
	}

	resp, err := pc.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ai gateway request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read ai gateway response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ai gateway returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("decode ai gateway response: %w", err)
	}

	var raw string
	for _, c := range result.Content {
		if c.Type == "text" {
			raw = c.Text
			break
		}
	}
	raw = strings.TrimSpace(raw)
	if strings.HasPrefix(raw, "```") {
		raw = strings.TrimPrefix(raw, "```json")
		raw = strings.TrimPrefix(raw, "```")
		raw = strings.TrimSuffix(raw, "```")
		raw = strings.TrimSpace(raw)
	}

	var expenses []Expense
	if err := json.Unmarshal([]byte(raw), &expenses); err != nil {
		return nil, fmt.Errorf("parse expenses JSON: %w (raw: %.200s)", err, raw)
	}

	return expenses, nil
}

const requiredMicrosoftScope = "Files.ReadWrite"

// MissingScopesError is returned when the user hasn't granted the required Microsoft scopes.
type MissingScopesError struct {
	LoginURL string
}

func (e *MissingScopesError) Error() string {
	return "missing required Microsoft scopes"
}

// GetMicrosoftToken validates the user's auth token and returns a fresh Microsoft Graph access token.
//
// It logs each step under the "[msauth]" prefix so the exact failure point is
// visible in the backend logs. Three things commonly go wrong and they look
// alike to the frontend (all surface as "failed to get Microsoft authorization"):
//   - step 1: the Dibbla auth token is missing/stale → validate returns non-200
//   - step 2: the user has no Microsoft connection or missing scopes → gateway
//     returns 403 (with a login_url to recover, when one can be minted)
//   - running locally: the gateway can't mint a login_url for a localhost
//     return_to, so the 403 has no login_url and we fall through to a hard error
func (pc *PlatformClient) GetMicrosoftToken(authToken string, returnTo string) (string, error) {
	resp, err := pc.doRequest("POST", "/api/auth/v1/tokens/validate", nil, "", authToken)
	if err != nil {
		log.Printf("[msauth] step 1 FAILED: validate request error: %v", err)
		return "", fmt.Errorf("validate token failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Printf("[msauth] step 1 FAILED: validate returned %d: %s", resp.StatusCode, string(body))
		return "", fmt.Errorf("token validation returned %d", resp.StatusCode)
	}

	var uc struct {
		UserID string `json:"user_id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&uc); err != nil {
		log.Printf("[msauth] step 1 FAILED: decode validate response: %v", err)
		return "", fmt.Errorf("decode validate response: %w", err)
	}
	if uc.UserID == "" {
		log.Printf("[msauth] step 1 FAILED: validate returned 200 but no user_id")
		return "", fmt.Errorf("no user_id in validate response")
	}

	tokenURL := fmt.Sprintf("%s/auth/oauth/microsoft/token?user_id=%s&scopes=%s", pc.gatewayURL, uc.UserID, url.QueryEscape(requiredMicrosoftScope))
	if returnTo != "" {
		tokenURL += "&return_to=" + url.QueryEscape(returnTo)
	}
	// The token endpoint authenticates per-user: it vends a token only for the
	// user proven by the Bearer token, so the caller can never obtain another
	// user's token by passing a different user_id. Send the user's auth token.
	req2, err := http.NewRequest("GET", tokenURL, nil)
	if err != nil {
		log.Printf("[msauth] step 2 FAILED: build microsoft token request: %v", err)
		return "", fmt.Errorf("build microsoft token request: %w", err)
	}
	req2.Header.Set("Authorization", "Bearer "+authToken)
	resp2, err := pc.httpClient.Do(req2)
	if err != nil {
		log.Printf("[msauth] step 2 FAILED: microsoft token request error: %v", err)
		return "", fmt.Errorf("get microsoft token failed: %w", err)
	}
	defer resp2.Body.Close()

	if resp2.StatusCode == http.StatusForbidden {
		body, _ := io.ReadAll(resp2.Body)
		var scopeErr struct {
			Error         string   `json:"error"`
			Message       string   `json:"message"`
			LoginURL      string   `json:"login_url"`
			MissingScopes []string `json:"missing_scopes"`
			GrantedScopes []string `json:"granted_scopes"`
		}
		_ = json.Unmarshal(body, &scopeErr)
		// Log the parsed fields so we can distinguish NO_MICROSOFT_CONNECTION
		// (granted_scopes=[]) from MISSING_SCOPES (some granted but missing the
		// required one), and whether a recovery login_url was provided. This is
		// invaluable when debugging OAuth loops.
		log.Printf("[msauth] step 2: gateway returned 403 — error=%q message=%q granted=%v missing=%v login_url_present=%t",
			scopeErr.Error, scopeErr.Message, scopeErr.GrantedScopes, scopeErr.MissingScopes, scopeErr.LoginURL != "")
		log.Printf("[msauth] step 2: full 403 body: %s", string(body))
		// A 403 with a login_url means the user needs to (re-)authorize Microsoft
		// — either no connection yet (NO_MICROSOFT_CONNECTION) or missing scopes
		// (MISSING_SCOPES). Either way, the login_url is the recovery path.
		if scopeErr.LoginURL != "" {
			return "", &MissingScopesError{LoginURL: scopeErr.LoginURL}
		}
		// 403 with no login_url: typical when running locally, where the gateway
		// won't mint a redirect for a localhost return_to. The OneDrive feature
		// can only complete on a deployed app (--require-login --microsoft-scopes).
		log.Printf("[msauth] step 2 FAILED: 403 with no login_url — likely no Microsoft connection, or running locally (returnTo=%q)", returnTo)
		return "", fmt.Errorf("microsoft token returned 403 with no login_url: %s", string(body))
	}
	if resp2.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp2.Body)
		log.Printf("[msauth] step 2 FAILED: gateway returned %d: %s", resp2.StatusCode, string(body))
		return "", fmt.Errorf("microsoft token returned %d: %s", resp2.StatusCode, string(body))
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp2.Body).Decode(&tokenResp); err != nil {
		log.Printf("[msauth] step 2 FAILED: decode token response: %v", err)
		return "", fmt.Errorf("decode microsoft token response: %w", err)
	}
	if tokenResp.AccessToken == "" {
		log.Printf("[msauth] step 2 FAILED: gateway returned 200 but empty access_token")
		return "", fmt.Errorf("microsoft token response had empty access_token")
	}
	log.Printf("[msauth] step 2 OK: received Microsoft access token (%d chars)", len(tokenResp.AccessToken))

	return tokenResp.AccessToken, nil
}

// ---------------------------------------------------------------------------
// Excel workbook builder + OneDrive upload
// ---------------------------------------------------------------------------

// buildExcelWorkbook assembles the expense report as an .xlsx file in memory.
// Layout:
//
//	Row 1: "EXPENSE REPORT" (merged A1:H1, Dibbla dark bg, green bold title)
//	Row 2: "Generated <date> by Dibbla Expense Reporter" (merged, muted subtitle)
//	Row 3: spacer
//	Row 4: column headers (Dibbla green bg, white bold)
//	Row 5+: data rows (alternating light gray)
//	Last: totals row with SUM formulas (bold, top border, mid gray)
//	Last+2: "dibbla.com" footer
func buildExcelWorkbook(expenses []Expense) ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()

	sheet := "Sheet1"
	idx, err := f.GetSheetIndex(sheet)
	if err != nil {
		return nil, fmt.Errorf("get sheet index: %w", err)
	}
	f.SetActiveSheet(idx)

	now := time.Now()
	numCols := 8
	const (
		titleRow    = 1
		subtitleRow = 2
		headerRow   = 4
		dataStart   = 5
	)

	// Styles
	titleStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"0A0A0A"}},
		Font:      &excelize.Font{Bold: true, Size: 16, Color: "76B360"},
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center", Indent: 1},
	})
	subtitleStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"0A0A0A"}},
		Font:      &excelize.Font{Size: 9, Color: "999999"},
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center", Indent: 1},
	})
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"76B360"}},
		Font:      &excelize.Font{Bold: true, Size: 10, Color: "FFFFFF"},
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center"},
	})
	headerRightStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"76B360"}},
		Font:      &excelize.Font{Bold: true, Size: 10, Color: "FFFFFF"},
		Alignment: &excelize.Alignment{Horizontal: "right", Vertical: "center"},
	})
	cellStyle, _ := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Vertical: "center"},
	})
	cellAltStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"F5F5F5"}},
		Alignment: &excelize.Alignment{Vertical: "center"},
	})
	amountStyle, _ := f.NewStyle(&excelize.Style{
		Alignment:    &excelize.Alignment{Horizontal: "right", Vertical: "center"},
		NumFmt:       4, // #,##0.00
	})
	amountAltStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"F5F5F5"}},
		Alignment: &excelize.Alignment{Horizontal: "right", Vertical: "center"},
		NumFmt:    4,
	})
	descStyle, _ := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Vertical: "center", WrapText: true},
	})
	descAltStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"F5F5F5"}},
		Alignment: &excelize.Alignment{Vertical: "center", WrapText: true},
	})
	totalStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"D9D9D9"}},
		Font:      &excelize.Font{Bold: true},
		Alignment: &excelize.Alignment{Horizontal: "right", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "top", Color: "0A0A0A", Style: 2},
		},
	})
	totalAmountStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"D9D9D9"}},
		Font:      &excelize.Font{Bold: true},
		Alignment: &excelize.Alignment{Horizontal: "right", Vertical: "center"},
		NumFmt:    4,
		Border: []excelize.Border{
			{Type: "top", Color: "0A0A0A", Style: 2},
		},
	})
	footerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 8, Italic: true, Color: "808080"},
		Alignment: &excelize.Alignment{Horizontal: "right"},
	})

	// Title
	_ = f.SetCellValue(sheet, "A1", "EXPENSE REPORT")
	_ = f.MergeCell(sheet, "A1", colLetter(numCols)+"1")
	_ = f.SetCellStyle(sheet, "A1", colLetter(numCols)+"1", titleStyle)
	_ = f.SetRowHeight(sheet, titleRow, 30)

	// Subtitle
	_ = f.SetCellValue(sheet, "A2", fmt.Sprintf("Generated %s by Dibbla Expense Reporter", now.Format("January 2, 2006")))
	_ = f.MergeCell(sheet, "A2", colLetter(numCols)+"2")
	_ = f.SetCellStyle(sheet, "A2", colLetter(numCols)+"2", subtitleStyle)
	_ = f.SetRowHeight(sheet, subtitleRow, 18)

	// Column headers
	headers := []string{"Date", "Vendor", "Category", "Description", "Currency", "Amount", "VAT", "Receipt Ref"}
	for i, h := range headers {
		cell := fmt.Sprintf("%s%d", colLetter(i+1), headerRow)
		_ = f.SetCellValue(sheet, cell, h)
	}
	_ = f.SetCellStyle(sheet, fmt.Sprintf("A%d", headerRow), fmt.Sprintf("%s%d", colLetter(5), headerRow), headerStyle)
	_ = f.SetCellStyle(sheet, fmt.Sprintf("F%d", headerRow), fmt.Sprintf("G%d", headerRow), headerRightStyle)
	_ = f.SetCellStyle(sheet, fmt.Sprintf("H%d", headerRow), fmt.Sprintf("H%d", headerRow), headerStyle)
	_ = f.SetRowHeight(sheet, headerRow, 22)

	// Data rows
	for i, e := range expenses {
		row := dataStart + i
		alt := i%2 == 1

		_ = f.SetCellValue(sheet, fmt.Sprintf("A%d", row), e.Date)
		_ = f.SetCellValue(sheet, fmt.Sprintf("B%d", row), e.Vendor)
		_ = f.SetCellValue(sheet, fmt.Sprintf("C%d", row), e.Category)
		_ = f.SetCellValue(sheet, fmt.Sprintf("D%d", row), e.Description)
		_ = f.SetCellValue(sheet, fmt.Sprintf("E%d", row), e.Currency)
		if e.Amount != nil {
			_ = f.SetCellValue(sheet, fmt.Sprintf("F%d", row), *e.Amount)
		}
		if e.VAT != nil {
			_ = f.SetCellValue(sheet, fmt.Sprintf("G%d", row), *e.VAT)
		}
		_ = f.SetCellValue(sheet, fmt.Sprintf("H%d", row), e.ReceiptRef)

		cs, as, ds := cellStyle, amountStyle, descStyle
		if alt {
			cs, as, ds = cellAltStyle, amountAltStyle, descAltStyle
		}
		// A, B, C
		_ = f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("C%d", row), cs)
		// D (description, wrapped)
		_ = f.SetCellStyle(sheet, fmt.Sprintf("D%d", row), fmt.Sprintf("D%d", row), ds)
		// E (currency)
		_ = f.SetCellStyle(sheet, fmt.Sprintf("E%d", row), fmt.Sprintf("E%d", row), cs)
		// F, G (amounts, right-aligned, number format)
		_ = f.SetCellStyle(sheet, fmt.Sprintf("F%d", row), fmt.Sprintf("G%d", row), as)
		// H (receipt ref)
		_ = f.SetCellStyle(sheet, fmt.Sprintf("H%d", row), fmt.Sprintf("H%d", row), cs)
	}

	// Totals row
	totalRow := dataStart + len(expenses)
	if len(expenses) > 0 {
		_ = f.SetCellValue(sheet, fmt.Sprintf("E%d", totalRow), "TOTAL")
		_ = f.SetCellFormula(sheet, fmt.Sprintf("F%d", totalRow), fmt.Sprintf("SUM(F%d:F%d)", dataStart, totalRow-1))
		_ = f.SetCellFormula(sheet, fmt.Sprintf("G%d", totalRow), fmt.Sprintf("SUM(G%d:G%d)", dataStart, totalRow-1))
		_ = f.SetCellStyle(sheet, fmt.Sprintf("A%d", totalRow), fmt.Sprintf("E%d", totalRow), totalStyle)
		_ = f.SetCellStyle(sheet, fmt.Sprintf("F%d", totalRow), fmt.Sprintf("G%d", totalRow), totalAmountStyle)
		_ = f.SetCellStyle(sheet, fmt.Sprintf("H%d", totalRow), fmt.Sprintf("H%d", totalRow), totalStyle)
	}

	// Footer row
	footerRow := totalRow + 2
	if len(expenses) == 0 {
		footerRow = headerRow + 2
	}
	_ = f.SetCellValue(sheet, fmt.Sprintf("H%d", footerRow), "dibbla.com")
	_ = f.SetCellStyle(sheet, fmt.Sprintf("H%d", footerRow), fmt.Sprintf("H%d", footerRow), footerStyle)

	// Column widths
	_ = f.SetColWidth(sheet, "A", "A", 14)
	_ = f.SetColWidth(sheet, "B", "B", 22)
	_ = f.SetColWidth(sheet, "C", "C", 16)
	_ = f.SetColWidth(sheet, "D", "D", 50)
	_ = f.SetColWidth(sheet, "E", "E", 10)
	_ = f.SetColWidth(sheet, "F", "F", 12)
	_ = f.SetColWidth(sheet, "G", "G", 10)
	_ = f.SetColWidth(sheet, "H", "H", 18)

	// Freeze header rows
	_ = f.SetPanes(sheet, &excelize.Panes{
		Freeze:      true,
		YSplit:      headerRow,
		TopLeftCell: fmt.Sprintf("A%d", dataStart),
		ActivePane:  "bottomLeft",
	})

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, fmt.Errorf("write workbook: %w", err)
	}
	return buf.Bytes(), nil
}

func colLetter(n int) string {
	// 1=A, 2=B, …
	name, _ := excelize.ColumnNumberToName(n)
	return name
}

// uploadWorkbookToOneDrive PUTs the workbook bytes to the user's OneDrive root
// and returns the webUrl Excel Online can open.
func uploadWorkbookToOneDrive(msToken string, xlsxBytes []byte) (string, error) {
	client := &http.Client{Timeout: 60 * time.Second}
	fileName := fmt.Sprintf("Expense Report - %s.xlsx", time.Now().Format("2006-01-02 15-04-05"))

	// Path-addressable PUT into OneDrive root. The colon segments encode the
	// file path; spaces are percent-encoded. The @microsoft.graph.conflictBehavior
	// query param tells Graph to rename on collision so a second run the same
	// second doesn't clobber the first.
	graphURL := fmt.Sprintf(
		"https://graph.microsoft.com/v1.0/me/drive/root:/%s:/content?@microsoft.graph.conflictBehavior=rename",
		url.PathEscape(fileName),
	)

	req, _ := http.NewRequest("PUT", graphURL, bytes.NewReader(xlsxBytes))
	req.Header.Set("Authorization", "Bearer "+msToken)
	req.Header.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("upload workbook failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("upload workbook returned %d: %s", resp.StatusCode, string(body))
	}

	var item struct {
		ID     string `json:"id"`
		WebURL string `json:"webUrl"`
		Name   string `json:"name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&item); err != nil {
		return "", fmt.Errorf("decode upload response: %w", err)
	}
	return item.WebURL, nil
}

// createExcelWorkbook builds the .xlsx locally and uploads it to OneDrive.
func createExcelWorkbook(msToken string, expenses []Expense) (string, error) {
	xlsxBytes, err := buildExcelWorkbook(expenses)
	if err != nil {
		return "", err
	}
	return uploadWorkbookToOneDrive(msToken, xlsxBytes)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func getSessionID(c *fiber.Ctx) string {
	id := c.Cookies("session_id")
	if id == "" {
		id = uuid.New().String()
		c.Cookie(&fiber.Cookie{
			Name:     "session_id",
			Value:    id,
			HTTPOnly: true,
			SameSite: "Lax",
			MaxAge:   7200,
		})
	}
	return id
}

// ---------------------------------------------------------------------------
// Helpers — auth token resolution
// ---------------------------------------------------------------------------

// getAuthToken returns the auth token for gateway requests.
// In dev mode (MODE=dev), it uses DIBBLA_API_TOKEN from the environment.
// In production, it reads the auth_token cookie set by the gateway proxy.
func getAuthToken(c *fiber.Ctx) string {
	if os.Getenv("MODE") == "dev" {
		if token := os.Getenv("DIBBLA_TOKEN"); token != "" {
			return token
		}
	}
	return c.Cookies("auth_token")
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

func main() {
	_ = godotenv.Load()

	store := NewSessionStore()

	gatewayURL := os.Getenv("GATEWAY_URL")
	if gatewayURL == "" {
		gatewayURL = "https://api.dibbla.net"
	}
	platform := &PlatformClient{
		gatewayURL: strings.TrimRight(gatewayURL, "/"),
		httpClient: &http.Client{Timeout: 5 * time.Minute},
	}

	if os.Getenv("MODE") == "dev" {
		log.Println("Running in DEV mode — using DIBBLA_TOKEN for gateway auth")
	}

	app := fiber.New(fiber.Config{
		BodyLimit:             50 * 1024 * 1024,
		DisableStartupMessage: false,
	})

	app.Use(logger.New())

	// Upload PDFs
	app.Post("/api/upload", func(c *fiber.Ctx) error {
		sessID := getSessionID(c)
		sess := store.GetOrCreate(sessID)

		form, err := c.MultipartForm()
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "invalid multipart form"})
		}

		files := form.File["files"]
		if len(files) == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "no files provided"})
		}

		var added []UploadedFile
		for _, fh := range files {
			if len(sess.Files) >= 20 {
				return c.Status(400).JSON(fiber.Map{"error": "maximum 20 files per session"})
			}
			if fh.Size > 10*1024*1024 {
				return c.Status(400).JSON(fiber.Map{"error": fmt.Sprintf("file %q exceeds 10MB limit", fh.Filename)})
			}

			f, err := fh.Open()
			if err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "failed to read file"})
			}
			data, err := io.ReadAll(f)
			f.Close()
			if err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "failed to read file"})
			}

			if len(data) < 4 || string(data[:4]) != "%PDF" {
				return c.Status(400).JSON(fiber.Map{"error": fmt.Sprintf("file %q is not a valid PDF", fh.Filename)})
			}

			uf := UploadedFile{
				ID:   uuid.New().String(),
				Name: fh.Filename,
				Size: fh.Size,
				Data: data,
			}
			sess.Files = append(sess.Files, uf)
			added = append(added, UploadedFile{ID: uf.ID, Name: uf.Name, Size: uf.Size})
		}

		return c.JSON(fiber.Map{"files": added})
	})

	// List uploaded files
	app.Get("/api/uploads", func(c *fiber.Ctx) error {
		sessID := getSessionID(c)
		sess := store.Get(sessID)
		if sess == nil {
			return c.JSON(fiber.Map{"files": []any{}})
		}
		var files []fiber.Map
		for _, f := range sess.Files {
			files = append(files, fiber.Map{"id": f.ID, "name": f.Name, "size": f.Size})
		}
		return c.JSON(fiber.Map{"files": files})
	})

	// Delete uploaded file
	app.Delete("/api/uploads/:id", func(c *fiber.Ctx) error {
		sessID := getSessionID(c)
		sess := store.Get(sessID)
		if sess == nil {
			return c.JSON(fiber.Map{"ok": true})
		}
		fileID := c.Params("id")
		for i, f := range sess.Files {
			if f.ID == fileID {
				sess.Files = append(sess.Files[:i], sess.Files[i+1:]...)
				break
			}
		}
		return c.JSON(fiber.Map{"ok": true})
	})

	// Check Microsoft scopes — frontend calls this on page load
	app.Get("/api/check-scopes", func(c *fiber.Ctx) error {
		authToken := getAuthToken(c)
		if authToken == "" {
			return c.JSON(fiber.Map{"ok": true}) // no auth token yet, proxy will handle login
		}
		returnTo := c.Protocol() + "://" + c.Hostname()
		_, tokenErr := platform.GetMicrosoftToken(authToken, returnTo)
		if tokenErr != nil {
			var scopeErr *MissingScopesError
			if errors.As(tokenErr, &scopeErr) {
				loginURL := scopeErr.LoginURL
				// Only prepend gateway URL if login_url is a relative path
				if strings.HasPrefix(loginURL, "/") {
					loginURL = platform.gatewayURL + loginURL
				}
				return c.Status(403).JSON(fiber.Map{
					"error":     "missing_scopes",
					"login_url": loginURL,
				})
			}
			// Non-scope error (e.g. token validation failed, or a localhost 403
			// with no login_url) — don't hide it; the [msauth] logs above show
			// exactly which step failed.
			log.Printf("[check-scopes] non-scope error, returning ok=true to frontend: %v", tokenErr)
		}
		return c.JSON(fiber.Map{"ok": true})
	})

	// Generate expense report
	app.Post("/api/generate-report", func(c *fiber.Ctx) error {
		sessID := getSessionID(c)
		sess := store.Get(sessID)
		if sess == nil || len(sess.Files) == 0 {
			return c.Status(400).JSON(fiber.Map{"error": "no files uploaded"})
		}

		authToken := getAuthToken(c)
		if authToken == "" {
			return c.Status(401).JSON(fiber.Map{"error": "not authenticated — please log in"})
		}

		// 1. Extract text from all PDFs
		var allText strings.Builder
		for _, f := range sess.Files {
			text, err := extractTextFromPDF(f.Data)
			if err != nil {
				fmt.Fprintf(&allText, "\n--- %s (failed to extract text) ---\n", f.Name)
				continue
			}
			fmt.Fprintf(&allText, "\n--- Receipt: %s ---\n%s\n", f.Name, text)
		}

		receiptsText := strings.TrimSpace(allText.String())
		if receiptsText == "" {
			return c.Status(400).JSON(fiber.Map{"error": "could not extract text from any PDF"})
		}

		// 2. Extract expenses via the Dibbla AI Gateway
		expenses, err := platform.ExtractExpenses(receiptsText, authToken)
		if err != nil {
			log.Printf("Expense extraction failed: %v", err)
			return c.Status(500).JSON(fiber.Map{"error": "failed to extract expenses from receipts"})
		}

		// 3. Get Microsoft token and create/upload workbook
		msToken, tokenErr := platform.GetMicrosoftToken(authToken, c.Protocol()+"://"+c.Hostname())
		if tokenErr != nil {
			var scopeErr *MissingScopesError
			if errors.As(tokenErr, &scopeErr) {
				log.Printf("[generate-report] Microsoft auth needs (re-)consent, redirecting to login_url")
				loginURL := scopeErr.LoginURL
				if strings.HasPrefix(loginURL, "/") {
					loginURL = platform.gatewayURL + loginURL
				}
				return c.Status(403).JSON(fiber.Map{
					"error":     "Microsoft OneDrive permission is required. You will be redirected to grant access.",
					"login_url": loginURL,
				})
			}
			log.Printf("[generate-report] Microsoft token unavailable (see [msauth] logs for the failing step): %v", tokenErr)
			return c.Status(401).JSON(fiber.Map{"error": "failed to get Microsoft authorization — you may need to re-login with Microsoft"})
		}

		workbookURL, err := createExcelWorkbook(msToken, expenses)
		if err != nil {
			log.Printf("Excel workbook creation failed: %v", err)
			return c.Status(500).JSON(fiber.Map{"error": "failed to create Excel workbook", "expenses": expenses})
		}

		return c.JSON(fiber.Map{
			"workbook_url": workbookURL,
			"expenses":     expenses,
		})
	})

	// Static files & SPA fallback
	distFS, err := fs.Sub(embedDist, "dist")
	if err != nil {
		log.Fatal(err)
	}

	app.Use("/", filesystem.New(filesystem.Config{
		Root:   http.FS(distFS),
		Index:  "index.html",
		Browse: false,
		MaxAge: 3600,
	}))

	app.Use("*", func(c *fiber.Ctx) error {
		return filesystem.SendFile(c, http.FS(distFS), "index.html")
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "80"
	}
	log.Fatal(listenWithRetry(app, port))
}

func listenWithRetry(app *fiber.App, preferredPort string) error {
	p, _ := strconv.Atoi(preferredPort)
	if p == 0 {
		p = 80
	}
	const maxAttempts = 20
	for attempt := range maxAttempts {
		port := p + attempt
		if port > 65535 {
			break
		}
		ln, err := net.Listen("tcp4", ":"+strconv.Itoa(port))
		if err != nil {
			if attempt == 0 {
				log.Printf("Port %d is in use, trying another one...", port)
			}
			continue
		}
		if attempt > 0 {
			log.Printf("Using port %d instead", port)
		}
		writeDevPortFiles(port)
		installDevSignalCleanup(app)
		log.Printf("Backend listening on http://127.0.0.1:%d", port)
		err = app.Listener(ln)
		cleanupDevPortFiles()
		return err
	}
	return fmt.Errorf("no free port found in range %d–%d", p, p+maxAttempts-1)
}

// writeDevPortFiles publishes the actual bound port + pid so the Vite dev
// proxy and dev-task pre-flight can find us even if we fell back to a
// non-preferred port. Best-effort: a read-only filesystem (e.g. prod) just
// logs a warning and continues — the backend still runs normally.
func writeDevPortFiles(port int) {
	if err := os.MkdirAll(".dev", 0o755); err != nil {
		log.Printf("warn: could not create .dev dir: %v", err)
		return
	}
	if err := os.WriteFile(".dev/backend.port", []byte(strconv.Itoa(port)), 0o644); err != nil {
		log.Printf("warn: could not write .dev/backend.port: %v", err)
	}
	if err := os.WriteFile(".dev/backend.pid", []byte(strconv.Itoa(os.Getpid())), 0o644); err != nil {
		log.Printf("warn: could not write .dev/backend.pid: %v", err)
	}
}

func cleanupDevPortFiles() {
	_ = os.Remove(".dev/backend.port")
	_ = os.Remove(".dev/backend.pid")
}

func installDevSignalCleanup(app *fiber.App) {
	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigs
		cleanupDevPortFiles()
		_ = app.Shutdown()
	}()
}
