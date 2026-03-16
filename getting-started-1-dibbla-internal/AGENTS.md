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

## Workflow architecture

Workflows are directed graphs of **nodes** connected by **edges**. When a workflow has `api` + `api_response` nodes, it gets an HTTP API at `POST https://workflow-server.dibbla.net/api/execute/<name>/<id>`.

### Node types

| Type | Purpose | Key fields |
|------|---------|------------|
| `api` | HTTP entry point | `inputs` (list of API field names), `outputs` (same names) |
| `api_response` | HTTP return point | `inputs` (list of response fields), `linked_to` (the `api` node's id) |
| `function` | Processing node | `function`, `server`, `inputs` (key-value map), `outputs` (list), optionally `tools` (list of tool node IDs) and `label` |

### Agent functions (function-server)

| Function | When to use |
|----------|-------------|
| `reasoning_agent_function` | Default choice. Basic agent: system_message + prompt_message + model. Supports tools. |
| `reasoning_agent_with_thread` | Need conversation memory across calls (adds thread_id). |
| `reasoning_agent_with_toolbox` | Memory + dynamic tool resolution by name (adds thread_id + toolbox_tools). |
| `structured_output_agent` | Need typed JSON fields beyond just `response` (adds structured_output JSON Schema). |
| `reasoning_with_messages` | Takes a full chat_messages array instead of system+prompt. |
| `simple_openai_agent` | Fine-grained OpenAI control (temperature, max_tokens, top_p, penalties). |
| All `_no_cache` variants | Same as base but skip response caching (for live/fresh data). |

### Utility functions (function-server)

| Function | Purpose |
|----------|---------|
| `handlebars_template` | Build dynamic prompts via `{{this.var}}` templates from multiple inputs. |
| `call_http_api` | Make HTTP requests (url, method, headers, body → output). Use as agent tool. |
| `input` | Pass-through: holds a static text value. |
| `static_output` | Always returns a fixed value regardless of input. |
| `divider` | Splits text at a divider string into above/below. |
| `todays_date` | Returns current date and time. |
| `get_weather_function` | Weather lookup by location name. |

### Supported models

- **Claude:** claude-haiku-4-5, claude-sonnet-4-0/4-5/4-6, claude-opus-4-0/4-1/4-5/4-6
- **Gemini:** gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash, gemini-2.5-flash, gemini-2.5-pro
- **OpenAI:** gpt-4o, gpt-4o-mini, gpt-4.1/mini/nano, gpt-4.5-preview, gpt-5/mini/nano, gpt-5.1/codex, o1/mini, o3/mini/pro, o4-mini

### Edge format

```
source_node_id.output_port -> target_node_id.input_port
```

Nested outputs: `node.output.subfield -> target.input`. Array fields: `node.items[] -> target.items[]`.

### How tools work

1. Declare the tool as a separate `function` node in the workflow.
2. List the tool node's **id** in the agent node's `tools` array.
3. The agent autonomously decides when to call the tool during execution.

### Quick-start: minimal workflow YAML

```yaml
name: my_agent
label: My Agent
description: Answers questions

nodes:
  - id: api_input
    type: api
    inputs: [question]
    outputs: [question]

  - id: agent
    type: function
    function: reasoning_agent_function
    server: function-server
    inputs:
      model: claude-sonnet-4-6
      system_message: "You are a helpful assistant."
      prompt_message: null
    outputs: [response]

  - id: api_response
    type: api_response
    inputs: [response]
    linked_to: api_input

edges:
  - api_input.question -> agent.prompt_message
  - agent.response -> api_response.response
```

Create it: `dibbla workflows validate -f agent.yaml && dibbla workflows create -f agent.yaml`

### Adding tools to a workflow YAML

Add the tool function as a node, then reference its node ID in the agent's `tools`:

```yaml
  - id: agent
    type: function
    function: reasoning_agent_function
    server: function-server
    inputs:
      model: claude-sonnet-4-6
      system_message: "Use the weather tool when asked about weather."
      prompt_message: null
    outputs: [response]
    tools:
      - weather_tool       # references the node id below

  - id: weather_tool
    type: function
    function: get_weather_function
    server: function-server
    inputs:
      query: null
      search_query: null
    outputs: [temperature, weather_description, location_name, country, administrations, error]
```

### Using handlebars templates for dynamic prompts

```yaml
  - id: prompt_builder
    type: function
    function: handlebars_template
    server: function-server
    inputs:
      language: null
      context: null
      script: |
        Translate the input to {{this.language}}.
        Glossary: {{this.context}}
    outputs: [output]
```

Wire: `api_input.language -> prompt_builder.language`, `prompt_builder.output -> agent.system_message`.

### Using HTTP calls as agent tools

```yaml
  - id: http_tool
    type: function
    function: call_http_api
    server: function-server
    inputs: { url: null, method: null, headers: null, body: null }
    outputs: [output]
```

Then add `http_tool` to the agent's `tools` list and instruct the agent in its system_message how to call specific APIs (URL, method, headers, body format).

---

## Scripting

- Use `-y` / `--yes` for non-interactive: `apps delete`, `db delete`, `secrets delete`, `workflows delete`, `nodes remove`
- Use `-q` for minimal output; `-o json` for machine-readable workflow output
- Pipe: `dibbla secrets get NAME [-d alias]`; loop: `dibbla db list -q`

---

## Full reference and examples

- **Syntax and flags:** [.claude/skills/dibbla/reference.md](.claude/skills/dibbla/reference.md)
- **Copy-paste examples:** [.claude/skills/dibbla/examples.md](.claude/skills/dibbla/examples.md)
- **Workflow architecture & patterns:** [.claude/skills/dibbla/workflows.md](.claude/skills/dibbla/workflows.md)

When suggesting or generating `dibbla` commands, use the reference for exact syntax, the examples for typical patterns, and the workflows guide for building or modifying workflow definitions.
