# Getting Started

## Prerequisites
- macOS 14.5 or later
- Xcode 16.x or later
- Node.js 18.x or later

## Choose Your Interface

XcodeBuildMCP provides a unified CLI with two modes:

| Command | Use Case |
|---------|----------|
| `xcodebuildmcp mcp` | Start MCP server for AI-assisted development |
| `xcodebuildmcp <tool>` | Direct terminal usage, scripts, CI pipelines |

Both share the same tools and configuration.

## MCP Server Installation

Most MCP clients use JSON configuration. Add the following server entry to your client's MCP config:

```json
"XcodeBuildMCP": {
  "command": "npx",
  "args": [
    "-y",
    "xcodebuildmcp@latest",
    "mcp"
  ]
}
```

## CLI Installation

```bash
# Install globally
npm install -g xcodebuildmcp

# Verify installation
xcodebuildmcp --version

# List available tools
xcodebuildmcp tools
```

See [CLI.md](CLI.md) for full CLI documentation.

## Project config (optional)
For deterministic session defaults and runtime configuration, add a config file at:

```text
<workspace-root>/.xcodebuildmcp/config.yaml
```

See [CONFIGURATION.md](CONFIGURATION.md) for the full schema and examples.

## Client-specific configuration

### OpenAI Codex CLI
Codex uses TOML for MCP configuration. Add this to `~/.codex/config.toml`:

```toml
[mcp_servers.XcodeBuildMCP]
command = "npx"
args = ["-y", "xcodebuildmcp@latest", "mcp"]
env = { "XCODEBUILDMCP_SENTRY_DISABLED" = "false" }
```

If you see tool calls timing out (for example, `timed out awaiting tools/call after 60s`), increase the timeout:

```toml
tool_timeout_sec = 600
```

For more info see the OpenAI Codex configuration docs:
https://github.com/openai/codex/blob/main/docs/config.md#connecting-to-mcp-servers

### Claude Code CLI
```bash
# Add XcodeBuildMCP server to Claude Code
claude mcp add XcodeBuildMCP -- npx -y xcodebuildmcp@latest mcp

# Or with environment variables
claude mcp add XcodeBuildMCP -e XCODEBUILDMCP_SENTRY_DISABLED=false -- npx -y xcodebuildmcp@latest mcp
```

Note: XcodeBuildMCP requests xcodebuild to skip macro validation to avoid Swift Macro build errors.

## Next steps
- Configuration options: [CONFIGURATION.md](CONFIGURATION.md)
- Session defaults and opt-out: [SESSION_DEFAULTS.md](SESSION_DEFAULTS.md)
- Tools reference: [TOOLS.md](TOOLS.md)
- CLI guide: [CLI.md](CLI.md)
- Troubleshooting: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
