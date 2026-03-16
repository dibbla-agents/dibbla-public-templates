# Dibbla CLI — Examples

Copy-paste examples for common workflows. For full usage and flags see [reference.md](reference.md). For workflow architecture see [workflows.md](workflows.md).

---

## Deploy

```bash
dibbla deploy
dibbla deploy ./my-app
dibbla deploy --alias my-api       # Custom alias instead of directory name
dibbla deploy --force
dibbla deploy -e NODE_ENV=production -e LOG_LEVEL=info
dibbla deploy --cpu 500m --memory 512Mi --port 3000
dibbla deploy ./ --cpu 500m --memory 512Mi -e NODE_ENV=production
```

---

## Apps

```bash
dibbla apps list
dibbla apps update myapp -e NODE_ENV=production
dibbla apps update myapp -e NODE_ENV=production -e LOG_LEVEL=info
dibbla apps update myapp --replicas 3
dibbla apps update myapp --cpu 500m --memory 512Mi --port 3000
dibbla apps update myapp --replicas 2 --cpu 1 --memory 512Mi -e NODE_ENV=production
dibbla apps delete my-old-app
dibbla apps delete my-old-app -y
```

---

## Db

```bash
dibbla db list
dibbla db list -q
dibbla db create my-new-db
dibbla db create --name my-new-db
dibbla db delete my-old-db
dibbla db delete my-old-db --yes
dibbla db delete my-old-db --yes -q
dibbla db dump my-production-db
dibbla db dump my-production-db -o backup.dump
dibbla db restore my-staging-db --file backup.dump
dibbla db restore my-staging-db -f /tmp/backup.dump
```

---

## Secrets

**Global (omit `-d`):**

```bash
dibbla secrets list
dibbla secrets set API_KEY "my-secret-value"
echo "my-secret-value" | dibbla secrets set API_KEY
dibbla secrets get API_KEY
dibbla secrets delete API_KEY --yes
```

**Per-deployment (`-d` or `--deployment`):**

```bash
dibbla secrets list -d myapp
dibbla secrets set API_KEY "x" -d myapp
dibbla secrets set DATABASE_URL "postgres://..." --deployment myapp
cat private.key | dibbla secrets set SSL_KEY -d myapp
dibbla secrets get API_KEY -d myapp
dibbla secrets delete API_KEY -d myapp -y
```

---

## Workflows

### List, inspect, manage

```bash
# List and inspect
dibbla workflows list
dibbla workflows list -o json
dibbla wf list                        # alias

# Get a workflow definition (YAML by default)
dibbla workflows get my-workflow
dibbla workflows get my-workflow -o json
dibbla workflows get my-workflow --revision abc123

# Create, update, validate
dibbla workflows validate -f workflow.yaml        # always validate first
dibbla workflows create -f workflow.yaml
dibbla workflows update my-workflow -f workflow.yaml

# Delete
dibbla workflows delete my-workflow
dibbla workflows delete my-workflow --yes

# Execute
dibbla workflows execute my-workflow
dibbla workflows execute my-workflow --data '{"query": "hello"}'
dibbla workflows execute my-workflow -f input.json
dibbla workflows execute my-workflow --node api_node_1

# URL and API docs
dibbla workflows url my-workflow
dibbla workflows api-docs my-workflow
dibbla workflows api-docs my-workflow -o json
```

### Create a simple agent workflow from a YAML file

Save this as `my-agent.yaml`:

```yaml
name: my_agent
label: My Agent
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
      system_message: "You are a helpful assistant. Answer questions clearly and concisely."
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

Then create it:

```bash
dibbla workflows validate -f my-agent.yaml
dibbla workflows create -f my-agent.yaml
dibbla workflows execute my_agent --data '{"question": "What is Kubernetes?"}'
```

### Create an agent with tools (weather example)

Save as `weather-agent.yaml`:

```yaml
name: my_weather_agent
label: Weather Agent
description: An AI agent that answers weather questions

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
      system_message: >
        You are a weather assistant. Use the get_weather tool to look up
        current conditions for any location. Include temperature and description.
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

### Create an agent with HTTP API tool (web search)

Save as `search-agent.yaml`:

```yaml
name: my_search_agent
label: Search Agent
description: An agent that searches the web via Tavily

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
        You have a tool called http_call. To search the web via Tavily:
        - url: https://api.tavily.com/search
        - method: POST
        - headers: {"Content-Type": "application/json", "Authorization": "Bearer YOUR_KEY"}
        - body: {"query": "<search query>", "max_results": 5}
        Summarize findings clearly and cite sources.
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

### Create a multi-agent pipeline

Save as `pipeline.yaml`:

```yaml
name: parse_and_analyze
label: Parse and Analyze
description: Parses raw data then provides analysis

nodes:
  - id: api_input
    type: api
    inputs: [raw_data]
    outputs: [raw_data]

  - id: parser
    type: function
    function: reasoning_agent_function
    server: function-server
    inputs:
      model: gpt-4o-mini
      system_message: "Parse the input into structured YAML. Return only the YAML."
      prompt_message: null
    outputs: [response]

  - id: analyst
    type: function
    function: reasoning_agent_function
    server: function-server
    inputs:
      model: claude-sonnet-4-6
      system_message: "Analyze the structured data and provide insights with recommendations."
      prompt_message: null
    outputs: [response]

  - id: api_response
    type: api_response
    inputs: [analysis]
    linked_to: api_input

