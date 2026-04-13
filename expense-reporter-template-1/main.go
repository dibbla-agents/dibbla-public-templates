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
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/ledongthuc/pdf"
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

// ExecuteWorkflow sends extracted receipt text to the expense-extractor workflow.
func (pc *PlatformClient) ExecuteWorkflow(workflowPath string, receiptsText string, authToken string) ([]Expense, error) {
	body, _ := json.Marshal(map[string]any{
		"receipts_text": receiptsText,
	})

	resp, err := pc.doRequest("POST", workflowPath, bytes.NewReader(body), "application/json", authToken)
	if err != nil {
		return nil, fmt.Errorf("workflow execute failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read workflow response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("workflow returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Expenses string `json:"expenses"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("decode workflow response: %w", err)
	}

	// Strip markdown code fences if the agent wrapped the JSON
	raw := strings.TrimSpace(result.Expenses)
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

const requiredGoogleScope = "https://www.googleapis.com/auth/spreadsheets"

// MissingScopesError is returned when the user hasn't granted the required Google scopes.
type MissingScopesError struct {
	LoginURL string
}

func (e *MissingScopesError) Error() string {
	return "missing required Google scopes"
}

// GetGoogleToken validates the user's auth token and returns a fresh Google access token.
func (pc *PlatformClient) GetGoogleToken(authToken string) (string, error) {
	resp, err := pc.doRequest("POST", "/api/auth/v1/tokens/validate", nil, "", authToken)
	if err != nil {
		return "", fmt.Errorf("validate token failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("token validation returned %d", resp.StatusCode)
	}

	var uc struct {
		UserID string `json:"user_id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&uc); err != nil {
		return "", fmt.Errorf("decode validate response: %w", err)
	}
	if uc.UserID == "" {
		return "", fmt.Errorf("no user_id in validate response")
	}

	resp2, err := pc.httpClient.Get(fmt.Sprintf("%s/auth/oauth/google/token?user_id=%s&scopes=%s", pc.gatewayURL, uc.UserID, url.QueryEscape(requiredGoogleScope)))
	if err != nil {
		return "", fmt.Errorf("get google token failed: %w", err)
	}
	defer resp2.Body.Close()

	if resp2.StatusCode == http.StatusForbidden {
		var scopeErr struct {
			Error    string `json:"error"`
			LoginURL string `json:"login_url"`
		}
		if err := json.NewDecoder(resp2.Body).Decode(&scopeErr); err == nil && scopeErr.Error == "MISSING_SCOPES" && scopeErr.LoginURL != "" {
			return "", &MissingScopesError{LoginURL: scopeErr.LoginURL}
		}
		return "", fmt.Errorf("google token returned 403: forbidden")
	}
	if resp2.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp2.Body)
		return "", fmt.Errorf("google token returned %d: %s", resp2.StatusCode, string(body))
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp2.Body).Decode(&tokenResp); err != nil {
		return "", fmt.Errorf("decode google token response: %w", err)
	}

	return tokenResp.AccessToken, nil
}

// ---------------------------------------------------------------------------
// Google Sheets client
// ---------------------------------------------------------------------------

