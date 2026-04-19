Set up a fresh Dibbla "expense-reporter" project in this directory and open
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

3. Install the expense-reporter template.
   Using what the skill tells you, install the "expense-reporter" template
   into this directory. The bootstrap yaml lives at:
     https://github.com/dibbla-agents/dibbla-public-templates/blob/master/expense-reporter.dibbla-task.yaml
   The contents of that yaml and its cloned subdirectory
   (dibbla-public-templates/expense-reporter-template-1/) are authoritative
   for what steps will run, what ports are used, and what files land
   where — consult the yaml when in doubt.

   Expected end state after the template pipeline completes:
   - An `expense-reporter-template-1/` subdirectory with Go backend + Vite frontend
   - Go backend running on port 8210 (PORT)
   - Vite dev server running on port 5305 (VITE_PORT)
   - Both running as background processes started by the pipeline

   Note: 8210 and 5305 are the *preferred* ports declared in the yaml. The
   steprunner may allocate alternatives if those ports are in use. After
   the pipeline finishes, read its output (or run `lsof -i :8210 -i :5305`)
   to confirm the actual ports.

4. Open the frontend in a preview browser.
   Point the preview at http://localhost:<VITE_PORT> (default 5305).
   If the pipeline already opened a browser window, that's fine — verify
   the page loads and shows the expense reporter interface.

Report back: the actual ports used, whether both servers are reachable,
and a one-line summary of what the frontend shows. If any step fails,
stop and report the error instead of continuing.
