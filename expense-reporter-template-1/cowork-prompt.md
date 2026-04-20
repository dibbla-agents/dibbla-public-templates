Set up a fresh Dibbla "expense-reporter" project in this directory and
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

1. Install the dibbla CLI by downloading the latest release binary
   directly from GitHub. (install.dibbla.com is not in the default
   Cowork allowlist, so don't use the install.sh one-liner here —
   fetch the binary from the GitHub releases page instead.)

     # Detect platform
     OS=$(uname -s | tr '[:upper:]' '[:lower:]')
     ARCH=$(uname -m)
     case "$ARCH" in
       x86_64)          ARCH=amd64 ;;
       aarch64|arm64)   ARCH=arm64 ;;
     esac

     # Look up the latest release tag
     VERSION=$(curl -fsSL https://api.github.com/repos/dibbla-agents/dibbla-cli/releases/latest \
       | sed -n 's/.*"tag_name": *"v\([^"]*\)".*/\1/p')

     # Download and extract the binary into ~/.local/bin
     mkdir -p "$HOME/.local/bin"
     curl -fsSL "https://github.com/dibbla-agents/dibbla-cli/releases/download/v${VERSION}/dibbla_${VERSION}_${OS}_${ARCH}.tar.gz" \
       | tar -xzf - -C "$HOME/.local/bin" dibbla
     chmod +x "$HOME/.local/bin/dibbla"

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

3. Install the expense-reporter template.
   Using what the skill tells you, install the "expense-reporter" template
   into this directory. The bootstrap yaml lives at:
     https://github.com/dibbla-agents/dibbla-public-templates/blob/master/expense-reporter.dibbla-task.yaml

   Expect the open-browser step to fail — that's normal in this
   environment. The template pipeline will still start the backend and
   frontend dev servers; they're useful for curl verification but not
   for user-facing access.

   After the pipeline finishes, verify the backend responds:
     curl -s http://localhost:8210 || echo "backend not reachable"

4. Deploy the application.
   Run from the template subdirectory (expense-reporter-template-1/):
     dibbla deploy
   This packages and deploys the app to dibbla.com. On success it
   prints a URL (https://<alias>.dibbla.com) — report this URL back
   to the user.

   If the default alias is already taken, append incrementing numbers
   until you find a free one:
     dibbla deploy --alias expense-reporter1
     dibbla deploy --alias expense-reporter2
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
