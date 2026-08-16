---
Review-status: Ok
One-Sentence-Summary: "No secrets in the build context, and receipts and tokens are handled per-request without being persisted to the image."
---

# Pre-deploy review — Expense Reporter

> This is an **example** review report shipped with the template. Replace it
> with your own findings before deploying — the platform reads it and shows the
> status on the deployments dashboard. See `.claude/skills/dibbla/guardrails.md`.

## 1. Secrets & credentials
- `.env` is excluded from the build context (`.dibblaignore`, `.dockerignore`),
  so a live `DIBBLA_API_TOKEN` cannot reach an image. **Pass.**
- The user's Dibbla token authenticates AI-gateway and Google calls at request
  time and is never written to disk or baked into the image. **Pass.**

## 2. Build & dependencies
- Frontend (`npm run build`) and Go (`go build`) build clean. **Pass.**
- Dependencies pinned in `go.mod`/`go.sum` and `package-lock.json`. **Pass.**

## 3. Runtime safety
- Uploaded PDFs are held in memory per session, not persisted. **Pass.**
- The Google `drive.file` scope is minimal — per-file access only. **Pass.**

**Verdict:** ready to deploy. Update this report to reflect your own changes.
