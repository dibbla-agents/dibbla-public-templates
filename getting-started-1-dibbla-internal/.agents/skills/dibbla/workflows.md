# Dibbla Workflows — Architecture & authoring guide

Workflows are directed graphs of **nodes** connected by **edges**. Each workflow gets an HTTP API endpoint when it contains `api` + `api_response` node pairs.

Endpoint format: `POST https://workflow-server.dibbla.net/api/execute/<name>/<id>`

---

## Node types

Every workflow is built from three node types:

### 1. `api` — HTTP entry point

Defines the fields the workflow accepts via its API.

```yaml
- id: api_input
  type: api
  inputs:
    - question          # each item becomes a field in the POST body
  outputs:
    - question          # same names, forwarded downstream via edges
```

### 2. `api_response` — HTTP return point

Defines the fields returned to the caller. Must reference its paired `api` node via `linked_to`.

```yaml
- id: api_response
  type: api_response
  inputs:
    - response          # fields that will appear in the JSON response
  linked_to: api_input  # must point to the api node's id
```

### 3. `function` — processing node

Executes a function from a function server. This is where all computation happens.

```yaml
- id: my_agent                          # unique node id within the workflow
  type: function
  function: reasoning_agent_function    # function name (from functions list)
  server: function-server               # which server hosts the function
  label: My Agent                       # optional human-friendly label
  inputs:
    model: claude-sonnet-4-6            # static values set directly
    system_message: "You are helpful."
    prompt_message: null                # null = will be wired via an edge
  outputs:
    - response                          # outputs available for downstream edges
  tools:                                # optional: list of tool node IDs
    - get_weather_function
```

**Key rules for function nodes:**
- `inputs` is a key-value map. Set static values directly; use `null` for values wired via edges.
- `outputs` is a list of output port names the function produces.
- `tools` is an optional list of node IDs (not function names) that the agent can call as tools. The tool nodes must also exist as separate `function` nodes in the workflow.
- `server` is typically `function-server` for built-in functions, but custom servers exist (e.g. `darktide-automations-worker`, `gridly-localizations-worker`).

---

## Edges — wiring nodes together

Edges connect one node's output to another node's input. Format:

```
source_node_id.output_port -> target_node_id.input_port
```

Examples:
```yaml
edges:
  - api_input.question -> reasoning_agent_function.prompt_message
  - reasoning_agent_function.response -> api_response.response
```

For nested outputs, use dot notation:
```yaml
  - some_node.output.callstack -> template_node.callstack
```

For array fields, use `[]` suffix:
```yaml
  - source_node.items[] -> target_node.items[]
```

**Edge rules:**
- An edge target port overrides any static value set in the node's `inputs`.
- Multiple edges can feed into different input ports of the same node.
- Multiple edges can feed into the same `api_response` input (last-to-execute wins).

---

## Function catalog (function-server)

These are the built-in functions available on `function-server`. Use `dibbla functions list` to see all, including custom servers.

### Agent functions (accepts_tools: true)

| Function | Inputs | Use when |
|----------|--------|----------|
| `reasoning_agent_function` | system_message, prompt_message, model | Basic agent, no memory. Most common choice. |
| `reasoning_agent_with_thread` | + thread_id | Need conversation memory across calls. |
| `reasoning_agent_with_toolbox` | + thread_id, toolbox_tools | Memory + dynamic tool resolution by name. |
| `reasoning_agent_with_thread_no_cache` | Same as with_thread | Same but skips response caching. |
| `reasoning_agent_with_toolbox_no_cache` | Same as with_toolbox | Same but skips response caching. |
| `structured_output_agent` | + structured_output (JSON Schema) | Need typed fields beyond just `response`. |
| `structured_output_agent_no_cache` | Same | Same but skips caching. |
| `reasoning_with_messages` | chat_messages, model | Takes a full chat history array instead of system+prompt. |
| `simple_openai_agent` | system_message, prompt, temperature, max_tokens, top_p, frequency_penalty, presence_penalty | Fine-grained OpenAI control. |
| `generic_agent_function` | system_message, prompt_message, model | Older generic agent. |
| `mcp_anthropic_agent` | mcp config, system_message, prompt_message | Anthropic agent with MCP server config. |

**All agent functions that accept tools:** Declare tool function node IDs in the `tools:` list on the agent node. The tool's function node must exist separately in the workflow.

### Utility functions

| Function | Inputs → Outputs | Purpose |
|----------|-----------------|---------|
| `handlebars_template` | script + any named inputs → output | Build dynamic prompts from templates. Script uses `{{this.field_name}}` syntax. Extremely useful for assembling multi-source prompts. |
| `call_http_api` | url, method, headers, body → output | Make HTTP requests. Used as a tool for agents that need web access. |
| `input` | text → output | Pass-through. Holds a static value or relays data. |
| `static_output` | input (ignored), static_output → output | Always returns the static_output value. |
| `divider` | text, divider → above, below | Splits text at first occurrence of divider string. |
| `todays_date` | Triggered (bool) → date, epoch | Returns current date/time. |
| `get_weather_function` | query/search_query → temperature, weather_description, location_name, country, administrations, error | Weather lookup via Open-Meteo. |

