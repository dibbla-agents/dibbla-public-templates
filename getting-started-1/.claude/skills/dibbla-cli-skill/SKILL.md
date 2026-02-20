---
name: dibbla-cli-skill
description: Expert guidance for using the Dibbla CLI to scaffold projects and manage applications, databases, and secrets.
---

# Dibbla CLI Skill
You are an expert in the dibbla command-line tool, designed to interface with the Dibbla platform for cloud-native worker management.

## When to use

- Use this skill when you need to scaffold a new Go-based worker project.
- This skill is helpful for managing cloud resources like Apps, Databases, and Secrets on the Dibbla platform.
- Use this when automating deployments or database maintenance tasks via the CLI.

## Instructions

- **Self-Documentation:** If you are ever unsure about the latest flags, command structures, or specific API behaviors, run `dibbla --skill-prompt`. This command outputs the most up-to-date documentation directly from the binary.

Authentication & Prerequisites
- API Token: Most operations require a `DIBBLA_API_TOKEN`
- Environment: Check for the token in environment variables or a `.env` file.
- Guidance: If missing, direct the user to `https://app.dibbla.com/settings/api-tokens` to generate one.

Scaffolding Projects
- Use `dibbla create go-worker [name]` to start a project.
- Workflow: Be prepared to handle interactive prompts for Hosting Type (Cloud vs. Self-hosted), gRPC/TLS settings, and Frontend inclusion.

Resource Management
- Apps: Use `dibbla apps list` and `dibbla apps delete <alias>`.
- Databases: - Support for `list`, `create`, `delete`, `dump`, and `restore`.
    - Use `--quiet` or `-q` for scripting to ensure clean output.
    - restore requires the `--file` or `-f` flag.
- Secrets: - Secrets can be Global or Scoped (using `--deployment <alias>`).
    - `dibbla secrets set` can accept values from `stdin` or as an argument.

Deployment
- Deploy the current directory or a specific path using `dibbla deploy [path]` (no need for the `--yes` flag for this command).
- Use `--force` to overwrite existing deployments with the same alias.
- If the app uses `.env` look at that file and pass them to the deploy command using `--env VAR=val --env VAR2=val2`
- Look which port the app exposes in the Dockerfile. If it's any other than port 80 use the `--port portno` flag to change it
- To update/edit a deployment you can use the `dibbla update` command. Check `dibbla --skill-prompt` for full documentation

Best Practices
- Scripting: Always include the `--yes` or `-y` flag in scripts to bypass confirmation prompts.
- Output: When the user needs a list for a script, prioritize the `--quiet` flag to remove headers and status messages.
- Verification: Always verify that Go is installed before attempting to run `create go-worker`.
- Clarification: If the user provides an ambiguous deployment path or database name, use the "ask questions" tool to clarify before executing destructive commands (like `delete`).