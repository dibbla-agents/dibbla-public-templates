---
Review-status: Ok
One-Sentence-Summary: "No secrets in the build context and the app builds and serves cleanly."
---

# Pre-deploy review — Getting Started (Hello World)

> This is an **example** review report shipped with the template. Replace it
> with your own findings before deploying — the platform reads it and shows the
> status on the deployments dashboard. See `.claude/skills/dibbla/guardrails.md`.

## 1. Secrets & credentials
- `.env` is excluded from the build context (`.dibblaignore`, `.dockerignore`),
  so a live `DIBBLA_API_TOKEN` cannot reach an image. **Pass.**
- No hard-coded secrets. **Pass.**

## 2. Build & dependencies
- Frontend (`npm run build`) and Go (`go build`) build clean. **Pass.**
- Dependencies pinned in `go.mod`/`go.sum` and `package-lock.json`. **Pass.**

## 3. Runtime safety
- `ENV_HELLO_NAME` is required and validated on boot with a clear error. **Pass.**

**Verdict:** ready to deploy. Update this report to reflect your own changes.
