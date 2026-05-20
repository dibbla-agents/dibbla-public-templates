# Dibbla Expense Reporter Template

An AI-powered expense reporting application using **Go Fiber**, **React**, **TypeScript**, and **Tailwind CSS**. Upload PDF receipts, and Claude (called via the Dibbla AI Gateway) extracts expense data and generates a formatted Google Sheet.

## Stack

- **Frontend:** React + TypeScript + Tailwind CSS v4 (built with Vite)
- **Backend:** Go Fiber v2 (serves the embedded frontend + API)
- **AI:** Claude (via the Dibbla AI Gateway) for receipt parsing
- **Integration:** Google Sheets API for report generation
- **Deployment:** Docker (single-stage Alpine image, ~25MB)

## Project Structure

```
├── frontend/          # Vite + React + TypeScript + Tailwind
│   ├── src/
│   │   ├── App.tsx    # Main page component (upload, processing, results)
│   │   ├── main.tsx   # React entry point
│   │   └── index.css  # Tailwind + custom theme
│   ├── index.html
│   └── vite.config.ts
├── main.go            # Go Fiber server (PDF extraction, AI Gateway call, Sheets API)
├── Dockerfile         # Multi-stage build → port 80
└── .env               # Environment variables
```

## Run Locally

```bash
cd frontend && npm install && npm run build && cd ..
go run main.go
```

Set `PORT` to override the default port (80):

```bash
PORT=8080 go run main.go
```

## Run with Docker

```bash
docker build -t expense-reporter-template-1 .
docker run -p 80:80 expense-reporter-template-1
```

## How It Works

1. Users upload PDF receipts via drag-and-drop or file browser.
2. The Go backend extracts text from each PDF.
3. The backend calls Claude through the Dibbla AI Gateway, which parses the receipt text into structured expense data.
4. The backend creates a formatted Google Sheet with the extracted expenses.
5. Users can preview expenses in-app and open the generated spreadsheet.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP listen port | `80` |
| `DIBBLA_AI_GATEWAY_URL` | Dibbla AI Gateway base URL (auto-injected on deploy) | `https://ai.dibbla.net` |
| `DIBBLA_ALIAS` | App alias sent as `X-Dibbla-App` for per-app attribution (auto-injected on deploy) | — |
| `GATEWAY_URL` | Dibbla platform gateway (used for the Google OAuth handshake) | `http://localhost:3456` |
