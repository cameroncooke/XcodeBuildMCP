# Getting Started

## Prerequisites
- macOS 14.5 or later
- Xcode 16.x or later
- Node.js 18.x or later

## Install options

### Smithery (recommended)
```bash
npx -y @smithery/cli@latest install cameroncooke/xcodebuildmcp --client client-name
```

### One click install
If you are using Cursor or VS Code you can use the quick install links below.

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=XcodeBuildMCP&config=eyJ0eXBlIjoic3RkaW8iLCJjb21tYW5kIjoibnB4IC15IHhjb2RlYnVpbGRtY3BAbGF0ZXN0IiwiZW52Ijp7IklOQ1JFTUVOVEFMX0JVSUxEU19FTkFCTEVEIjoiZmFsc2UiLCJYQ09ERUJVSUxETUNQX1NFTlRSWV9ESVNBQkxFRCI6ImZhbHNlIn19)

[<img src="https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF" alt="Install in VS Code">](https://insiders.vscode.dev/redirect/mcp/install?name=XcodeBuildMCP&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22xcodebuildmcp%40latest%22%5D%7D)

[<img alt="Install in VS Code Insiders" src="https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5">](https://insiders.vscode.dev/redirect/mcp/install?name=XcodeBuildMCP&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22xcodebuildmcp%40latest%22%5D%7D&quality=insiders)

### Manual installation
Most MCP clients use JSON configuration. Add the following to your client configuration under `mcpServers`:

```json
"XcodeBuildMCP": {
  "command": "npx",
  "args": [
    "-y",
    "xcodebuildmcp@latest"
  ]
}
```

## Project config (optional)
For deterministic session defaults and runtime configuration, add a config file at:

```text
<workspace-root>/.xcodebuildmcp/config.yaml
```

See [CONFIGURATION.md](CONFIGURATION.md) for the full schema and examples.

## Client-specific configuration

### OpenAI Codex CLI
Codex uses TOML for MCP configuration. Add this to your Codex CLI config file:

```toml
[mcp_servers.XcodeBuildMCP]
command = "npx"
args = ["-y", "xcodebuildmcp@latest"]
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
claude mcp add XcodeBuildMCP npx xcodebuildmcp@latest

# Or with environment variables
claude mcp add XcodeBuildMCP npx xcodebuildmcp@latest -e XCODEBUILDMCP_SENTRY_DISABLED=false
```

Note: XcodeBuildMCP requests xcodebuild to skip macro validation to avoid Swift Macro build errors.

## Next steps
- Configuration options: [CONFIGURATION.md](CONFIGURATION.md)
- Session defaults and opt-out: [SESSION_DEFAULTS.md](SESSION_DEFAULTS.md)
- Tools reference: [TOOLS.md](TOOLS.md)
- Troubleshooting: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
