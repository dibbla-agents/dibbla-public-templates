# Dibbla platform — Agent guide

Use the **Dibbla CLI** (`dibbla`) to deploy apps, manage applications, databases, secrets, and workflows. Deployed apps are at `https://<alias>.dibbla.app`.

**When to use:** User wants to deploy, list/update/delete apps; create/list/delete/dump/restore databases; manage secrets (global or per-deployment); or manage workflows (create, execute, validate, nodes, edges, inputs, tools, revisions, browse functions).

---

## Commands summary

### Deploy
- `dibbla deploy [path]` — deploy from directory (default `.`)
- Flags: `--alias` / `-a`, `--force` / `-f`, `--env` / `-e` KEY=value (repeatable), `--cpu`, `--memory`, `--port`

### Apps
- `dibbla apps list` — list deployments (ALIAS, URL, STATUS, LAST DEPLOYED)
- `dibbla apps update <alias>` — update env, replicas, cpu, memory, port (at least one flag required)
- `dibbla apps delete <alias>` — optional `--yes` / `-y`

### Database (db)
- `dibbla db list` — optional `-q` for names only
- `dibbla db create [name]` or `--name <name>`
- `dibbla db delete <name>` — optional `--yes`, `-q`
- `dibbla db dump <name> [-o file]` — default `<name>.dump`
- `dibbla db restore <name> --file <path>` / `-f <path>`

### Secrets
- Scope: omit `-d` for **global**; `-d <alias>` / `--deployment <alias>` for **per-deployment**
- `dibbla secrets list [-d alias]`
- `dibbla secrets set <name> [value] [-d alias]` — value from stdin if omitted
- `dibbla secrets get <name> [-d alias]` — value only (pipeline-friendly)
- `dibbla secrets delete <name> [-d alias]` — optional `--yes`

### Workflows (alias: `wf`)
- Common flags: `-o` (yaml|json|table), `-q`, `-v`
- `dibbla workflows list` | `get <name>` | `create -f <file>` | `update <name> -f <file>` | `delete <name>` | `validate -f <file>`
- `dibbla workflows execute <name>` — optional `--data '{}'`, `-f <json>`, `--node <id>`
- `dibbla workflows url <name>` | `dibbla workflows api-docs <name>` — optional `--revision`

### Nodes
- `dibbla nodes add <workflow>` — requires `--file <path>` or `--inline '<json>'`
- `dibbla nodes remove <workflow> <node_id>` — optional `--yes`

### Edges
- `dibbla edges add <workflow> "<src.port -> tgt.port>"`
- `dibbla edges remove <workflow> "<edge>"`
- `dibbla edges list <workflow>`

### Inputs & tools
- `dibbla inputs set <workflow> <node> <input> <value>` — optional `--null`
- `dibbla tools add <workflow> <agent> <tool>` | `dibbla tools remove <workflow> <agent> <tool>`

### Revisions (alias: `rev`)
- `dibbla revisions list <workflow>` | `create <workflow>` | `restore <workflow> <revision_id>`
- `revisions create -q` — prints only revision ID (scripting)

### Functions (alias: `fn`)
- `dibbla functions list` — optional `--server`, `--tag`
- `dibbla functions get <server> <name>`

---

## Scripting

- Use `-y` / `--yes` for non-interactive: `apps delete`, `db delete`, `secrets delete`, `workflows delete`, `nodes remove`
- Use `-q` for minimal output; `-o json` for machine-readable workflow output
- Pipe: `dibbla secrets get NAME [-d alias]`; loop: `dibbla db list -q`

---

## Full reference and examples

- **Syntax and flags:** [.claude/skills/dibbla/reference.md](.claude/skills/dibbla/reference.md)
- **Copy-paste examples:** [.claude/skills/dibbla/examples.md](.claude/skills/dibbla/examples.md)

When suggesting or generating `dibbla` commands, use the reference for exact syntax and the examples for typical workflows.
