---
name: dibbla
description: Use the Dibbla CLI to deploy apps, manage applications, databases, and secrets on the Dibbla platform. Use when the user wants to deploy, list/update/delete apps, create/list/delete/dump/restore databases, or manage secrets (global or per-deployment).
---

# Dibbla CLI

The `dibbla` CLI scaffolds projects and manages **applications**, **databases**, and **secrets** on the Dibbla platform. Deployed apps are available at `https://<alias>.dibbla.net`.

## Commands at a glance

| Area    | Commands |
|--------|----------|
| Deploy | `deploy [path]` — deploy from directory |
| Apps   | `apps list`, `apps update <alias>`, `apps delete <alias>` |
| Db     | `db list`, `db create`, `db delete`, `db dump`, `db restore` |
| Secrets| `secrets list`, `secrets set`, `secrets get`, `secrets delete` (global or `-d <alias>`) |

## Pitfalls and tips (lessons learned)

- **API URL:** The Dibbla API must be `https://deploy-api.dibbla.net`. A typo like `depoy-api.dibbla.net` causes deploy to fail with "no such host". If the project uses `.env`, ensure `DIBBLA_API_URL` is correct.
- **Database names:** `dibbla db create <name>` only accepts names matching `^[a-z][a-z0-9_]{0,62}$` (lowercase letters, digits, underscores). Hyphens are **not** allowed — use e.g. `garden_demo` instead of `garden-demo`, or creation fails with "database name must match...".
- **Secrets vs app env:** The platform may store the DB connection as a secret named `DB_CONNECTION` in the form `user:password@host:port`. The app typically expects `DATABASE_URL` as a full Postgres URL: `postgres://user:password@host:port/database_name?sslmode=require`. When writing `.env` or deploy env, convert accordingly (add scheme, path segment for DB name, and `?sslmode=require` for remote hosts).
- **Deploy env vars:** Pass required vars (e.g. `ENV_HELLO_NAME`, `DATABASE_URL`) with `-e "VAR=$VAR"` after sourcing `.env`. For production, consider setting sensitive values as deployment-scoped secrets: `dibbla secrets set DATABASE_URL "..." -d <alias>`.
- **Docker builds on Dibbla:** The remote builder runs `go mod download`; ensure `GOPROXY=https://proxy.golang.org,direct` is set in the Dockerfile if needed. Prefer `go mod download` over vendoring for the image build — vendor can cause "requires go >= X" mismatches if the image uses an older Go version than the vendored modules. Align `go.mod` and the Docker base image (e.g. `golang:1.24-alpine`) with the Go version required by dependencies (e.g. pgx v5.8, golang.org/x/sync). The Dockerfile must copy all Go packages (e.g. `COPY db/ ./db/`) and build with `go build .`, not `go build main.go`, so internal packages are included.

## Additional resources

- **Full command and flag reference:** see [reference.md](reference.md) for usage, arguments, and all flags.
- **Usage examples:** see [examples.md](examples.md) for copy-paste examples and scripting patterns.

When suggesting or generating `dibbla` commands, use the reference for exact syntax and the examples for typical workflows.
