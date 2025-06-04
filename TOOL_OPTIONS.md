# XcodeBuildMCP Tool Options

This document explains how to configure tool registration in XcodeBuildMCP to optimise for different workflows and reduce the number of tools presented to LLM clients.

## Overview

XcodeBuildMCP supports selective tool registration based on environment variables. This allows you to:

1. **Opt-in to individual tools** - Enable only specific tools you need
2. **Enable tool groups** - Enable logical groups of tools for specific workflows
3. **Default "all tools enabled"** - Without any configuration, all tools are enabled (default behaviour)

## Why Use Selective Tool Registration?

- **Reduced context window usage for LLMs** - Only register tools needed for a specific workflow
- **Optimised for different use cases** - Configure for iOS development, macOS development, UI testing, etc.

## Available Tool Groups and Environment Variables

XcodeBuildMCP provides workflow-based tool groups that organise tools logically based on common developer workflows.

### Workflow-based Groups

These groups organise tools based on common developer workflows, making it easier to enable just the tools needed for specific tasks:

- **XCODEBUILDMCP_GROUP_PROJECT_DISCOVERY=true** - Project/target discovery and analysis tools
  - _e.g., Discover projects, list schemes, show build settings._
- **XCODEBUILDMCP_GROUP_IOS_SIMULATOR_WORKFLOW=true** - Complete iOS simulator development workflow tools
  - _e.g., Building, running, debugging on simulators._
- **XCODEBUILDMCP_GROUP_IOS_DEVICE_WORKFLOW=true** - iOS physical device development workflow tools
  - _e.g., Building and deploying to physical iOS devices._
- **XCODEBUILDMCP_GROUP_MACOS_WORKFLOW=true** - macOS application development workflow tools
  - _e.g., Building, running, debugging macOS applications._
- **XCODEBUILDMCP_GROUP_SIMULATOR_MANAGEMENT=true** - Simulator device management tools
  - _e.g., Managing simulator lifecycle (boot, open, set appearance)._
- **XCODEBUILDMCP_GROUP_APP_DEPLOYMENT=true** - Application deployment tools
  - _e.g., Installing and launching apps across platforms._
- **XCODEBUILDMCP_GROUP_DIAGNOSTICS=true** - Logging and diagnostics tools
  - _e.g., Log capture, debugging information._
- **XCODEBUILDMCP_GROUP_UI_TESTING=true** - UI testing and automation tools
  - _e.g., Tools for interacting with UI elements via AXe._

## Enabling Individual Tools

To enable specific tools rather than entire groups, use the following environment variables. Each tool is enabled by setting its corresponding variable to `true`.

### Project Discovery & Information
- **XCODEBUILDMCP_TOOL_DISCOVER_PROJECTS=true** - Discover Xcode projects and workspaces.
- **XCODEBUILDMCP_TOOL_LIST_SCHEMES_WORKSPACE=true** - List schemes in an Xcode workspace.
- **XCODEBUILDMCP_TOOL_LIST_SCHEMES_PROJECT=true** - List schemes in an Xcode project.
- **XCODEBUILDMCP_TOOL_LIST_SIMULATORS=true** - List available iOS/tvOS/watchOS simulators.
- **XCODEBUILDMCP_TOOL_SHOW_BUILD_SETTINGS_WORKSPACE=true** - Show build settings for an Xcode workspace.
- **XCODEBUILDMCP_TOOL_SHOW_BUILD_SETTINGS_PROJECT=true** - Show build settings for an Xcode project.

### Build, Clean & Run Tools

#### Clean
- **XCODEBUILDMCP_TOOL_CLEAN_WORKSPACE=true** - Clean build products for an Xcode workspace.
- **XCODEBUILDMCP_TOOL_CLEAN_PROJECT=true** - Clean build products for an Xcode project.

#### Swift Package Build
- **XCODEBUILDMCP_TOOL_BUILD_SWIFT_PACKAGE=true** - Build a Swift package using `swift build`.

