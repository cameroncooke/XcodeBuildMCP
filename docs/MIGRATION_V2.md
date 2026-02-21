# Migrating to XcodeBuildMCP v2.0.0

This guide covers breaking changes and required actions when upgrading from v1.x to v2.0.0.

## Quick migration

There are two breaking changes. Most users only need to do step 1.

**1. Append `mcp` to your server launch command.**

The `xcodebuildmcp` binary is now a CLI. To start the MCP server you must pass the `mcp` subcommand. Without it the MCP client will fail to connect.

```
# v1.x
npx -y xcodebuildmcp@latest

# v2.0.0
npx -y xcodebuildmcp@latest mcp
```

If you installed via a CLI command, remove and re-add:

```bash
# Claude Code
claude mcp remove XcodeBuildMCP
claude mcp add XcodeBuildMCP -- npx -y xcodebuildmcp@latest mcp

# Codex CLI
codex mcp remove XcodeBuildMCP
codex mcp add XcodeBuildMCP -- npx -y xcodebuildmcp@latest mcp
```

If you manage a configuration file directly, add `"mcp"` as the last entry in the `args` array. See [section 1](#1-mcp-server-launch-requires-the-mcp-subcommand) for file locations and examples.

**2. Check your workflow configuration (if needed).**

v2.0.0 defaults to loading only the `simulator` workflow instead of all workflows. If you already set `enabledWorkflows` or `XCODEBUILDMCP_ENABLED_WORKFLOWS`, nothing changes for you.

If you relied on the previous default and need additional workflows, add them to `.xcodebuildmcp/config.yaml`:

```yaml
schemaVersion: 1
enabledWorkflows:
  - simulator
  - ui-automation
  - debugging
```

See [section 2](#2-default-workflows-changed) for the rationale and full list of available workflows.

---

# Detailed reference

## 1. MCP server launch requires the `mcp` subcommand

The `xcodebuildmcp` binary is now a CLI first. To start the MCP server, you must pass the `mcp` subcommand at the end of the launch command. Without it, the binary enters CLI mode and the MCP client will fail to connect.

Wherever your v1.x setup invoked `xcodebuildmcp` (or `npx -y xcodebuildmcp@latest`), append `mcp` so the final token of the command is `mcp`.

### Option A: Remove and re-add via CLI

If you originally installed using a CLI command (e.g. `claude mcp add`, `codex mcp add`), remove the existing entry and re-add with the updated command.

**Claude Code:**

```bash
claude mcp remove XcodeBuildMCP
claude mcp add XcodeBuildMCP -- npx -y xcodebuildmcp@latest mcp
```

**Codex CLI:**

```bash
codex mcp remove XcodeBuildMCP
codex mcp add XcodeBuildMCP -- npx -y xcodebuildmcp@latest mcp
```

### Option B: Edit the configuration file directly

If you manage MCP servers through a configuration file, open it and add `"mcp"` as the last entry in the `args` array.

Common file locations:

| Client | Configuration file |
|--------|--------------------|
| Claude Code | `~/.claude.json` |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Cursor (project) | `.cursor/mcp.json` |
| Cursor (global) | `~/.cursor/mcp.json` |
| VS Code (project) | `.vscode/mcp.json` |
| VS Code (global) | `~/Library/Application Support/Code/User/mcp.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |
| Trae | `~/Library/Application Support/Trae/User/mcp.json` |
| Codex CLI | `~/.codex/config.toml` |

JSON example:

```json
"XcodeBuildMCP": {
  "command": "npx",
  "args": ["-y", "xcodebuildmcp@latest", "mcp"]
}
```

TOML example (Codex CLI):

```toml
[mcp_servers.XcodeBuildMCP]
command = "npx"
args = ["-y", "xcodebuildmcp@latest", "mcp"]
```

For the full set of client-specific examples, see the [README](../README.md#installation).

---

## 2. Default workflows changed

### Why this changed

In v1.x, all workflows loaded by default, exposing 70+ tools. Every tool definition and its schema is sent to the LLM on each turn, consuming context window space throughout the session. While most LLM providers cache these tokens to reduce re-inference cost, they still occupy context that could otherwise be used for your code and conversation.

v2.0.0 defaults to loading only the **`simulator` workflow** (21 tools). Simulator development is the most common use case, so this covers the majority of users while keeping the token footprint small.

Other workflows -- `ui-automation`, `debugging`, `device`, `macos`, and more -- are now opt-in. This gives you direct control over the trade-off between tool breadth and token cost. Enable only what you need, when you need it.

### Who is affected

- **Already set** `enabledWorkflows` or `XCODEBUILDMCP_ENABLED_WORKFLOWS`? Nothing changes.
- **Relied on the default** (all workflows)? You will now only see simulator tools until you opt in to additional workflows.

### How to enable additional workflows

#### Config file (recommended)

Create or update `.xcodebuildmcp/config.yaml` in your workspace root:

```yaml
schemaVersion: 1
enabledWorkflows:
  - simulator
  - device
  - macos
  - ui-automation
  - debugging
  - swift-package
```

#### Environment variable

Set `XCODEBUILDMCP_ENABLED_WORKFLOWS` in your MCP client configuration:

```json
"XcodeBuildMCP": {
  "command": "npx",
  "args": ["-y", "xcodebuildmcp@latest", "mcp"],
  "env": {
    "XCODEBUILDMCP_ENABLED_WORKFLOWS": "simulator,device,macos,ui-automation,debugging,swift-package"
  }
}
```

### Available workflows

| Workflow ID | Description |
|-------------|-------------|
| `simulator` | iOS simulator build, run, test, screenshots, logs (default) |
| `device` | Physical device build, deploy, test, logs |
| `macos` | macOS build, run, test |
| `swift-package` | Swift Package Manager build, test, run |
| `ui-automation` | Tap, swipe, text input, UI hierarchy inspection |
| `debugging` | LLDB attach, breakpoints, variable inspection |
| `logging` | Simulator and device log capture |
| `simulator-management` | Boot, list, open simulators |
| `utilities` | Clean build products |
| `project-discovery` | Discover projects and workspaces |
| `project-scaffolding` | Create new projects from templates |
| `session-management` | Session defaults management |
| `doctor` | Diagnostic tool (requires debug mode) |
| `workflow-discovery` | Runtime workflow management (experimental) |
| `xcode-ide` | Xcode IDE MCP bridge proxy (Xcode 26.3+) |

For full details on configuration options see [CONFIGURATION.md](CONFIGURATION.md). For session defaults (project, scheme, simulator, etc.) see [SESSION_DEFAULTS.md](SESSION_DEFAULTS.md).

---

## 3. CLI and skills

### xcodebuildmcp is now a CLI

The `xcodebuildmcp` command can now be used directly in the terminal without an MCP client:

```bash
# Install globally
npm install -g xcodebuildmcp@latest

# List available tools
xcodebuildmcp tools

# Build and run on simulator
xcodebuildmcp simulator build-and-run --scheme MyApp --project-path ./MyApp.xcodeproj

# Take a screenshot
xcodebuildmcp simulator screenshot

# Tap a button
xcodebuildmcp ui-automation tap --label "Submit"
```

See [CLI.md](CLI.md) for full documentation.

### MCP vs CLI for coding agents

**The MCP server is the recommended way to use XcodeBuildMCP with coding agents and will yield the best results.** The CLI is provided as an alternative and for scripting/CI use cases.

Why MCP is preferred:

- **Automatic tool discovery** -- tools are registered with the agent at session start, so the agent always knows what is available and how to call it.
- **Session defaults** -- the MCP server maintains stateful defaults (project path, scheme, simulator, etc.) across tool calls, so the agent does not have to recall and re-supply project details on every invocation. This significantly reduces errors.
- **Stateful operations** -- log capture, debugging sessions, and other long-running operations are fully managed by the server.

The CLI avoids the per-turn context cost of MCP tool definitions since the agent invokes commands directly with no tool schemas to transmit. However, this comes with trade-offs: session defaults are not available in CLI mode, so the agent must pass all parameters explicitly on every call. Agents also tend to consume significant tokens repeatedly calling `--help` to re-discover commands and arguments. The CLI skill helps reduce this discovery overhead, but in practice MCP tools are almost always used more reliably by agents.

### Agent skills (optional)

v2.0.0 introduces optional skill files that prime your coding agent with usage instructions:

- **CLI Skill** -- strongly recommended when using the CLI with a coding agent.
- **MCP Skill** -- optional when using the MCP server; gives the agent better context on available tools.

Install via the built-in CLI command:

```bash
xcodebuildmcp init
```

Or run it via npx without a global install:

```bash
npx -y xcodebuildmcp@latest init
```

See [SKILLS.md](SKILLS.md) for more details.

---

## 4. New project-level configuration file

v2.0.0 adds support for a YAML config file at `.xcodebuildmcp/config.yaml`. This replaces the need for environment variables and provides deterministic, repo-scoped behavior. Environment variables still work but the config file takes precedence.

See [CONFIGURATION.md](CONFIGURATION.md) for the full reference.
