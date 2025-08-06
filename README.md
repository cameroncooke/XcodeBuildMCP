<img src="banner.png" alt="XcodeBuild MCP" width="600"/>

A Model Context Protocol (MCP) server that provides Xcode-related tools for integration with AI assistants and other MCP clients.

[![npm version](https://badge.fury.io/js/xcodebuildmcp.svg)](https://badge.fury.io/js/xcodebuildmcp) [![CI](https://github.com/cameroncooke/XcodeBuildMCP/actions/workflows/ci.yml/badge.svg)](https://github.com/cameroncooke/XcodeBuildMCP/actions/workflows/ci.yml) [![CodeQL](https://github.com/cameroncooke/XcodeBuildMCP/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/cameroncooke/XcodeBuildMCP/actions/workflows/github-code-scanning/codeql)
[![Licence: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Verified on MseeP](https://mseep.ai/badge.svg)](https://mseep.ai/app/e0f4ab6d-e867-4c6e-90cd-77363faaafcc)

## Table of contents

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
  - [Configure your MCP client](#configure-your-mcp-client)
    - [Quick install](#quick-install)
    - [Manual installation](#manual-installation)
    - [Alternative installation method using mise](#alternative-installation-method-using-mise)
    - [Installing via Smithery](#installing-via-smithery)
    - [MCP Compatibility](#mcp-compatibility)
- [Incremental build support](#incremental-build-support)
- [Code Signing for Device Deployment](#code-signing-for-device-deployment)
- [Troubleshooting](#troubleshooting)
  - [Diagnostic Tool](#diagnostic-tool)
  - [MCP Server Logs](#mcp-server-logs)
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

> [!IMPORTANT]
> Please note that XcodeBuildMCP will request xcodebuild to skip macro validation. This is to avoid errors when building projects that use Swift Macros. 

## Getting started

### Prerequisites

- macOS 14.5 or later
- Xcode 16.x or later
- Node 18.x or later

### Configure your MCP client

#### Quick install

For a quick install, you can use the following links:

- [![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=XcodeBuildMCP&config=eyJjb21tYW5kIjoibnB4IC15IHhjb2RlYnVpbGRtY3BAbGF0ZXN0In0%3D)
- [<img src="https://img.shields.io/badge/VS_Code-VS_Code?style=flat-square&label=Install%20Server&color=0098FF" alt="Install in VS Code">](https://insiders.vscode.dev/redirect/mcp/install?name=XcodeBuildMCP&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22xcodebuildmcp%40latest%22%5D%7D)
- [<img alt="Install in VS Code Insiders" src="https://img.shields.io/badge/VS_Code_Insiders-VS_Code_Insiders?style=flat-square&label=Install%20Server&color=24bfa5">](https://insiders.vscode.dev/redirect/mcp/install?name=XcodeBuildMCP&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22xcodebuildmcp%40latest%22%5D%7D&quality=insiders)

#### Manual installation

Configure your MCP client (Windsurf, Cursor, Claude Desktop, Claude Code etc.) to use the XcodeBuildMCP server by ammending your client application's MCP configuration.

```json
{
  "mcpServers": {
    "XcodeBuildMCP": {
      "command": "npx",
      "args": [
        "-y",
        "xcodebuildmcp@latest"
      ]
    }
  }
}
```

#### Alternative installation method using mise

Alternatively, you can use XcodeBuildMCP without a specific installation of Node.js by using `mise` to install it:

```bash
# macOS (Homebrew)
brew install mise

# Other installation methods
# See https://mise.jdx.dev/getting-started.html
```

Then configure your MCP client to use mise to install XcodeBuildMCP:

```json
{
  "mcpServers": {
    "XcodeBuildMCP": {
      "command": "mise",
      "args": [
        "x",
        "npm:xcodebuildmcp@1.11.0",
        "--",
        "xcodebuildmcp"
      ]
    }
  }
}
```

> [!NOTE]
> When using mise avoid using the @latest tag as mise will cache the package and may not update to the latest version automatically, instead prefer an explicit version number.

#### Installing via Smithery

To install XcodeBuildMCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@cameroncooke/XcodeBuildMCP):

```bash
npx -y @smithery/cli install @cameroncooke/XcodeBuildMCP --client claude
```

#### MCP Compatibility

XcodeBuildMCP supports both MCP tools, resources and sampling. At time of writing the following editors have varying levels of MCP feature support:

| Editor | Tools | Resources | Samplng |
|--------|-------|-----------|---------|
| **VS Code** | ✅ | ✅ | ✅ |
| **Cursor** | ✅ | ❌ | ❌ | 
| **Windsurf** | ✅ | ❌ | ❌ |
| **Claude Code** | ✅ | ✅ | ❌ |
| **Claude Desktop** | ✅ | ✅ | ❌ |

## Incremental build support

XcodeBuildMCP includes experimental support for incremental builds. This feature is disabled by default and can be enabled by setting the `INCREMENTAL_BUILDS_ENABLED` environment variable to `true`:

To enable incremental builds, set the `INCREMENTAL_BUILDS_ENABLED` environment variable to `true`:

Example MCP client configuration:
```json
{
  "mcpServers": {
    "XcodeBuildMCP": {
      "command": "npx",
      "args": [
        "-y",
        "xcodebuildmcp@latest"
      ],
      "env": {
        "INCREMENTAL_BUILDS_ENABLED": "true"
      }        
    }
  }
}
```

> [!IMPORTANT]
> Please note that incremental builds support is currently highly experimental and your mileage may vary. Please report any issues you encounter to the [issue tracker](https://github.com/cameroncooke/XcodeBuildMCP/issues).

## Code Signing for Device Deployment

For device deployment features to work, code signing must be properly configured in Xcode **before** using XcodeBuildMCP device tools:

1. Open your project in Xcode
2. Select your project target
3. Go to "Signing & Capabilities" tab
4. Configure "Automatically manage signing" and select your development team
5. Ensure a valid provisioning profile is selected

> **Note**: XcodeBuildMCP cannot configure code signing automatically. This initial setup must be done once in Xcode, after which the MCP device tools can build, install, and test apps on physical devices.

## Troubleshooting

If you encounter issues with XcodeBuildMCP, the diagnostic tool can help identify the problem by providing detailed information about your environment and dependencies.

### Diagnostic Tool

The diagnostic tool is a standalone utility that checks your system configuration and reports on the status of all dependencies required by XcodeBuildMCP. It's particularly useful when reporting issues.

```bash
# Run the diagnostic tool using npx
npx --package xcodebuildmcp@latest xcodebuildmcp-diagnostic
```

The diagnostic tool will output comprehensive information about:

- System and Node.js environment
- Xcode installation and configuration
- Required dependencies (xcodebuild, AXe, etc.)
- Environment variables affecting XcodeBuildMCP
- Feature availability status

When reporting issues on GitHub, please include the full output from the diagnostic tool to help with troubleshooting.

### MCP Server Logs

It can be helpful to have access to the log messages from the MCP server to identify any issues. The logs are captured by the client application, for example in Cursor:

Cursor:
```bash
find ~/Library/Application\ Support/Cursor/logs -name "Cursor MCP.log" -exec zip -r matching_logs.zip {} +
```

If your MCP client doesn't have log files you can run the server directly using the MCP Inspector tool see [Debugging](docs/CONTRIBUTING.md#debugging) for more information on how to do this. Once running the MCP tool prints all log messages to it's error pane, which can be helpful in diagnosing issues.

## Privacy

This project uses [Sentry](https://sentry.io/) for error monitoring and diagnostics. Sentry helps us track issues, crashes, and unexpected errors to improve the reliability and stability of XcodeBuildMCP.

### What is sent to Sentry?
- Only error-level logs and diagnostic information are sent to Sentry by default.
- Error logs may include details such as error messages, stack traces, and (in some cases) file paths or project names. You can review the sources in this repository to see exactly what is logged.

### Opting Out of Sentry
- If you do not wish to send error logs to Sentry, you can opt out by setting the environment variable `SENTRY_DISABLED=true`.

Example MCP client configuration:
```json
{
  "mcpServers": {
    "XcodeBuildMCP": {
      "command": "npx",
      "args": [
        "-y",
        "xcodebuildmcp@latest"
      ],
      "env": {
        "SENTRY_DISABLED": "true"
      }        
    }
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

Contributions are welcome! Here's how you can help improve XcodeBuildMCP.

See our documentation for development:
- [CONTRIBUTING](docs/CONTRIBUTING.md) - Contribution guidelines and development setup
- [CODE_QUALITY](docs/CODE_QUALITY.md) - Code quality standards, linting, and architectural rules
- [TESTING](docs/TESTING.md) - Testing principles and patterns
- [ARCHITECTURE](docs/ARCHITECTURE.md) - System architecture and design principles

## Licence

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## MCP Server Verification

### Glama.ai

<a href="https://glama.ai/mcp/servers/@cameroncooke/XcodeBuildMCP">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@cameroncooke/XcodeBuildMCP/badge" alt="XcodeBuildMCP MCP server" />
</a>

### MseeP.a

[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/cameroncooke-xcodebuildmcp-badge.png)](https://mseep.ai/app/cameroncooke-xcodebuildmcp)
