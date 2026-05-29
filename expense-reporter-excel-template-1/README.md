# Dibbla Expense Reporter Template (Excel / Office365)

An AI-powered expense reporting application using **ASP.NET Core (.NET 8)**, **React**, **TypeScript**, and **Tailwind CSS**. Upload PDF receipts, and Claude (called via the Dibbla AI Gateway) extracts expense data and produces a formatted Microsoft Excel workbook saved to the user's OneDrive.

## Stack

- **Frontend:** React + TypeScript + Tailwind CSS v4 (built with Vite)
- **Backend:** ASP.NET Core Minimal APIs on .NET 8 (serves the built frontend + API)
- **AI:** Claude (via the Dibbla AI Gateway) for receipt parsing
- **Integration:** Microsoft Graph (OneDrive) — workbook built in memory with `ClosedXML` and uploaded as `.xlsx`; PDF text extracted with `PdfPig`
- **Deployment:** Docker (multi-stage build on the .NET ASP.NET runtime image)

## Project Structure

```
├── frontend/          # Vite + React + TypeScript + Tailwind
│   ├── src/
│   │   ├── App.tsx    # Main page component (upload, processing, results)
│   │   ├── main.tsx   # React entry point
│   │   └── index.css  # Tailwind + custom theme
│   ├── index.html
│   └── vite.config.ts
├── Program.cs         # ASP.NET Core app: endpoints, static/SPA serving, port binding
├── PlatformClient.cs  # Dibbla AI Gateway (Claude) + Microsoft token vending
├── ExcelReportBuilder.cs  # ClosedXML workbook + OneDrive (Graph) upload
├── PdfTextExtractor.cs # PdfPig text extraction
├── SessionStore.cs    # In-memory session store + cleanup background service
├── Models.cs          # UploadedFile, Session, Expense
├── ExpenseReporter.csproj
├── Dockerfile         # Multi-stage build → port 80
└── .env               # Environment variables (dev)
```

## Run Locally

```bash
cd frontend && npm install && npm run build && cd ..
dotnet run
```

Set `PORT` to override the default port (80):

```bash
PORT=8080 dotnet run
```

## Run with Docker

```bash
docker build -t expense-reporter-excel-template-1 .
docker run -p 80:80 expense-reporter-excel-template-1
```

## How It Works

1. Users upload PDF receipts via drag-and-drop or file browser.
2. The .NET backend extracts text from each PDF (PdfPig).
3. The backend calls Claude through the Dibbla AI Gateway, which parses the receipt text into structured expense data.
4. The backend builds a formatted `.xlsx` workbook in memory (ClosedXML) and uploads it to the user's OneDrive root via Microsoft Graph.
5. Users can preview expenses in-app and open the generated workbook in Excel Online.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP listen port | `80` |
| `DIBBLA_AI_GATEWAY_URL` | Dibbla AI Gateway base URL (auto-injected on deploy) | `https://ai.dibbla.net` |
| `DIBBLA_ALIAS` | App alias sent as `X-Dibbla-App` for per-app attribution (auto-injected on deploy) | — |
| `GATEWAY_URL` | Dibbla platform gateway (used for the Microsoft OAuth handshake) | `http://localhost:3456` |
| `APP_PUBLIC_URL` | Local-dev only: overrides the Microsoft consent `return_to` so it round-trips back to the running frontend (e.g. `http://localhost:5305`). Leave unset in production — the request host is used. | — |
