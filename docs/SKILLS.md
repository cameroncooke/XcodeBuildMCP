# XcodeBuildMCP Skill

This repository bundles a minimal skill that summarizes XcodeBuildMCP workflows and tools to help steer clients to use MCP tools, this is espeically important for clients that progressively load or hide MCP tools behind search interfaces (i.e. Cursor, Claude Code).

## Install (Claude Code)

```bash
curl -fsSL https://raw.githubusercontent.com/cameroncooke/XcodeBuildMCP/main/scripts/install-skill.sh | bash -s -- --claude
```

## Install (Cursor)

```bash
curl -fsSL https://raw.githubusercontent.com/cameroncooke/XcodeBuildMCP/main/scripts/install-skill.sh | bash -s -- --cursor
```

## Install (Codex CLI)

```bash
curl -fsSL https://raw.githubusercontent.com/cameroncooke/XcodeBuildMCP/main/scripts/install-skill.sh | bash -s -- --codex
```

## Install (Other Clients)

Some MCP clients do not yet support skills. Use the skill content as a concise, static instruction block:

1. Open `skills/xcodebuildmcp/SKILL.md`.
2. Copy the body (everything below the YAML frontmatter).
3. Paste it into the client’s global or project-level instructions/rules area.

## Skills

To learn more about skills see: [https://agentskills.io/home](https://agentskills.io/home).