func createGoogleSheet(googleToken string, expenses []Expense) (string, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	now := time.Now()
	title := fmt.Sprintf("Expense Report — %s", now.Format("2006-01-02"))

	createBody, _ := json.Marshal(map[string]any{
		"properties": map[string]any{"title": title},
		"sheets": []map[string]any{
			{"properties": map[string]any{"title": "Expense Report"}},
		},
	})

	req, _ := http.NewRequest("POST", "https://sheets.googleapis.com/v4/spreadsheets", bytes.NewReader(createBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+googleToken)

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("create spreadsheet failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("create spreadsheet returned %d: %s", resp.StatusCode, string(body))
	}

	var sheet struct {
		SpreadsheetID  string `json:"spreadsheetId"`
		SpreadsheetURL string `json:"spreadsheetUrl"`
		Sheets         []struct {
			Properties struct {
				SheetID int `json:"sheetId"`
			} `json:"properties"`
		} `json:"sheets"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&sheet); err != nil {
		return "", fmt.Errorf("decode spreadsheet response: %w", err)
	}

	// Layout:
	// Row 0: "EXPENSE REPORT" (merged A1:H1, Dibbla green bg)
	// Row 1: "Generated <date> by Dibbla Expense Reporter" (merged, subtle)
	// Row 2: empty spacer
	// Row 3: column headers
	// Row 4+: data rows
	// Last: totals row
	// Last+1: empty
	// Last+2: "Generated by Dibbla · dibbla.com"

	headerRow := 3 // 0-indexed row for column headers
	dataStart := headerRow + 1
	numCols := 8

	rows := [][]any{
		{"EXPENSE REPORT"},
		{fmt.Sprintf("Generated %s by Dibbla Expense Reporter", now.Format("January 2, 2006"))},
		{},
		{"Date", "Vendor", "Category", "Description", "Currency", "Amount", "VAT", "Receipt Ref"},
	}

	for _, e := range expenses {
		amount := ""
		if e.Amount != nil {
			amount = fmt.Sprintf("%.2f", *e.Amount)
		}
		vat := ""
		if e.VAT != nil {
			vat = fmt.Sprintf("%.2f", *e.VAT)
		}
		rows = append(rows, []any{e.Date, e.Vendor, e.Category, e.Description, e.Currency, amount, vat, e.ReceiptRef})
	}

	totalRowIdx := len(rows) // 0-indexed
	if len(expenses) > 0 {
		lastDataRow := dataStart + len(expenses) // 1-indexed
		rows = append(rows, []any{
			"", "", "", "", "TOTAL",
			fmt.Sprintf("=SUM(F%d:F%d)", dataStart+1, lastDataRow),
			fmt.Sprintf("=SUM(G%d:G%d)", dataStart+1, lastDataRow),
			"",
		})
	}

	rows = append(rows, []any{})
	rows = append(rows, []any{"", "", "", "", "", "", "", "dibbla.com"})

	valuesBody, _ := json.Marshal(map[string]any{"values": rows})
	valuesURL := fmt.Sprintf("https://sheets.googleapis.com/v4/spreadsheets/%s/values/'Expense Report'!A1?valueInputOption=USER_ENTERED", sheet.SpreadsheetID)
	req, _ = http.NewRequest("PUT", valuesURL, bytes.NewReader(valuesBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+googleToken)
	resp, err = client.Do(req)
	if err == nil {
		resp.Body.Close()
	}

	sid := 0
	if len(sheet.Sheets) > 0 {
		sid = sheet.Sheets[0].Properties.SheetID
	}

	// Dibbla green: #76b360 → rgb(118/255, 179/255, 96/255) ≈ (0.463, 0.702, 0.376)
	dibblaGreen := map[string]any{"red": 0.463, "green": 0.702, "blue": 0.376}
	dibblaDark := map[string]any{"red": 0.04, "green": 0.04, "blue": 0.04}
	white := map[string]any{"red": 1, "green": 1, "blue": 1}
	lightGray := map[string]any{"red": 0.96, "green": 0.96, "blue": 0.96}
	midGray := map[string]any{"red": 0.85, "green": 0.85, "blue": 0.85}

	requests := []map[string]any{
		// Merge title row
		{"mergeCells": map[string]any{
			"range":     map[string]any{"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": numCols},
			"mergeType": "MERGE_ALL",
		}},
		// Merge subtitle row
		{"mergeCells": map[string]any{
			"range":     map[string]any{"sheetId": sid, "startRowIndex": 1, "endRowIndex": 2, "startColumnIndex": 0, "endColumnIndex": numCols},
			"mergeType": "MERGE_ALL",
		}},
		// Title: Dibbla dark bg, white bold text, large font
		{"repeatCell": map[string]any{
			"range": map[string]any{"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1, "startColumnIndex": 0, "endColumnIndex": numCols},
			"cell": map[string]any{"userEnteredFormat": map[string]any{
				"backgroundColor":     dibblaDark,
				"textFormat":          map[string]any{"bold": true, "fontSize": 16, "foregroundColorStyle": map[string]any{"rgbColor": dibblaGreen}},
				"horizontalAlignment": "LEFT",
				"padding":             map[string]any{"top": 8, "bottom": 8, "left": 12},
			}},
			"fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,padding)",
		}},
		// Subtitle: dark bg, muted text
		{"repeatCell": map[string]any{
			"range": map[string]any{"sheetId": sid, "startRowIndex": 1, "endRowIndex": 2, "startColumnIndex": 0, "endColumnIndex": numCols},
			"cell": map[string]any{"userEnteredFormat": map[string]any{
				"backgroundColor":     dibblaDark,
				"textFormat":          map[string]any{"fontSize": 9, "foregroundColorStyle": map[string]any{"rgbColor": map[string]any{"red": 0.6, "green": 0.6, "blue": 0.6}}},
				"horizontalAlignment": "LEFT",
				"padding":             map[string]any{"left": 12, "bottom": 6},
			}},
			"fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,padding)",
		}},
		// Column headers: Dibbla green bg, dark bold text
		{"repeatCell": map[string]any{
			"range": map[string]any{"sheetId": sid, "startRowIndex": headerRow, "endRowIndex": headerRow + 1, "startColumnIndex": 0, "endColumnIndex": numCols},
			"cell": map[string]any{"userEnteredFormat": map[string]any{
				"backgroundColor":     dibblaGreen,
				"textFormat":          map[string]any{"bold": true, "fontSize": 10, "foregroundColorStyle": map[string]any{"rgbColor": white}},
				"horizontalAlignment": "LEFT",
			}},
			"fields": "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
		}},
		// Right-align Amount and VAT headers
		{"repeatCell": map[string]any{
			"range": map[string]any{"sheetId": sid, "startRowIndex": headerRow, "endRowIndex": headerRow + 1, "startColumnIndex": 5, "endColumnIndex": 7},
			"cell": map[string]any{"userEnteredFormat": map[string]any{
				"horizontalAlignment": "RIGHT",
			}},
			"fields": "userEnteredFormat(horizontalAlignment)",
		}},
	}

	// Alternating row colors for data rows
	for i := range expenses {
		rowIdx := dataStart + i
		if i%2 == 1 {
			requests = append(requests, map[string]any{
				"repeatCell": map[string]any{
					"range": map[string]any{"sheetId": sid, "startRowIndex": rowIdx, "endRowIndex": rowIdx + 1, "startColumnIndex": 0, "endColumnIndex": numCols},
					"cell": map[string]any{"userEnteredFormat": map[string]any{
						"backgroundColor": lightGray,
					}},
					"fields": "userEnteredFormat(backgroundColor)",
				},
			})
		}
	}

	// Right-align Amount and VAT data columns
	if len(expenses) > 0 {
		requests = append(requests, map[string]any{
			"repeatCell": map[string]any{
				"range": map[string]any{"sheetId": sid, "startRowIndex": dataStart, "endRowIndex": dataStart + len(expenses), "startColumnIndex": 5, "endColumnIndex": 7},
				"cell": map[string]any{"userEnteredFormat": map[string]any{
					"horizontalAlignment": "RIGHT",
				}},
				"fields": "userEnteredFormat(horizontalAlignment)",
			},
		})
	}

	// Wrap text in Description column
	if len(expenses) > 0 {
		requests = append(requests, map[string]any{
			"repeatCell": map[string]any{
				"range": map[string]any{"sheetId": sid, "startRowIndex": dataStart, "endRowIndex": dataStart + len(expenses), "startColumnIndex": 3, "endColumnIndex": 4},
				"cell": map[string]any{"userEnteredFormat": map[string]any{
					"wrapStrategy": "WRAP",
				}},
				"fields": "userEnteredFormat(wrapStrategy)",
			},
		})
	}

	// Totals row: top border, bold, light bg
	if len(expenses) > 0 {
		requests = append(requests,
			map[string]any{
				"repeatCell": map[string]any{
					"range": map[string]any{"sheetId": sid, "startRowIndex": totalRowIdx, "endRowIndex": totalRowIdx + 1, "startColumnIndex": 0, "endColumnIndex": numCols},
					"cell": map[string]any{"userEnteredFormat": map[string]any{
						"textFormat":          map[string]any{"bold": true},
						"backgroundColor":     midGray,
						"horizontalAlignment": "RIGHT",
						"borders": map[string]any{
							"top": map[string]any{"style": "SOLID_MEDIUM", "colorStyle": map[string]any{"rgbColor": dibblaDark}},
						},
					}},
					"fields": "userEnteredFormat(textFormat,backgroundColor,horizontalAlignment,borders)",
				},
			},
		)
	}

	// Footer row: small muted text, right-aligned
	footerRow := totalRowIdx + 2
	requests = append(requests, map[string]any{
		"repeatCell": map[string]any{
			"range": map[string]any{"sheetId": sid, "startRowIndex": footerRow, "endRowIndex": footerRow + 1, "startColumnIndex": 7, "endColumnIndex": 8},
			"cell": map[string]any{"userEnteredFormat": map[string]any{
				"textFormat":          map[string]any{"fontSize": 8, "italic": true, "foregroundColorStyle": map[string]any{"rgbColor": map[string]any{"red": 0.5, "green": 0.5, "blue": 0.5}}},
				"horizontalAlignment": "RIGHT",
			}},
			"fields": "userEnteredFormat(textFormat,horizontalAlignment)",
		},
	})

	// Freeze header rows (title + subtitle + spacer + column headers)
	requests = append(requests, map[string]any{
		"updateSheetProperties": map[string]any{
			"properties": map[string]any{
				"sheetId": sid,
				"gridProperties": map[string]any{
					"frozenRowCount": headerRow + 1,
				},
			},
			"fields": "gridProperties.frozenRowCount",
		},
	})

	// Auto-resize columns
	requests = append(requests, map[string]any{
		"autoResizeDimensions": map[string]any{
			"dimensions": map[string]any{"sheetId": sid, "dimension": "COLUMNS"},
		},
	})

	// Set minimum column widths for key columns
	for _, col := range []struct{ idx, px int }{{0, 90}, {1, 150}, {3, 400}} {
		requests = append(requests, map[string]any{
			"updateDimensionProperties": map[string]any{
				"range": map[string]any{
					"sheetId":    sid,
					"dimension":  "COLUMNS",
					"startIndex": col.idx,
					"endIndex":   col.idx + 1,
				},
				"properties": map[string]any{"pixelSize": col.px},
				"fields":     "pixelSize",
			},
		})
	}

	formatBody, _ := json.Marshal(map[string]any{"requests": requests})
	batchURL := fmt.Sprintf("https://sheets.googleapis.com/v4/spreadsheets/%s:batchUpdate", sheet.SpreadsheetID)
	req, _ = http.NewRequest("POST", batchURL, bytes.NewReader(formatBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+googleToken)
	resp, err = client.Do(req)
	if err == nil {
		resp.Body.Close()
	}

	return sheet.SpreadsheetURL, nil
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
// Main
// ---------------------------------------------------------------------------

func main() {
	_ = godotenv.Load()

	store := NewSessionStore()

	gatewayURL := os.Getenv("GATEWAY_URL")
	if gatewayURL == "" {
		gatewayURL = "http://localhost:3456"
	}
	platform := &PlatformClient{
		gatewayURL: strings.TrimRight(gatewayURL, "/"),
		httpClient: &http.Client{Timeout: 5 * time.Minute},
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

	// Check Google scopes — frontend calls this on page load
	app.Get("/api/check-scopes", func(c *fiber.Ctx) error {
		authToken := c.Cookies("auth_token")
		if authToken == "" {
			return c.JSON(fiber.Map{"ok": true}) // no auth token yet, proxy will handle login
		}
		_, tokenErr := platform.GetGoogleToken(authToken)
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
			// Non-scope error (e.g. token validation failed) — don't hide it
			log.Printf("check-scopes: %v", tokenErr)
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

		authToken := c.Cookies("auth_token")
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

		// 2. Execute workflow
		workflowPath := os.Getenv("WORKFLOW_EXEC_PATH")
		if workflowPath == "" {
			workflowPath = "/api/wf/execute/expense-extractor/9tv6xu67"
		}

		expenses, err := platform.ExecuteWorkflow(workflowPath, receiptsText, authToken)
		if err != nil {
			log.Printf("Workflow execution failed: %v", err)
			return c.Status(500).JSON(fiber.Map{"error": "failed to extract expenses from receipts"})
		}

		// 3. Get Google token and create sheet
		googleToken, tokenErr := platform.GetGoogleToken(authToken)
		if tokenErr != nil {
			log.Printf("Failed to get Google token: %v", tokenErr)
			var scopeErr *MissingScopesError
			if errors.As(tokenErr, &scopeErr) {
				loginURL := scopeErr.LoginURL
				if strings.HasPrefix(loginURL, "/") {
					loginURL = platform.gatewayURL + loginURL
				}
				return c.Status(403).JSON(fiber.Map{
					"error":     "Google Sheets permission is required. You will be redirected to grant access.",
					"login_url": loginURL,
				})
			}
			return c.Status(401).JSON(fiber.Map{"error": "failed to get Google authorization — you may need to re-login with Google"})
		}

		sheetURL, err := createGoogleSheet(googleToken, expenses)
		if err != nil {
			log.Printf("Google Sheets creation failed: %v", err)
			return c.Status(500).JSON(fiber.Map{"error": "failed to create Google Sheet", "expenses": expenses})
		}

		return c.JSON(fiber.Map{
			"sheet_url": sheetURL,
			"expenses":  expenses,
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
	for attempt := range 100 {
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
		return app.Listener(ln)
	}
	return fmt.Errorf("no free port found in range %d–%d", p, p+99)
}
