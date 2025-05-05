<img src="banner.png" alt="XcodeBuild MCP" width="600"/>

A Model Context Protocol (MCP) server that provides Xcode-related tools for integration with AI assistants and other MCP clients.

[![CI](https://github.com/cameroncooke/XcodeBuildMCP/actions/workflows/ci.yml/badge.svg)](https://github.com/cameroncooke/XcodeBuildMCP/actions/workflows/ci.yml) [![CodeQL](https://github.com/cameroncooke/XcodeBuildMCP/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/cameroncooke/XcodeBuildMCP/actions/workflows/github-code-scanning/codeql)
[![Licence: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Table of contents

- [Overview](#overview)
- [Why?](#why)
- [Features](#features)
   * [Xcode project management](#xcode-project-management)
   * [Simulator management](#simulator-management)
   * [App utilities](#app-utilities)
- [Getting started](#getting-started)
   * [Prerequisites](#prerequisites)
   * [One-line setup with mise](#one-line-setup-with-mise)
   * [Configure MCP clients](#configure-mcp-clients)
   * [Enabling UI Automation (beta)](#enabling-ui-automation-beta)
- [Incremental build support](#incremental-build-support)   
- [Troubleshooting](#troubleshooting)
   * [Diagnostic Tool](#diagnostic-tool)
      + [Using with mise](#using-with-mise)
      + [Using with npx](#using-with-npx)
- [Privacy](#privacy)
   * [What is sent to Sentry?](#what-is-sent-to-sentry)
   * [Opting Out of Sentry](#opting-out-of-sentry)
- [Demos](#demos)
   * [Autonomously fixing build errors in Cursor](#autonomously-fixing-build-errors-in-cursor)
   * [Utilising the new UI automation and screen capture features](#utilising-the-new-ui-automation-and-screen-capture-features)
   * [Building and running iOS app in Claude Desktop](#building-and-running-ios-app-in-claude-desktop)
- [Contributing](#contributing)
- [Licence](#licence)

## Overview

This project implements an MCP server that exposes Xcode operations as tools that can be invoked by AI agents via the MCP protocol. It enables programmatic interaction with Xcode projects through a standardised interface, optimised for agent-driven development workflows.

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

### Simulator management
- **Simulator Control**: List, boot, and open iOS simulators 
- **App Deployment**: Install and launch apps on iOS simulators
- **Log Capture**: Capture run-time logs from a simulator
- **UI Automation**: Interact with simulator UI elements (beta)
- **Screenshot**: Capture screenshots from a simulator (beta)

### App utilities
- **Bundle ID Extraction**: Extract bundle identifiers from iOS and macOS app bundles
- **App Launching**: Launch built applications on both simulators and macOS

## Getting started

### Prerequisites

- macOS 14.5 or later
- Xcode 18.x or later
- mise

### One-line setup with mise

To install mise:
```bash
# macOS (Homebrew)
brew install mise

# Other installation methods
# See https://mise.jdx.dev/getting-started.html
```

For more information about mise, visit the [official documentation](https://mise.jdx.dev/).

### Configure MCP clients

Configure your MCP client (Windsurf, Cursor, Claude Desktop, etc.) to use the XcodeBuildMCP server by adding the following configuration, changing the version number to match the version you wish to use:

```json
{
  "mcpServers": {
    "XcodeBuildMCP": {
      "command": "mise",
      "args": [
        "x",
        "npm:xcodebuildmcp@1.4.0-beta.1",
        "--",
        "xcodebuildmcp"
      ]
    }
  }
}
```

> [!NOTE]
> When using mise avoid using the @latest tag as mise will cache the package and may not update to the latest version automatically, instead prefer an explicit version number.

> [!IMPORTANT]
> Please note that XcodeBuildMCP will request xcodebuild to skip macro validation. This is to avoid errors when building projects that use Swift Macros. 

### Enabling UI Automation (beta)

For UI automation features (tap, swipe, screenshot, etc.), you'll need to install Facebook's idb_companion:

```bash
brew tap facebook/fb
brew install idb-companion
```

The idb client is also required but XcodeBuildMCP attmepts to install it for you. If you find that the UI automation features are still not available you can install the client manually using the following command (assumes you have Python installed):

```bash
pip install fb-idb==1.1.7
```

> [!IMPORTANT]
> Please note that UI automation features are currently in beta so there might be some rough edges. If you encounter any issues, please report them in the [issue tracker](https://github.com/cameroncooke/XcodeBuildMCP/issues).

> [!NOTE]
> Displaying images in tool responses and embedding them in chat context may not be supported by all MCP Clients; it's currently known to be supported in Cursor.

## Incremental build support

XcodeBuildMCP includes experimental support for incremental builds. This feature is disabled by default and can be enabled by setting the `INCREMENTAL_BUILDS_ENABLED` environment variable to `true`:

To enable incremental builds, set the `INCREMENTAL_BUILDS_ENABLED` environment variable to `true`:

Example MCP client configuration:
```bash
{
  "mcpServers": {
    "XcodeBuildMCP": {
      "command": "mise",
      "args": [
        "x",
        "npm:xcodebuildmcp@1.4.0-beta.1",
        "--",
        "xcodebuildmcp"
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

## Troubleshooting

If you encounter issues with XcodeBuildMCP, the diagnostic tool can help identify the problem by providing detailed information about your environment and dependencies.

### Diagnostic Tool

The diagnostic tool is a standalone utility that checks your system configuration and reports on the status of all dependencies required by XcodeBuildMCP. It's particularly useful when reporting issues.

#### Using with mise

```bash
# Run the diagnostic tool using mise
mise x npm:xcodebuildmcp@1.4.0-beta.1 -- xcodebuildmcp-diagnostic
```

#### Using with npx

```bash
# Run the diagnostic tool using npx
npx xcodebuildmcp@1.4.0-beta.1 xcodebuildmcp-diagnostic
```

The diagnostic tool will output comprehensive information about:

- System and Node.js environment
- Xcode installation and configuration
- Required dependencies (xcodebuild, idb, etc.)
- Environment variables affecting XcodeBuildMCP
- Feature availability status

When reporting issues on GitHub, please include the full output from the diagnostic tool to help with troubleshooting.

## Privacy

This project uses [Sentry](https://sentry.io/) for error monitoring and diagnostics. Sentry helps us track issues, crashes, and unexpected errors to improve the reliability and stability of XcodeBuildMCP.

### What is sent to Sentry?
- Only error-level logs and diagnostic information are sent to Sentry by default.
- Error logs may include details such as error messages, stack traces, and (in some cases) file paths or project names. You can review the sources in this repository to see exactly what is logged.

### Opting Out of Sentry
- If you do not wish to send error logs to Sentry, you can opt out by setting the environment variable `SENTRY_DISABLED=true`.

Example MCP client configuration:
```bash
{
  "mcpServers": {
    "XcodeBuildMCP": {
      "command": "mise",
      "args": [
        "x",
        "npm:xcodebuildmcp@1.4.0-beta.1",
        "--",
        "xcodebuildmcp"
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

See our [CONTRIBUTING](CONTRIBUTING.md) document for more information on how to configure your local environment and contribute to the project.

## Licence

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
