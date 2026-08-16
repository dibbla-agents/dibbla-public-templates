---
subtitle: Track incidents across your services and see what is still open.
---

# Lumen — Incident Desk

Lumen is a lightweight incident desk. It shows every incident across your
service fleet, lets you filter and read them, and — once the tutorial adds it —
summarises and triages them for you.

> This handbook is an **example** shipped with the template. Rewrite it for your
> own app before you deploy. It is the only documentation your end users see.

## What you can do

- **Browse incidents.** The home screen lists every incident. Filter by region,
  severity, and status to narrow things down.
- **Read an incident.** Click any incident to see its full description, when it
  was opened, and which region it affects.
- **Check rollups.** The Rollups page shows nightly per-region summaries once the
  nightly job has run.

## First run

When you first open Lumen without a database attached, you will see a banner
saying the app is live but has no data yet. That is expected. Attach a Postgres
database and Lumen fills itself with a demo fleet of services and incidents so
you have something to explore right away.

## Coming soon

The **Summarise** and **Triage** buttons on an incident are not switched on yet.
Later steps of the "Build it" tutorial connect them to an AI assistant that
writes a short summary of an incident and suggests how urgent it is.

## Getting help

If something looks wrong, reopen the app from your **My Apps** page. If the
incident list is empty, check that a database is attached — the header in the
sidebar shows whether one is connected.
