<img src="banner.png" alt="XcodeBuild MCP" width="600"/>

A Model Context Protocol (MCP) server that provides Xcode-related tools for integration with AI assistants and other MCP clients.

[![CI](https://github.com/cameroncooke/XcodeBuildMCP/actions/workflows/ci.yml/badge.svg)](https://github.com/cameroncooke/XcodeBuildMCP/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/xcodebuildmcp.svg)](https://badge.fury.io/js/xcodebuildmcp) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Node.js](https://img.shields.io/badge/node->=18.x-brightgreen.svg)](https://nodejs.org/) [![Xcode 16](https://img.shields.io/badge/Xcode-16-blue.svg)](https://developer.apple.com/xcode/) [![macOS](https://img.shields.io/badge/platform-macOS-lightgrey.svg)](https://www.apple.com/macos/) [![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io/) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/cameroncooke/XcodeBuildMCP)

## Installation

Add XcodeBuildMCP to your MCP client configuration. Most clients use JSON configuration with the following server entry:

```json
"XcodeBuildMCP": {
  "command": "npx",
  "args": ["-y", "xcodebuildmcp@latest"]
}
```

<details>
  <summary>Cursor</summary>
  <br />

  Add to `~/.cursor/mcp.json`:
  ```json
  {
    "mcpServers": {
      "XcodeBuildMCP": {
        "command": "npx",
        "args": ["-y", "xcodebuildmcp@latest"]
      }
    }
  }
  ```

  Or use the quick install link:

  [![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=XcodeBuildMCP&config=eyJ0eXBlIjoic3RkaW8iLCJjb21tYW5kIjoibnB4IC15IHhjb2RlYnVpbGRtY3BAbGF0ZXN0IiwiZW52Ijp7IklOQ1JFTUVOVEFMX0JVSUxEU19FTkFCTEVEIjoiZmFsc2UiLCJYQ09ERUJVSUxETUNQX1NFTlRSWV9ESVNBQkxFRCI6ImZhbHNlIn19)
  <br />
</details>

<details>
  <summary>Claude Code</summary>
  <br />

  Run:
  ```bash
  claude mcp add XcodeBuildMCP -- npx -y xcodebuildmcp@latest
  ```
  <br />
</details>

<details>
  <summary>Codex CLI</summary>
  <br />

  Add to `~/.codex/config.toml`:
  ```toml
  [mcp_servers.XcodeBuildMCP]
  command = "npx"
  args = ["-y", "xcodebuildmcp@latest"]
  ```
  <br />
</details>

<details>
  <summary>Claude Desktop</summary>
  <br />

  Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
  ```json
  {
    "mcpServers": {
      "XcodeBuildMCP": {
        "command": "npx",
        "args": ["-y", "xcodebuildmcp@latest"]
      }
    }
  }
  ```
  <br />
</details>

<details>
  <summary>VS Code / VS Code Insiders</summary>
  <br />

  Add to your VS Code settings JSON:
  ```json
  "mcp": {
    "servers": {
      "XcodeBuildMCP": {
        "command": "npx",
        "args": ["-y", "xcodebuildmcp@latest"]
      }
    }
  }
  ```

  Or use the quick install links:

  [<img src="https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF" alt="Install in VS Code">](https://insiders.vscode.dev/redirect/mcp/install?name=XcodeBuildMCP&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22xcodebuildmcp%40latest%22%5D%7D)
  [<img alt="Install in VS Code Insiders" src="https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5">](https://insiders.vscode.dev/redirect/mcp/install?name=XcodeBuildMCP&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22xcodebuildmcp%40latest%22%5D%7D&quality=insiders)
  <br />
</details>

<details>
  <summary>Windsurf</summary>
  <br />

  Add to `~/.codeium/windsurf/mcp_config.json`:
  ```json
  {
    "mcpServers": {
      "XcodeBuildMCP": {
        "command": "npx",
        "args": ["-y", "xcodebuildmcp@latest"]
      }
    }
  }
  ```
  <br />
</details>

<br />

For other installation options see [Getting Started](docs/GETTING_STARTED.md)

## Requirements

- macOS 14.5 or later
- Xcode 16.x or later
- Node.js 18.x or later

## Skill

XcodeBuildMCP now includes an optional agent skill. Some clients (e.g., Cursor, Claude Code) hide MCP tool schemas behind search/progressive disclosure, which can reduce tool discovery and usage. The skill provides a concise overview of available tools to counter that. If your client already exposes tools up front, you likely don’t need it; only use it if your agent isn’t reaching for XcodeBuildMCP tools.

To install, replace `<client-name>` with your client (cursor, claude, codex):
```bash
curl -fsSL https://raw.githubusercontent.com/cameroncooke/XcodeBuildMCP/main/scripts/install-skill.sh | bash -s -- --<client-name>
```

For further information on how to install the skill, see: [docs/SKILLS.md](docs/SKILLS.md)

## Notes

- XcodeBuildMCP requests xcodebuild to skip macro validation to avoid errors when building projects that use Swift Macros.
- Device tools require code signing to be configured in Xcode. See [docs/DEVICE_CODE_SIGNING.md](docs/DEVICE_CODE_SIGNING.md).

## Privacy

XcodeBuildMCP uses Sentry for error telemetry. For more information or to opt out of error telemetry see [docs/PRIVACY.md](docs/PRIVACY.md).

## Documentation

- Getting started: [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)
- Configuration and options: [docs/CONFIGURATION.md](docs/CONFIGURATION.md)
- Tools reference: [docs/TOOLS.md](docs/TOOLS.md)
- Troubleshooting: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- Privacy: [docs/PRIVACY.md](docs/PRIVACY.md)
- Skills: [docs/SKILLS.md](docs/SKILLS.md)
- Contributing: [docs/dev/CONTRIBUTING.md](docs/dev/CONTRIBUTING.md)

## Licence

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
