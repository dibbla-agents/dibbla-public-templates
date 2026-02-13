# Dibbla Getting Started Template — Hello World

A minimal Hello World application template using **Go Fiber**, **React**, **TypeScript**, and **Tailwind CSS**. The Vite-built frontend is embedded into a single Go binary, making it easy to deploy anywhere.

## Stack

- **Frontend:** React + TypeScript + Tailwind CSS v4 (built with Vite)
- **Backend:** Go Fiber v2 (serves the embedded frontend + API)
- **Deployment:** Docker (single-stage Alpine image, ~25MB)

## Project Structure

```
├── frontend/          # Vite + React + TypeScript + Tailwind
│   ├── src/
│   │   ├── App.tsx    # Main page component
│   │   ├── main.tsx   # React entry point
│   │   └── index.css  # Tailwind + custom theme
│   ├── index.html
│   └── vite.config.ts
├── main.go            # Go Fiber server (embeds dist/)
├── Dockerfile         # Multi-stage build → port 80
└── .gitignore
```

## Run Locally

```bash
cd frontend && npm install && npm run build && cd ..
go run main.go
```

Set `PORT` to override the default port (80):

```bash
PORT=3000 go run main.go
```

## Run with Docker

```bash
docker build -t getting-started-1 .
docker run -p 80:80 getting-started-1
```

## How It Works

1. Vite builds the React frontend into `dist/`.
2. The Go server uses `//go:embed dist/*` to bake the frontend assets into the binary.
3. Go Fiber serves the static files at `/` with SPA fallback routing.
4. A sample API endpoint is available at `GET /api/hello`.