#### macOS Build & Run
- **XCODEBUILDMCP_TOOL_MACOS_BUILD_WORKSPACE=true** - Build a macOS application from a workspace.
- **XCODEBUILDMCP_TOOL_MACOS_BUILD_PROJECT=true** - Build a macOS application from a project.
- **XCODEBUILDMCP_TOOL_MACOS_BUILD_AND_RUN_WORKSPACE=true** - Build and run a macOS application from a workspace.
- **XCODEBUILDMCP_TOOL_MACOS_BUILD_AND_RUN_PROJECT=true** - Build and run a macOS application from a project.

#### iOS Simulator Build & Run
- **XCODEBUILDMCP_TOOL_IOS_SIMULATOR_BUILD_BY_NAME_WORKSPACE=true** - Build for iOS Simulator by name from a workspace.
- **XCODEBUILDMCP_TOOL_IOS_SIMULATOR_BUILD_BY_NAME_PROJECT=true** - Build for iOS Simulator by name from a project.
- **XCODEBUILDMCP_TOOL_IOS_SIMULATOR_BUILD_BY_ID_WORKSPACE=true** - Build for iOS Simulator by UDID from a workspace.
- **XCODEBUILDMCP_TOOL_IOS_SIMULATOR_BUILD_BY_ID_PROJECT=true** - Build for iOS Simulator by UDID from a project.
- **XCODEBUILDMCP_TOOL_IOS_SIMULATOR_BUILD_AND_RUN_BY_NAME_WORKSPACE=true** - Build and run on iOS Simulator by name (workspace).
- **XCODEBUILDMCP_TOOL_IOS_SIMULATOR_BUILD_AND_RUN_BY_NAME_PROJECT=true** - Build and run on iOS Simulator by name (project).
- **XCODEBUILDMCP_TOOL_IOS_SIMULATOR_BUILD_AND_RUN_BY_ID_WORKSPACE=true** - Build and run on iOS Simulator by UDID (workspace).
- **XCODEBUILDMCP_TOOL_IOS_SIMULATOR_BUILD_AND_RUN_BY_ID_PROJECT=true** - Build and run on iOS Simulator by UDID (project).

#### iOS Device Build
- **XCODEBUILDMCP_TOOL_IOS_DEVICE_BUILD_TOOLS=true** - Build iOS apps for physical devices (collection of tools).

### App Path & Bundle ID Retrieval

#### App Path
- **XCODEBUILDMCP_TOOL_GET_MACOS_APP_PATH_WORKSPACE=true** - Get path to a built macOS app (workspace).
- **XCODEBUILDMCP_TOOL_GET_MACOS_APP_PATH_PROJECT=true** - Get path to a built macOS app (project).
- **XCODEBUILDMCP_TOOL_GET_IOS_DEVICE_APP_PATH_WORKSPACE=true** - Get path to a built iOS device app (workspace).
- **XCODEBUILDMCP_TOOL_GET_IOS_DEVICE_APP_PATH_PROJECT=true** - Get path to a built iOS device app (project).
- **XCODEBUILDMCP_TOOL_GET_SIMULATOR_APP_PATH_BY_NAME_WORKSPACE=true** - Get path to a built simulator app by name (workspace).
- **XCODEBUILDMCP_TOOL_GET_SIMULATOR_APP_PATH_BY_NAME_PROJECT=true** - Get path to a built simulator app by name (project).
- **XCODEBUILDMCP_TOOL_GET_SIMULATOR_APP_PATH_BY_ID_WORKSPACE=true** - Get path to a built simulator app by UDID (workspace).
- **XCODEBUILDMCP_TOOL_GET_SIMULATOR_APP_PATH_BY_ID_PROJECT=true** - Get path to a built simulator app by UDID (project).

#### Bundle ID
- **XCODEBUILDMCP_TOOL_GET_MACOS_BUNDLE_ID=true** - Get the bundle ID of a macOS app.
- **XCODEBUILDMCP_TOOL_GET_IOS_BUNDLE_ID=true** - Get the bundle ID of an iOS app.

### Simulator Management & App Lifecycle

