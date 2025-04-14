<img src="banner.png" alt="XcodeBuild MCP" width="600"/>

A Model Context Protocol (MCP) server that provides Xcode-related tools for integration with AI assistants and other MCP clients.

## Table of contents

- [Overview](#overview)
- [Why?](#why)
- [Features](#features)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [One-line setup with mise x](#one-line-setup-with-mise-x)
  - [Configure MCP clients](#configure-mcp-clients)
- [Demos](#demos)
  - [Building and running iOS app in Cursor](#building-and-running-ios-app-in-cursor)
  - [Building and running iOS app in Claude Code](#building-and-running-ios-app-in-claude-code)
- [Local development setup](#local-development-setup)
  - [Prerequisites](#prerequisites-1)
  - [Installation](#installation)
  - [Configure your MCP client](#configure-your-mcp-client)
  - [Debugging](#debugging)
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

### Simulator management
- **Simulator Control**: List, boot, and open iOS simulators 
- **App Deployment**: Install and launch apps on iOS simulators
- **Log Capture**: Capture run-time logs from a simulator

### App utilities
- **Bundle ID Extraction**: Extract bundle identifiers from iOS and macOS app bundles
- **App Launching**: Launch built applications on both simulators and macOS

## Getting started

### Prerequisites

- Xcode command-line tools
- Node.js (v16 or later)
- npm

> [!NOTE]
> If you are using mise, you can skip the Node.js and npm installation steps.

### One-line setup with mise x

To install mise:
```bash
# macOS (Homebrew)
brew install mise

# Other installation methods
# See https://mise.jdx.dev/getting-started.html
```

For more information about mise, visit the [official documentation](https://mise.jdx.dev/).

### Configure MCP clients

Configure your MCP client (Windsurf, Cursor, Claude Desktop, etc.) to use the XcodeBuildMCP server by adding the following configuration:

```json
{
  "mcpServers": {
    "XcodeBuildMCP": {
      "command": "mise",
      "args": [
        "x",
        "npm:xcodebuildmcp@latest",
        "--",
        "xcodebuildmcp"
      ]
    }
  }
}
```

Or, if you have an existing Node.js environment, you can use npx instead of mise:

```json
{
  "mcpServers": {
    "XcodeBuildMCP": {
      "command": "npx",
      "args": [
        "xcodebuildmcp"
      ]
    }
  }
}
```

## Demos

### Building and running iOS app in Cursor
https://github.com/user-attachments/assets/b9d334b5-7f28-47fc-9d66-28061bc701b4


### Building and running iOS app in Claude Code
https://github.com/user-attachments/assets/e3c08d75-8be6-4857-b4d0-9350b26ef086


## Local development setup

### Prerequisites

- Node.js (v16 or later)
- npm
- Xcode command-line tools

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Build the project:
   ```
   npm run build
   ```
4. Start the server:
   ```
   node build/index.js
   ```

### Configure your MCP client

To configure your MCP client to use the local XcodeBuildMCP server, add the following configuration:

```json
{
  "mcpServers": {
    "XcodeBuildMCP": {
      "command": "node",
      "args": [
        "/path_to/XcodeBuildMCP/build/index.js"
      ]
    }
  }
}
```

### Debugging

You can use MCP Inspector via:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```   

## Licence

This project is licensed under the MIT License - see the LICENSE file for details.