### Supported models

From the `enum:model` tags on agent functions:

- **Claude:** claude-haiku-4-5, claude-sonnet-4-0, claude-sonnet-4-5, claude-sonnet-4-6, claude-opus-4-0, claude-opus-4-1, claude-opus-4-5, claude-opus-4-6
- **Gemini:** gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash, gemini-2.5-flash, gemini-2.5-pro
- **OpenAI:** gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, gpt-4.5-preview, gpt-5, gpt-5-mini, gpt-5-nano, gpt-5.1, gpt-5.1-codex, o1, o1-mini, o3, o3-mini, o3-pro, o4-mini

---

## Common workflow patterns

### Pattern 1: Simple agent (most common)

A single agent receives user input and returns a response. 3 nodes, 2 edges.

```yaml
name: my_simple_agent
label: My Simple Agent
description: A simple agent that answers questions

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

### Pattern 2: Agent with tools

The agent can autonomously call tool functions. Add the tool as a separate function node and list its node ID in the agent's `tools`.

```yaml
name: weather_agent
label: Weather Agent
description: An AI agent that answers weather questions using a weather tool

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
      model: gpt-4o-mini
      system_message: >
        You are a helpful weather assistant. When the user asks about weather,
        use the get_weather tool to look up current conditions. Always include
        the temperature and a brief description.
      prompt_message: null
    outputs: [response]
    tools:
      - weather_tool

  - id: weather_tool
    type: function
    function: get_weather_function
    server: function-server
    inputs:
      query: null
      search_query: null
    outputs: [temperature, weather_description, location_name, country, administrations, error]

  - id: api_response
    type: api_response
    inputs: [response]
    linked_to: api_input

edges:
  - api_input.question -> agent.prompt_message
  - agent.response -> api_response.response
```

### Pattern 3: Agent with HTTP tool (web search, API calls)

Use `call_http_api` as a tool. Instruct the agent in its system_message how to use the HTTP tool with specific URLs/headers.

```yaml
name: web_search_agent
label: Web Search Agent
description: An agent that searches the web using Tavily

nodes:
  - id: api_input
    type: api
    inputs: [question]
    outputs: [question]

  - id: agent
    type: function
    function: reasoning_agent_with_toolbox
    server: function-server
    inputs:
      model: claude-sonnet-4-6
      system_message: |
        You are a research assistant with web search access.
        You have a tool called http_call. Use it to search via Tavily:
        - url: https://api.tavily.com/search
        - method: POST
        - headers: {"Content-Type": "application/json", "Authorization": "Bearer <KEY>"}
        - body: {"query": "<search query>", "max_results": 5}
        Summarize findings and cite sources.
      prompt_message: null
      thread_id: search-session
      toolbox_tools[]: '[]'
    outputs: [response, error]
    tools:
      - http_tool

  - id: http_tool
    type: function
    function: call_http_api
    server: function-server
    inputs:
      url: null
      method: null
      headers: null
      body: null
    outputs: [output]

  - id: api_response
    type: api_response
    inputs: [response]
    linked_to: api_input

edges:
  - api_input.question -> agent.prompt_message
  - agent.response -> api_response.response