edges:
  - api_input.raw_data -> parser.prompt_message
  - parser.response -> analyst.prompt_message
  - analyst.response -> api_response.analysis
```

### Create a workflow with handlebars template prompt

Save as `template-agent.yaml`:

```yaml
name: templated_agent
label: Templated Agent
description: Agent with dynamic prompt built from a handlebars template

nodes:
  - id: api_input
    type: api
    inputs: [text, language]
    outputs: [text, language]

  - id: prompt_builder
    type: function
    function: handlebars_template
    server: function-server
    inputs:
      language: null
      script: |
        You are a translator. Translate the user's input to {{this.language}}.
        Rules:
        - Return ONLY the translated text
        - Preserve formatting and placeholders
    outputs: [output]

  - id: agent
    type: function
    function: reasoning_agent_function
    server: function-server
    inputs:
      model: claude-haiku-4-5
      system_message: null
      prompt_message: null
    outputs: [response]

  - id: api_response
    type: api_response
    inputs: [response]
    linked_to: api_input

edges:
  - api_input.language -> prompt_builder.language
  - prompt_builder.output -> agent.system_message
  - api_input.text -> agent.prompt_message
  - agent.response -> api_response.response
```

---

## Nodes

```bash
# Add a node from a file
dibbla nodes add my-workflow -f node.yaml

# Add a node inline (JSON)
dibbla nodes add my-workflow --inline '{"id":"my_tool","type":"function","function":"get_weather_function","server":"function-server","inputs":{"query":null,"search_query":null},"outputs":["temperature","weather_description","location_name","country","administrations","error"]}'

# Remove a node
dibbla nodes remove my-workflow my_tool
dibbla nodes remove my-workflow my_tool --yes
```

---

## Edges

```bash
# Wire an API input to an agent
dibbla edges add my-workflow "api_input.question -> agent.prompt_message"

# Wire agent output to API response
dibbla edges add my-workflow "agent.response -> api_response.response"

# Wire a template output to agent system message
dibbla edges add my-workflow "prompt_builder.output -> agent.system_message"

# Remove an edge
dibbla edges remove my-workflow "api_input.question -> agent.prompt_message"

# List all edges
dibbla edges list my-workflow
dibbla edges list my-workflow -o json
```

---

## Inputs

```bash
# Set agent model
dibbla inputs set my-workflow agent model claude-sonnet-4-6

# Set system message
dibbla inputs set my-workflow agent system_message "You are a helpful assistant."

# Set handlebars template script
dibbla inputs set my-workflow prompt_builder script "Translate to {{this.language}}: {{this.text}}"

# Set a static value on an input node
dibbla inputs set my-workflow static_node text "my constant value"

# Clear a value (set to null, meaning it will be wired via edge)
dibbla inputs set my-workflow agent prompt_message ignored --null
```

---

## Tools

```bash
# Add a tool to an agent node
dibbla tools add my-workflow agent get_weather_function
dibbla tools add my-workflow agent call_http_api

# Remove a tool
dibbla tools remove my-workflow agent get_weather_function
```

---

## Revisions

```bash
# List revisions
dibbla revisions list my-workflow
dibbla rev list my-workflow           # alias
dibbla revisions list my-workflow -o json

# Create a snapshot before making changes
dibbla revisions create my-workflow
dibbla revisions create my-workflow -q   # prints only the revision ID

# Restore
dibbla revisions restore my-workflow abc123
```

---

## Functions

```bash
# List all available functions
dibbla functions list
dibbla fn list                        # alias
dibbla functions list --server function-server
dibbla functions list --tag accepts_tools
dibbla functions list -o json

# Get function details
dibbla functions get function-server reasoning_agent_function
dibbla functions get function-server handlebars_template
dibbla functions get function-server call_http_api -o json
```

---

## Scripting tips

- Use `-y` / `--yes` to skip confirmations: `apps delete`, `db delete`, `secrets delete`, `workflows delete`, `nodes remove`.
- Use `-q` / `--quiet` on `db list`, `db delete`, and workflow commands for minimal output.
- Use `-o json` on workflow commands for machine-readable output.
- Pipe `secrets get` into env or other commands; use `db list -q` for name-only loops.
- `revisions create -q` prints only the revision ID for scripting.

```bash
# Save a revision and capture the ID
REV=$(dibbla revisions create my-workflow -q)
echo "Created revision: $REV"

# Export a secret
export API_KEY=$(dibbla secrets get API_KEY -d myapp)

# Loop over databases
for db in $(dibbla db list -q); do echo "$db"; done

# Validate before deploying a workflow
dibbla workflows validate -f workflow.yaml && dibbla workflows create -f workflow.yaml

# Full workflow creation pipeline
dibbla workflows validate -f agent.yaml && \
  dibbla workflows create -f agent.yaml && \
  dibbla workflows execute my_agent --data '{"question": "test"}'
```
