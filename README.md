<img src="banner.png" alt="XcodeBuild MCP" width="600"/>

A Model Context Protocol (MCP) server that provides Xcode-related tools for integration with AI assistants and other MCP clients.

[![CI](https://github.com/cameroncooke/XcodeBuildMCP/actions/workflows/ci.yml/badge.svg)](https://github.com/cameroncooke/XcodeBuildMCP/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/xcodebuildmcp.svg)](https://badge.fury.io/js/xcodebuildmcp) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Node.js](https://img.shields.io/badge/node->=18.x-brightgreen.svg)](https://nodejs.org/) [![Xcode 16](https://img.shields.io/badge/Xcode-16-blue.svg)](https://developer.apple.com/xcode/) [![macOS](https://img.shields.io/badge/platform-macOS-lightgrey.svg)](https://www.apple.com/macos/) [![MCP](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io/) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/cameroncooke/XcodeBuildMCP)

## Easy install

Easiest way to install XcodeBuildMCP is to use Smithery to install it from the registry. Copy and paste one of the following commands into your terminal.

```bash
npx -y @smithery/cli@latest install cameroncooke/xcodebuildmcp --client client-name
```

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

For more installation options see: [Smithery XcodeBuildMCP](https://smithery.ai/server/cameroncooke/xcodebuildmcp).

>[!NOTE]
> XcodeBuildMCP requires Node 18.x or later and Xcode 16.x or later to be installed.

## View the full Readme

<details>
  <summary>Click to expand the full readme with manual installation instructions, configuration options, feature list and demos.</summary>

## Table of contents

- [View the full Readme](#view-the-full-readme)
- [Overview](#overview)
- [Why?](#why)
- [Features](#features)
  - [Xcode project management](#xcode-project-management)
  - [Swift Package Manager](#swift-package-manager)
  - [Simulator management](#simulator-management)
  - [Device management](#device-management)
  - [App utilities](#app-utilities)
  - [MCP Resources](#mcp-resources)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
    - [One click install](#one-click-install)
    - [Manual installation](#manual-installation)
    - [Specific client installation instructions](#specific-client-installation-instructions)
      - [OpenAI Codex CLI](#openai-codex-cli)
      - [Claude Code CLI](#claude-code-cli)
- [Incremental build support](#incremental-build-support)
- [Workflow Selection](#workflow-selection)
- [Session-aware opt-out](#session-aware-opt-out)
- [Code Signing for Device Deployment](#code-signing-for-device-deployment)
- [Troubleshooting](#troubleshooting)
  - [Doctor Tool](#doctor-tool)
- [Privacy](#privacy)
  - [What is sent to Sentry?](#what-is-sent-to-sentry)
  - [Opting Out of Sentry](#opting-out-of-sentry)
- [Demos](#demos)
  - [Autonomously fixing build errors in Cursor](#autonomously-fixing-build-errors-in-cursor)
  - [Utilising the new UI automation and screen capture features](#utilising-the-new-ui-automation-and-screen-capture-features)
  - [Building and running iOS app in Claude Desktop](#building-and-running-ios-app-in-claude-desktop)
- [Contributing](#contributing)
- [Licence](#licence)

## Overview

XcodeBuildMCP is a Model Context Protocol (MCP) server that exposes Xcode operations as tools and resources for AI assistants and other MCP clients. Built with a modern plugin architecture, it provides a comprehensive set of self-contained tools organized into workflow-based directories, plus MCP resources for efficient data access, enabling programmatic interaction with Xcode projects, simulators, devices, and Swift packages through a standardized interface.

![xcodebuildmcp2](https://github.com/user-attachments/assets/8961d5db-f7ed-4e60-bbb8-48bfd0bc1353)
<caption>Using Cursor to build, install, and launch an app on the iOS simulator while capturing logs at run-time.</caption>

## Why?

The XcodeBuild MCP tool exists primarily to streamline and standardise interaction between AI agents and Xcode projects. By providing dedicated tools for common Xcode operations, it removes reliance on manual or potentially incorrect command-line invocations.

This ensures a reliable and efficient development process, allowing agents to seamlessly leverage Xcode's capabilities while reducing the risk of configuration errors.

Critically, this MCP enables AI agents to independently validate code changes by building projects, inspecting errors, and iterating autonomously. In contrast to user-driven tools like Sweetpad, XcodeBuild MCP empowers agents to automate these workflows effectively.

## Features

The XcodeBuildMCP server provides the following tool capabilities:

### Xcode project management
- **Discover Projects**: Xcode projects and workspaces discovery
- **Build Operations**: Platform-specific build tools for macOS, iOS simulator, and iOS device targets
- **Project Information**: Tools to list schemes and show build settings for Xcode projects and workspaces
- **Clean Operations**: Clean build products using xcodebuild's native clean action
- **Incremental build support**: Lightning fast builds using incremental build support (experimental, opt-in required)
- **Project Scaffolding**: Create new iOS and macOS projects from modern templates with workspace + SPM package architecture, customizable bundle identifiers, deployment targets, and device families

### Swift Package Manager
- **Build Packages**: Build Swift packages with configuration and architecture options
- **Run Tests**: Execute Swift package test suites with filtering and parallel execution
- **Run Executables**: Execute package binaries with timeout handling and background execution support
- **Process Management**: List and stop long-running executables started with Swift Package tools
- **Clean Artifacts**: Remove build artifacts and derived data for fresh builds

### Simulator management
- **Simulator Control**: List, boot, and open simulators
- **App Lifecycle**: Complete app management - install, launch, and stop apps on simulators
- **Log Capture**: Capture run-time logs from a simulator
- **UI Automation**: Interact with simulator UI elements
- **Screenshot**: Capture screenshots from a simulator
- **Video Capture**: Start/stop simulator video capture to MP4 (AXe v1.1.0+)

### Device management
- **Device Discovery**: List connected physical Apple devices over USB or Wi-Fi
- **App Lifecycle**: Complete app management - build, install, launch, and stop apps on physical devices
- **Testing**: Run test suites on physical devices with detailed results and cross-platform support
- **Log Capture**: Capture console output from apps running on physical Apple devices
- **Wireless Connectivity**: Support for devices connected over Wi-Fi networks

### App utilities
- **Bundle ID Extraction**: Extract bundle identifiers from app bundles across all Apple platforms
- **App Lifecycle Management**: Complete app lifecycle control across all platforms
  - Launch apps on simulators, physical devices, and macOS
  - Stop running apps with process ID or bundle ID management
  - Process monitoring and control for comprehensive app management

### MCP Resources

For clients that support MCP resources XcodeBuildMCP provides efficient URI-based data access:

- **Simulators Resource** (`xcodebuildmcp://simulators`): Direct access to available iOS simulators with UUIDs and states
- **Devices Resource** (`xcodebuildmcp://devices`): Direct access to connected physical Apple devices with UDIDs and states
- **Doctor Resource** (`xcodebuildmcp://doctor`): Direct access to environment information such as Xcode version, macOS version, and Node.js version

## Getting started

### Prerequisites

- macOS 14.5 or later
- Xcode 16.x or later
- Node 18.x or later

> Video capture requires the bundled AXe binary (v1.1.0+). Run `npm run bundle:axe` once locally before using `record_sim_video`. This is not required for unit tests.

Configure your MCP client

#### One click install

If you're using Curor or VS Code you can use one the below quick install links to install XcodeBuildMCP.

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=XcodeBuildMCP&config=eyJ0eXBlIjoic3RkaW8iLCJjb21tYW5kIjoibnB4IC15IHhjb2RlYnVpbGRtY3BAbGF0ZXN0IiwiZW52Ijp7IklOQ1JFTUVOVEFMX0JVSUxEU19FTkFCTEVEIjoiZmFsc2UiLCJYQ09ERUJVSUxETUNQX1NFTlRSWV9ESVNBQkxFRCI6ImZhbHNlIn19)

[<img src="https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF" alt="Install in VS Code">](https://insiders.vscode.dev/redirect/mcp/install?name=XcodeBuildMCP&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22xcodebuildmcp%40latest%22%5D%7D)

[<img alt="Install in VS Code Insiders" src="https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5">](https://insiders.vscode.dev/redirect/mcp/install?name=XcodeBuildMCP&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22xcodebuildmcp%40latest%22%5D%7D&quality=insiders)

#### Manual installation

Most MCP clients (Cursor, VS Code, Windsurf, Claude Desktop etc) have standardised on the following JSON configuration format, just add the the following to your client's JSON configuration's `mcpServers` object:

```json
"XcodeBuildMCP": {
  "command": "npx",
  "args": [
    "-y",
    "xcodebuildmcp@latest"
  ]
}
```

#### Specific client installation instructions

##### OpenAI Codex CLI

Codex uses a toml configuration file to configure MCP servers. To configure XcodeBuildMCP with [OpenAI's Codex CLI](https://github.com/openai/codex), add the following configuration to your Codex CLI config file:

```toml
[mcp_servers.XcodeBuildMCP]
command = "npx"
args = ["-y", "xcodebuildmcp@latest"]
env = { "INCREMENTAL_BUILDS_ENABLED" = "false", "XCODEBUILDMCP_SENTRY_DISABLED" = "false" }
```

If you see tool calls timing out in Codex (for example, `timed out awaiting tools/call after 60s`), increase the Codex tool timeout in your config:

```toml
tool_timeout_sec = 600
```

For more information see [OpenAI Codex MCP Server Configuration](https://github.com/openai/codex/blob/main/docs/config.md#connecting-to-mcp-servers) documentation.

##### Claude Code CLI

To use XcodeBuildMCP with [Claude Code](https://code.anthropic.com), you can add it via the command line:

```bash
# Add XcodeBuildMCP server to Claude Code
claude mcp add XcodeBuildMCP npx xcodebuildmcp@latest

# Or with environment variables
claude mcp add XcodeBuildMCP npx xcodebuildmcp@latest -e INCREMENTAL_BUILDS_ENABLED=false -e XCODEBUILDMCP_SENTRY_DISABLED=false
```

> [!IMPORTANT]
> Please note that XcodeBuildMCP will request xcodebuild to skip macro validation. This is to avoid errors when building projects that use Swift Macros.

## Incremental build support

XcodeBuildMCP includes experimental support for incremental builds. This feature is disabled by default and can be enabled by setting the `INCREMENTAL_BUILDS_ENABLED` environment variable to `true`:

To enable incremental builds, set the `INCREMENTAL_BUILDS_ENABLED` environment variable to `true`:

Example MCP configuration:
```json
"XcodeBuildMCP": {
  ...
  "env": {
    "INCREMENTAL_BUILDS_ENABLED": "true"
  }
}
```

> [!IMPORTANT]
> Please note that incremental builds support is currently highly experimental and your mileage may vary. Please report any issues you encounter to the [issue tracker](https://github.com/cameroncooke/XcodeBuildMCP/issues).

## Workflow Selection

By default, XcodeBuildMCP loads all tools at startup. If you want a smaller tool surface for a specific workflow, set `XCODEBUILDMCP_ENABLED_WORKFLOWS` to a comma-separated list of workflow directory names. The `session-management` workflow is always auto-included since other tools depend on it.

Example MCP client configuration:
```json
"XcodeBuildMCP": {
  ...
  "env": {
    "XCODEBUILDMCP_ENABLED_WORKFLOWS": "simulator,device,project-discovery"
  }
}
```

**Available Workflows:**
- `device` (7 tools) - iOS Device Development
- `simulator` (12 tools) - iOS Simulator Development
- `simulator-management` (5 tools) - Simulator Management
- `swift-package` (6 tools) - Swift Package Manager
- `project-discovery` (5 tools) - Project Discovery
- `macos` (6 tools) - macOS Development
- `ui-testing` (11 tools) - UI Testing & Automation
- `logging` (4 tools) - Log Capture & Management
- `project-scaffolding` (2 tools) - Project Scaffolding
- `utilities` (1 tool) - Project Utilities
- `doctor` (1 tool) - System Doctor

## Session-aware opt-out

By default, XcodeBuildMCP uses a session-aware mode: the LLM (or client) sets shared defaults once (simulator, device, project/workspace, scheme, etc.), and all tools reuse them—similar to choosing a scheme and simulator in Xcode’s UI so you don’t repeat them on every action. This cuts context bloat not just in each call payload, but also in the tool schemas themselves (those parameters don’t have to be described on every tool).

If you prefer the older, explicit style where each tool requires its own parameters, set `XCODEBUILDMCP_DISABLE_SESSION_DEFAULTS=true`. This restores the legacy schemas with per-call parameters while still honoring any session defaults you choose to set.

Example MCP client configuration:
```json
"XcodeBuildMCP": {
  ...
  "env": {
    "XCODEBUILDMCP_DISABLE_SESSION_DEFAULTS": "true"
  }
}
```

Leave this unset for the streamlined session-aware experience; enable it to force explicit parameters on each tool call.

## Code Signing for Device Deployment

For device deployment features to work, code signing must be properly configured in Xcode **before** using XcodeBuildMCP device tools:

1. Open your project in Xcode
2. Select your project target
3. Go to "Signing & Capabilities" tab
4. Configure "Automatically manage signing" and select your development team
5. Ensure a valid provisioning profile is selected

> **Note**: XcodeBuildMCP cannot configure code signing automatically. This initial setup must be done once in Xcode, after which the MCP device tools can build, install, and test apps on physical devices.

## Troubleshooting

If you encounter issues with XcodeBuildMCP, the doctor tool can help identify the problem by providing detailed information about your environment and dependencies.

### Doctor Tool

The doctor tool is a standalone utility that checks your system configuration and reports on the status of all dependencies required by XcodeBuildMCP. It's particularly useful when reporting issues.

```bash
# Run the doctor tool using npx
npx --package xcodebuildmcp@latest xcodebuildmcp-doctor
```

The doctor tool will output comprehensive information about:

- System and Node.js environment
- Xcode installation and configuration
- Required dependencies (xcodebuild, AXe, etc.)
- Environment variables affecting XcodeBuildMCP
- Feature availability status

When reporting issues on GitHub, please include the full output from the doctor tool to help with troubleshooting.

## Privacy

This project uses [Sentry](https://sentry.io/) for error monitoring and diagnostics. Sentry helps us track issues, crashes, and unexpected errors to improve the reliability and stability of XcodeBuildMCP.

### What is sent to Sentry?
- Only error-level logs and diagnostic information are sent to Sentry by default.
- Error logs may include details such as error messages, stack traces, and (in some cases) file paths or project names. You can review the sources in this repository to see exactly what is logged.

### Opting Out of Sentry
- If you do not wish to send error logs to Sentry, you can opt out by setting the environment variable `XCODEBUILDMCP_SENTRY_DISABLED=true`.

Example MCP client configuration:
```json
"XcodeBuildMCP": {
  ...
  "env": {
    "XCODEBUILDMCP_SENTRY_DISABLED": "true"
  }
}
```

## Demos

### Autonomously fixing build errors in Cursor
![xcodebuildmcp3](https://github.com/user-attachments/assets/173e6450-8743-4379-a76c-de2dd2b678a3)

### Utilising the new UI automation and screen capture features

![xcodebuildmcp4](https://github.com/user-attachments/assets/17300a18-f47a-428a-aad3-dc094859c1b2)

### Building and running iOS app in Claude Desktop
https://github.com/user-attachments/assets/e3c08d75-8be6-4857-b4d0-9350b26ef086

## Contributing

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/) [![Node.js](https://img.shields.io/badge/node->=18.x-brightgreen.svg)](https://nodejs.org/)

Contributions are welcome! Here's how you can help improve XcodeBuildMCP.

See our documentation for development:
- [CONTRIBUTING](docs/CONTRIBUTING.md) - Contribution guidelines and development setup
- [CODE_QUALITY](docs/CODE_QUALITY.md) - Code quality standards, linting, and architectural rules
- [TESTING](docs/TESTING.md) - Testing principles and patterns
- [ARCHITECTURE](docs/ARCHITECTURE.md) - System architecture and design principles

</details>

## Licence

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
