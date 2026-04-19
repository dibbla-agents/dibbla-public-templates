Set up a fresh Dibbla "presentation" project in this directory and open
the frontend in a preview browser when it's running.

Auth is already configured: DIBBLA_API_URL and DIBBLA_API_TOKEN are in
./.env. Since dibbla CLI v1.2.4 reads .env from CWD automatically, no
separate `dibbla login` step is needed — don't attempt to log in.

Do these steps in order. Don't skip step 2 and don't guess at later steps
before reading the skill.

1. Install the dibbla CLI.
     curl -fsSL https://install.dibbla.com/install.sh | sh
   Then ensure ~/.local/bin is on PATH for this shell:
     export PATH="$HOME/.local/bin:$PATH"
   Verify:
     dibbla --version
   (must be >= v1.2.4)

2. Install the dibbla skill into this project BEFORE doing anything else.
   This is important: the skill teaches you how the CLI's template and run
   commands work, which flags they accept, and how bootstrap yamls behave.
   Without the skill, you will use outdated patterns.
     dibbla skills install dibbla
   After this completes, re-read the skill files it dropped (under
   .claude/skills/dibbla/ or the equivalent for your agent) before step 3.

3. Install the presentation template.
   Using what the skill tells you, install the "presentation" template
   into this directory. The bootstrap yaml lives at:
     https://github.com/dibbla-agents/dibbla-public-templates/blob/master/presentation.dibbla-task.yaml
   The contents of that yaml and its cloned subdirectory
   (dibbla-public-templates/presentation-template-1/) are authoritative
   for what steps will run, what ports are used, and what files land
   where — consult the yaml when in doubt.

   Expected end state after the template pipeline completes:
   - A `presentation-template-1/` subdirectory with a Vite frontend
   - Vite dev server running on port 5335 (VITE_PORT)
   - Running as a background process started by the pipeline

   Note: 5335 is the *preferred* port declared in the yaml. The
   steprunner may allocate an alternative if that port is in use. After
   the pipeline finishes, read its output (or run `lsof -i :5335`)
   to confirm the actual port.

4. Open the frontend in a preview browser.
   Point the preview at http://localhost:<VITE_PORT> (default 5335).
   If the pipeline already opened a browser window, that's fine — verify
   the page loads and shows the slide deck.

Report back: the actual port used, whether the server is reachable,
and a one-line summary of what the frontend shows. If any step fails,
stop and report the error instead of continuing.