```

### Pattern 4: Template-assembled prompts (handlebars)

Use `handlebars_template` to build a dynamic system_message from multiple inputs before passing it to an agent. The template uses `{{this.field_name}}` for interpolation and `{{#each items}}...{{/each}}` for loops.

```yaml
name: localized_agent
label: Localized Agent
description: Agent with dynamic system prompt from template

nodes:
  - id: api_input
    type: api
    inputs: [input, language, context]
    outputs: [input, language, context]

  - id: prompt_builder
    type: function
    function: handlebars_template
    server: function-server
    inputs:
      language: null
      context: null
      script: |
        You are a translator. Translate the input to {{this.language}}.
        Use this glossary for reference:
        {{this.context}}
        Return ONLY the translated text.
    outputs: [output]

  - id: agent
    type: function
    function: reasoning_agent_function
    server: function-server
    inputs:
      model: gemini-2.5-pro
      system_message: null
      prompt_message: null
    outputs: [response]

  - id: api_response
    type: api_response
    inputs: [response]
    linked_to: api_input

edges:
  - api_input.language -> prompt_builder.language
  - api_input.context -> prompt_builder.context
  - prompt_builder.output -> agent.system_message
  - api_input.input -> agent.prompt_message
  - agent.response -> api_response.response
```

### Pattern 5: Multi-agent pipeline (chaining)

Chain multiple agents where one agent's output feeds the next. Useful for breaking complex tasks into stages (parse → analyze → summarize).

```yaml
name: analyze_and_summarize
label: Analyze and Summarize
description: First parses raw data, then analyzes it

nodes:
  - id: api_input
    type: api
    inputs: [raw_data]
    outputs: [raw_data]

  - id: parser_agent
    type: function
    function: reasoning_agent_function
    server: function-server
    inputs:
      model: gpt-4o-mini
      system_message: "Parse the raw data into structured YAML. Return YAML only."
      prompt_message: null
    outputs: [response]

  - id: analyst_agent
    type: function
    function: reasoning_agent_function
    server: function-server
    inputs:
      model: claude-sonnet-4-6
      system_message: "You are a data analyst. Given structured data, provide insights and recommendations."
      prompt_message: null
    outputs: [response]

  - id: api_response
    type: api_response
    inputs: [summary]
    linked_to: api_input

edges:
  - api_input.raw_data -> parser_agent.prompt_message
  - parser_agent.response -> analyst_agent.prompt_message
  - analyst_agent.response -> api_response.summary
```

### Pattern 6: Agent with conversation memory

Use `reasoning_agent_with_thread` or `reasoning_agent_with_toolbox` with a `thread_id` to maintain context across multiple calls to the same workflow.

```yaml
  - id: agent
    type: function
    function: reasoning_agent_with_thread
    server: function-server
    inputs:
      model: claude-sonnet-4-6
      system_message: "You are a helpful assistant."
      prompt_message: null
      thread_id: my-session-1         # same thread_id = shared memory
    outputs: [response]
```

### Pattern 7: Structured output

Use `structured_output_agent` with a `structured_output` JSON Schema to get typed fields beyond just `response`.

```yaml
  - id: agent
    type: function
    function: structured_output_agent
    server: function-server
    inputs:
      model: claude-sonnet-4-6
      system_message: "Classify the sentiment of the input."
      prompt_message: null
      structured_output: '{"type":"object","properties":{"sentiment":{"type":"string","enum":["positive","negative","neutral"]},"confidence":{"type":"number"}},"required":["sentiment","confidence"]}'
    outputs: [response, sentiment, confidence]
```

The `structured_output` input is a JSON Schema string. Output keys matching the schema properties appear as separate output ports alongside `response`.

---

## Workflow definition file format

When creating or updating workflows via `dibbla workflows create -f file.yaml` or `dibbla workflows update <name> -f file.yaml`, the YAML file should follow this structure:

```yaml
name: my_workflow                # required: unique identifier (lowercase, underscores)
label: My Workflow               # optional: human-friendly display name
description: What this does      # optional: shown in workflow list

nodes:
  - id: ...                      # list of node objects (see node types above)
    type: ...
    ...

edges:
  - source.port -> target.port   # list of edge strings
```

**Validate before creating:** Always run `dibbla workflows validate -f file.yaml` before `create` or `update`.

---

## Incremental editing (CLI)

Instead of rewriting the whole YAML, use targeted commands:

```bash
# Add a node
dibbla nodes add my_workflow -f node.yaml
dibbla nodes add my_workflow --inline '{"id":"my_node","type":"function","function":"input","server":"function-server","inputs":{"text":"hello"},"outputs":["output"]}'

# Wire it up
dibbla edges add my_workflow "my_node.output -> agent.prompt_message"

# Set an input value
dibbla inputs set my_workflow agent model claude-sonnet-4-6
dibbla inputs set my_workflow agent system_message "You are helpful."

# Add/remove tools
dibbla tools add my_workflow agent get_weather_function
dibbla tools remove my_workflow agent get_weather_function

# Remove a node
dibbla nodes remove my_workflow my_node --yes

# Snapshot before changes
dibbla revisions create my_workflow
```

---

## Tips

- **Choosing a function:** Use `reasoning_agent_function` for most cases. Add `_with_thread` when you need memory, `_with_toolbox` when you also need dynamic tool resolution, `structured_output_agent` when you need typed JSON output.
- **No-cache variants:** Use `_no_cache` variants when responses must be fresh every time (e.g., news search, live data).
- **Handlebars templates:** Perfect for assembling prompts from multiple inputs. Use `{{this.var}}` for simple interpolation, `{{#each array}}{{this}}{{/each}}` for iteration.
- **Static values:** Use the `input` function to hold constants or the `static_output` function to always return a fixed value.
- **Tool wiring:** The agent calls tools by their function name. The tool node must exist in the workflow, and its node ID must appear in the agent's `tools` list.
- **API field naming:** The `api` node's `inputs` list determines the POST body field names. The `api_response` node's `inputs` list determines the response field names. These can be different from internal port names — edges handle the mapping.
- **Revisions:** Always create a revision before making significant changes. Use `dibbla revisions create <wf> -q` to get just the ID for scripting.