#### Management
- **XCODEBUILDMCP_TOOL_BOOT_SIMULATOR=true** - Boot an iOS/tvOS/watchOS simulator.
- **XCODEBUILDMCP_TOOL_OPEN_SIMULATOR=true** - Open the Simulator application.
- **XCODEBUILDMCP_TOOL_SET_SIMULATOR_APPEARANCE=true** - Set simulator appearance (dark/light mode).

#### App Installation & Launch
- **XCODEBUILDMCP_TOOL_INSTALL_APP_IN_SIMULATOR=true** - Install an app in a simulator.
- **XCODEBUILDMCP_TOOL_LAUNCH_APP_IN_SIMULATOR=true** - Launch an app in a simulator.
- **XCODEBUILDMCP_TOOL_LAUNCH_APP_WITH_LOGS_IN_SIMULATOR=true** - Launch an app in simulator and capture logs.
- **XCODEBUILDMCP_TOOL_LAUNCH_MACOS_APP=true** - Launch a macOS application.

### Logging & Diagnostics

#### Log Capture
- **XCODEBUILDMCP_TOOL_START_SIMULATOR_LOG_CAPTURE=true** - Start capturing logs from a simulator.
- **XCODEBUILDMCP_TOOL_STOP_AND_GET_SIMULATOR_LOG=true** - Stop capturing logs and retrieve them.

#### UI Automation (AXe)
- **XCODEBUILDMCP_TOOL_UI_AUTOMATION_TOOLS=true** - Enable UI automation tools (e.g., tap, swipe - requires AXe).
- **XCODEBUILDMCP_TOOL_SCREENSHOT=true** - Capture screenshots from iOS simulators.

#### Project Scaffolding
- **XCODEBUILDMCP_TOOL_SCAFFOLD_PROJECT=true** - Scaffold new iOS/macOS projects from templates.

#### Diagnostics
- **XCODEBUILDMCP_DEBUG=true** - Enable diagnostic tool for XcodeBuildMCP server.

## Recommended Tool Combinations for Common Use Cases

Workflow-based groups make it easier to enable just the right tools for specific development tasks. Here are some recommended combinations:

### iOS Simulator Developer

For developers focussed on iOS simulator development:

```json
{
  // Rest of your MCP configuration
  "env": {
    "XCODEBUILDMCP_GROUP_PROJECT_DISCOVERY": "true",
    "XCODEBUILDMCP_GROUP_IOS_SIMULATOR_WORKFLOW": "true"
  }
  // Rest of your MCP configuration
}
```

This provides all tools needed to:
1. Discover and analyse projects
2. Build for iOS simulators
3. Install and launch on simulators
4. Capture logs

### macOS Application Developer

For developers focussed on macOS application development:

```json
{
  // Rest of your MCP configuration
  "env": {
    "XCODEBUILDMCP_GROUP_PROJECT_DISCOVERY": "true",
    "XCODEBUILDMCP_GROUP_MACOS_WORKFLOW": "true"
  }
  // Rest of your MCP configuration
}
```

This provides all tools needed to:
1. Discover and analyse projects
2. Build for macOS
3. Launch macOS applications

### UI Automation Testing

For developers focussed on UI automation testing:

```json
{
  // Rest of your MCP configuration
  "env": {
    "XCODEBUILDMCP_GROUP_UI_TESTING": "true",
    "XCODEBUILDMCP_GROUP_SIMULATOR_MANAGEMENT": "true",
    "XCODEBUILDMCP_GROUP_APP_DEPLOYMENT": "true"
  }
  // Rest of your MCP configuration
}
```

This provides tools for:
1. Managing simulators
2. Installing and launching apps
3. Running UI automation tests

## Example Cursor/Windsurf Configuration

Here is a fully worked example of how to configure Cursor/Windsurf to use specific tool groups:

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
        "XCODEBUILDMCP_GROUP_PROJECT_DISCOVERY": "true",
        "XCODEBUILDMCP_GROUP_IOS_SIMULATOR_WORKFLOW": "true"
      }
    }
  }
}
```

This example configures the MCP client to only enable tools related to iOS simulator development.