---
Review-status: Ok
One-Sentence-Summary: "No secrets in the build context, the build is reproducible, and the app degrades gracefully with no database bound."
---

# Pre-deploy review — Lumen (Incident Desk)

> This is an **example** review report shipped with the template. Replace it
> with your own findings before you deploy your version — the platform reads it
> and shows the status on the deployments dashboard. See
> `.claude/skills/dibbla/guardrails.md` for the full checklist.

## 1. Secrets & credentials

- `.env` is excluded from the build context by `.dibblaignore` and `.dockerignore`,
  so a live `DIBBLA_API_TOKEN` cannot reach an image. **Pass.**
- No API keys, tokens, or connection strings are hard-coded. The database URL is
  read from the environment (`DATABASE_URL_LUMEN_INCIDENTS` with generic
  fallbacks). **Pass.**

## 2. Build & dependencies

- Frontend (`tsc -b && vite build`) and Go (`go build ./...`, `go vet ./...`)
  build clean. **Pass.**
- Dependencies are pinned in `go.mod`/`go.sum` and `package-lock.json`. **Pass.**

## 3. Runtime safety

- With no database bound, `/api/health` reports `"database":"absent"` and the UI
  renders a friendly first-run banner instead of an error. **Pass.**
- Schema migrations are idempotent (`CREATE TABLE IF NOT EXISTS`) and seeding
  only runs against empty tables, so a restart never duplicates data. **Pass.**

## 4. Exposure

- Only `/api/*` and the embedded SPA are served. The two AI endpoints return
  HTTP 501 until the tutorial wires them, so no half-built integration is live.
  **Pass.**

**Verdict:** ready to deploy. Update this report to reflect your own changes.
