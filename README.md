<img src="banner.png" alt="XcodeBuild MCP" width="600"/>

A Model Context Protocol (MCP) server that provides Xcode-related tools for integration with AI assistants and other MCP clients.

[![CI](https://github.com/cameroncooke/XcodeBuildMCP/actions/workflows/ci.yml/badge.svg)](https://github.com/cameroncooke/XcodeBuildMCP/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/xcodebuildmcp.svg)](https://badge.fury.io/js/xcodebuildmcp) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Node.js](https://img.shields.io/badge/node->=18.x-brightgreen.svg)](https://nodejs.org/) [![Xcode 16](https://img.shields.io/badge/Xcode-16-blue.svg)](https://developer.apple.com/xcode/) [![macOS](https://img.shields.io/badge/platform-macOS-lightgrey.svg)](https://www.apple.com/macos/) [![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io/) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/cameroncooke/XcodeBuildMCP)

## Easy install

Easiest way to install XcodeBuildMCP is to use [Smithery](https://smithery.ai) to install it from the registry. Copy and paste one of the following commands into your terminal.

```bash
npx -y @smithery/cli@latest install cameroncooke/xcodebuildmcp --client client-name
```

> [!IMPORTANT]
> Due to a Smithery limitation the AXe library isn't bundled with Smithery installs, instead to ensure UI-automation tools work please install AXe and ensure it's globally available by issuing `brew install cameroncooke/axe/axe`, see [AXe](https://github.com/cameroncooke/axe) for more details.

<details>
  <summary>Cursor</summary>
  <br />

  ```bash
  npx -y @smithery/cli@latest install cameroncooke/xcodebuildmcp --client cursor
  ```
  <br />
</details>

<details>
  <summary>Codex CLI</summary>
  <br />

  ```bash
  npx -y @smithery/cli@latest install cameroncooke/xcodebuildmcp --client codex
  ```
  <br />
</details>

<details>
  <summary>Claude Code</summary>
  <br />

  ```bash
  npx -y @smithery/cli@latest install cameroncooke/xcodebuildmcp --client claude-code
  ```
  <br />
</details>

<details>
  <summary>Claude Desktop</summary>
  <br />

  ```bash
  npx -y @smithery/cli@latest install cameroncooke/xcodebuildmcp --client claude
  ```
  <br />
</details>

<details>
  <summary>VS Code</summary>
  <br />

  ```bash
  npx -y @smithery/cli@latest install cameroncooke/xcodebuildmcp --client vscode
  ```
  <br />
</details>

<details>
  <summary>Windsurf</summary>
  <br />

  ```bash
  npx -y @smithery/cli@latest install cameroncooke/xcodebuildmcp --client windsurf
  ```
  <br />
</details>

<br />

For other clients see: [Smithery XcodeBuildMCP](https://smithery.ai/server/cameroncooke/xcodebuildmcp), for other installation options including manual installation see [Getting Started](docs/GETTING_STARTED.md)

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
