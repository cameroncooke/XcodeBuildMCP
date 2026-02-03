# XcodeBuildMCP Skill

XcodeBuildMCP now includes two optional agent skills:

- **MPC Skill**: Primes the agent with instructions on how to use the MCP server's tools (optional when using the MCP server).

- **CLI Skill**: Primes the agent with instructions on how to navigate the CLI (recommended when using the CLI).

## Easiest way to install

Install via the interactive installer and follow the on-screen instructions.

```bash
curl -fsSL https://raw.githubusercontent.com/cameroncooke/XcodeBuildMCP/main/scripts/install-skill.sh -o install-skill.sh && bash install-skill.sh
```

## Automated installation

Useful for CI/CD pipelines or for agentic installation. `--skill` should be set to either `mcp` or `cli` to install the appropriate skill.

### Install (Claude Code)

```bash
curl -fsSL https://raw.githubusercontent.com/cameroncooke/XcodeBuildMCP/main/scripts/install-skill.sh -o install-skill.sh && bash install-skill.sh --claude --remove-conflict --skill <mcp|cli>
```

### Install (Cursor)

```bash
curl -fsSL https://raw.githubusercontent.com/cameroncooke/XcodeBuildMCP/main/scripts/install-skill.sh -o install-skill.sh && bash install-skill.sh --cursor --remove-conflict --skill <mcp|cli>
```

### Install (Codex CLI)

```bash
curl -fsSL https://raw.githubusercontent.com/cameroncooke/XcodeBuildMCP/main/scripts/install-skill.sh -o install-skill.sh && bash install-skill.sh --codex --remove-conflict --skill <mcp|cli>
```

### Install (Other Clients)

For other clients if you know the path to the skills directory you can pass the `--dest` flag.

```bash
curl -fsSL https://raw.githubusercontent.com/cameroncooke/XcodeBuildMCP/main/scripts/install-skill.sh -o install-skill.sh && bash install-skill.sh --dest /path/to/skills --remove-conflict --skill <mcp|cli>
```

## Unsupporting Clients

Some MCP clients that do not yet support skills. Use the skill content as a concise, static instruction prompt:

1. Open `skills/xcodebuildmcp[-cli]/SKILL.md`.
2. Copy the body (everything below the YAML frontmatter).
3. Paste it into the client’s global or project-level instructions/rules area.

## Skills

To learn more about skills see: [https://agentskills.io/home](https://agentskills.io/home).