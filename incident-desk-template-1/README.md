# Lumen — Incident Desk Template

An incident desk starter: a **Go Fiber** backend serving an embedded
**React + TypeScript + Tailwind** frontend, backed by **Postgres**. Browse,
filter, and read incidents across a fleet of services. Two AI endpoints
(summarise, triage) and a nightly rollups job are left as clearly-marked stubs —
this template is the starting point for the Dibbla "Build it" tutorial.

## Stack

- **Frontend:** React + TypeScript + Tailwind CSS v4 (built with Vite)
- **Backend:** Go Fiber v2 (serves the embedded frontend + API)
- **Database:** Postgres via `database/sql` + `lib/pq` — schema migrated and
  seeded on boot; runs fine with no database bound (first-run mode)
- **Deployment:** Docker (three-stage build → port 80)

## Project Structure

```
├── frontend/          # Vite + React + TypeScript + Tailwind
│   └── src/
│       ├── pages/     # Incidents, IncidentDetail, Rollups
│       ├── components/# Layout, DibblaLogo, FirstRunBanner
│       └── lib/api.ts # typed fetch client
├── main.go            # Fiber server + port contract + embed dist/
├── db.go              # connection, migrations, seed, queries
├── routes.go          # HTTP handlers under /api
├── ai.go              # AI-gateway client (wired in stages 3–4)
├── docs/index.md      # end-user handbook (ships in the image)
├── REVIEW.md          # pre-deploy guardrails report
├── Dockerfile         # three-stage build → port 80
└── incident-desk.dibbla-task.yaml (repo root) — bootstrap task
```

## The database

The app reads its connection string from `DATABASE_URL_LUMEN_INCIDENTS` (the
variable the Dibbla platform mints for a database named `lumen_incidents`), then
falls back to `DATABASE_URL` / `DB_CONNECTION` for local dev. TLS
(`sslmode=require`) is added automatically when the DSN does not specify it.

On boot, with a database bound, the app runs idempotent
`CREATE TABLE IF NOT EXISTS` migrations for `services`, `incidents`, and
`incident_rollups`, then seeds 8 services and 54 incidents **only if the tables
are empty**. With no database bound, `/api/health` reports `"database":"absent"`
and the UI shows a friendly first-run banner.

## HTTP API

| Method | Path | Behaviour |
|---|---|---|
| GET | `/api/health` | `{"status":"ok","database":"connected"｜"absent"}` |
| GET | `/api/services` | all services |
| GET | `/api/incidents` | filter by `region`, `severity`, `resolved` (true/false); paginated (`limit`, `offset`) |
| GET | `/api/incidents/:id` | one incident (404 if missing) |
| POST | `/api/incidents` | create |
| PATCH | `/api/incidents/:id` | edit / resolve |
| POST | `/api/incidents/:id/summarise` | **501** — stage 3 of the tutorial adds this |
| POST | `/api/incidents/:id/triage` | **501** — stage 4 adds this |
| GET | `/api/rollups` | nightly rollups (empty until stage 5) |

## Run Locally

```bash
cd frontend && npm install && npm run build && cd ..
go run .
```

Set `PORT` to override the default (80):

```bash
PORT=8180 go run .
```

Point it at a local Postgres to see seeded data:

```bash
DATABASE_URL_LUMEN_INCIDENTS=postgres://user:pass@localhost:5432/lumen_incidents?sslmode=disable \
  PORT=8180 go run .
```

## Run with Docker

```bash
docker build -t incident-desk .
docker run -p 80:80 incident-desk
```

## How It Works

1. Vite builds the React frontend into `dist/`.
2. The Go server uses `//go:embed dist/*` to bake the frontend into the binary.
3. Go Fiber serves the SPA at `/` with fallback routing and the API under `/api`.
4. On boot the server connects to Postgres (if bound), migrates, and seeds.
