Set up a fresh Dibbla "crm" project in this directory and
deploy it so the user can access it in their browser.

IMPORTANT — environment constraints:
- There is NO desktop browser in this environment. Steps that try to
  open a browser (xdg-open, open) will fail — that is expected, ignore it.
- Inbound network connections are blocked by the firewall. Dev servers
  (npm run dev, go run) are NOT accessible from the user's browser.
  The only way to serve the app to the user is via `dibbla deploy`.
- Dev servers are still useful for curl-based API testing from inside
  this environment, but not for visual/UI testing.

Auth is already configured: DIBBLA_API_URL and DIBBLA_API_TOKEN are in
./.env. Since dibbla CLI v1.2.4 reads .env from CWD automatically, no
separate `dibbla login` step is needed — don't attempt to log in.

Do these steps in order. Don't skip step 2 and don't guess at later
steps before reading the skill.

1. Install the dibbla CLI.
     curl -fsSL https://install.dibbla.com/install.sh | sh
   Then ensure ~/.local/bin is on PATH for this shell:
     export PATH="$HOME/.local/bin:$PATH"
   Verify:
     dibbla --version
   (must be >= v1.2.4)

2. Install the dibbla skill into this project BEFORE doing anything else.
   This is important: the skill teaches you how the CLI's template, run,
   and deploy commands work, which flags they accept, and how bootstrap
   yamls behave. Without the skill, you will use outdated patterns.
     dibbla skills install dibbla
   After this completes, re-read the skill files it dropped (under
   .claude/skills/dibbla/ or the equivalent for your agent) before step 3.

3. Install the crm template.
   Using what the skill tells you, install the "crm" template
   into this directory. The bootstrap yaml lives at:
     https://github.com/dibbla-agents/dibbla-public-templates/blob/master/crm.dibbla-task.yaml

   Expect the open-browser step to fail — that's normal in this
   environment. The template pipeline will still start the backend and
   frontend dev servers; they're useful for curl verification but not
   for user-facing access.

   After the pipeline finishes, verify the backend responds:
     curl -s http://localhost:8150 || echo "backend not reachable"

4. Write the pre-deploy gate artefacts, THEN deploy.
   `dibbla deploy` refuses to upload unless BOTH of these exist at the deploy
   root, so write them first (do NOT use --skip-review). See the skill files
   .claude/skills/dibbla/guardrails.md and .claude/skills/dibbla/user-docs.md.

   a. REVIEW.md — run the guardrails checklist from the skill and write the
      report to REVIEW.md (the template ships an example; replace it with your
      real findings).
   b. docs/index.md — the end-user handbook, with a valid `subtitle:`
      frontmatter (one sentence, ≤140 bytes, no placeholder text). The template
      ships an example; rewrite it for this app.

   Then deploy from the template subdirectory (crm-template-1/):
     dibbla deploy
   This packages and deploys the app to dibbla.com. On success it
   prints a URL (https://<alias>.dibbla.com) — report this URL back
   to the user.

   If the default alias is already taken, append incrementing numbers
   until you find a free one:
     dibbla deploy --alias crm1
     dibbla deploy --alias crm2
   and so on.

   For subsequent changes, use:
     dibbla deploy --update

5. Update CLAUDE.md with environment notes.
   Create or append to CLAUDE.md in the project root with these notes
   so that future sessions know the constraints:

   - No browser available — `xdg-open` / `open` will fail, ignore it
   - Firewall blocks inbound connections — dev servers (npm run dev,
     go run) are NOT accessible from the user's browser
   - To show UI changes to the user, rebuild and run:
       dibbla deploy --update
   - curl against localhost is fine for API/backend testing
   - Deployed URL: <the URL from step 4>

Report back: the deploy URL, whether the deployed app is reachable,
and a one-line summary of what the frontend shows. If any step fails,
stop and report the error instead of continuing.
