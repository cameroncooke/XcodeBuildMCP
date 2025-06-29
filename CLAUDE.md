# XcodeBuildMCP: Developer's Guide (v2)

This document provides a comprehensive overview of the `xcodebuildmcp` project, its architecture, key concepts, and development workflows. It is intended for developers looking to understand, maintain, or extend the project.

## 1. Introduction

**XcodeBuildMCP** is a server that implements the **Model Context Protocol (MCP)**. Its primary purpose is to expose command-line Apple development tools (like `xcodebuild`, `simctl`, `devicectl`, `axe`) as a structured, AI-friendly API. This allows language models and other automated agents to perform complex development tasks such as building, testing, and interacting with Xcode projects, simulators, and physical devices.

At its core, it is a bridge between the shell-based world of Apple development and the structured, tool-based world of modern AI agents.

## 2. Architecture Overview

The project is a Node.js application written in TypeScript. It follows a modular, layered architecture designed for clarity and extensibility.

### 2.1. Model Context Protocol (MCP)

This project is built on the Model Context Protocol. A solid understanding of its principles is crucial.

*   **Specification:** The official documentation and specification can be found at: **[modelcontextprotocol.io](https://modelcontextprotocol.io/)**
*   **Core Principles:**
    *   **Stateless by Design:** The protocol itself is stateless. Each client request is independent, though the server implementation can maintain its own state (e.g., for background processes).
    *   **Message Format:** It uses a simple JSON-based request/response format (e.g., `CallTool` -> `CallToolResult`). It is most analogous to a simplified **JSON-RPC**.
    *   **Key Operations:** The protocol's main functions are tool discovery (`ListTools`) and tool execution (`CallTool`).

### 2.2. Transport Layer

The server is designed to run as a managed child process of a client agent.

*   **`StdioServerTransport`:** The primary transport layer uses `stdin` for receiving requests and `stdout` for sending responses. This is a secure and efficient model for local AI agents that need to manage the lifecycle of their tool servers.
*   **Other Transports:** The underlying MCP SDK is transport-agnostic. While not currently implemented, the server could be adapted to use other transports like HTTP or WebSockets for different deployment scenarios.

### 2.3. State Management

The server follows a "filesystem as the source of truth" philosophy to remain robust and largely stateless.

*   **Filesystem State:** When a tool creates an artifact (e.g., a `Makefile` from `xcodemake` or a `.app` bundle from a build), the server does not store this information in memory. Subsequent tool calls will re-inspect the filesystem to determine the current state. This makes the server resilient to restarts.
*   **In-Memory State (Exceptions):** The only state held in memory is for managing the lifecycle of **active, long-running processes**. This includes:
    *   **Log Capture Sessions:** Maps in `src/utils/log_capture.ts` and `src/utils/device_log.ts` track active `ChildProcess` instances so they can be terminated later.
    *   **Background Swift Processes:** A map in `src/tools/run-swift-package.ts` tracks background executables.

### 2.4. Core Components

*   **Entry Point (`src/index.ts`):** Initializes the environment, creates the server, registers tools, and starts the `StdioServerTransport` listener.
*   **Server (`src/server/server.ts`):** Configures the `McpServer` instance with its identity and capabilities.
*   **Tool Registration (`src/utils/register-tools.ts`):** The central hub that imports all tools and registers them based on the configuration derived from environment variables.
*   **Tool Groups (`src/utils/tool-groups.ts`):** Defines logical groupings of tools (e.g., `IOS_SIMULATOR_WORKFLOW`) to allow for easy activation of entire workflows.
*   **Tools (`src/tools/`):** Contains the implementation of each tool, defining its schema and handler logic.
*   **Utilities (`src/utils/`):** Provides reusable, lower-level functionality (command execution, validation, logging, etc.).
*   **Types (`src/types/`):** Contains shared TypeScript interfaces and enums.
*   **Diagnostic CLI (`src/diagnostic-cli.ts`):** A standalone entry point for a powerful diagnostic tool.

## 3. Key Features & Concepts

### 3.1. Selective Tool Enablement

The server supports enabling tools selectively via environment variables.

*   **By Group:** `export XCODEBUILDMCP_GROUP_IOS_SIMULATOR_WORKFLOW=true`
*   **By Individual Tool:** `export XCODEBUILDMCP_TOOL_LIST_SIMULATORS=true`
*   **Default:** If no `XCODEBUILDMCP_*` variables are set, **all tools are enabled**.

### 3.2. Incremental Builds with `xcodemake`

To accelerate build times, the server can use `xcodemake`.

*   **Activation:** Set `export INCREMENTAL_BUILDS_ENABLED=1`.
*   **Provenance:** If `xcodemake` is not found in the system's `PATH`, the server will attempt to download it from the official repository: `https://raw.githubusercontent.com/cameroncooke/xcodemake/main/xcodemake`. For secure environments, it's recommended to install `xcodemake` manually for review.
*   **Logic:** `build-utils.ts` orchestrates its use, falling back to `xcodebuild` if needed.

### 3.3. UI Automation with `axe`

The project bundles a pre-compiled `axe` binary for UI automation in the iOS Simulator.

*   **Source:** The binary is a pre-compiled release from the `cameroncooke/axe` repository. It is **not** built from source by this project.
*   **Updates:** The binary is updated by running `npm run bundle:axe`, which downloads the latest specified release and places it in the `/bundled` directory, which is then published with the npm package.

### 3.4. Project Scaffolding

The `scaffold_*` tools create new Xcode projects from versioned templates.

*   **Template Versioning:** The `iOSTemplateVersion` and `macOSTemplateVersion` in `package.json` pin the exact Git tag of the template to use. This ensures that a specific version of `xcodebuildmcp` always produces the same project structure, guaranteeing stability and reproducibility.
*   **Source:** `template-manager.ts` handles fetching these templates from the appropriate GitHub release.

## 4. Development Workflow

### 4.1. Prerequisites

*   Node.js (v18 or higher)
*   npm
*   **Xcode 15+** (recommended for full functionality, especially `devicectl` tools)
*   **macOS Sonoma 14.0+** (recommended)
*   Xcode Command Line Tools matching the active Xcode version.

### 4.2. Setup

1.  Clone the repository: `git clone https://github.com/cameroncooke/XcodeBuildMCP.git`
2.  Install dependencies: `npm install`

### 4.3. Building

*   **Full Build:** `npm run build`
*   **Watch Mode:** `npm run build:watch`

### 4.4. Running & Debugging

*   **Run with MCP Inspector:** The recommended method for development is `npm run inspect`. This uses `@modelcontextprotocol/inspector`, a separate open-source GUI tool, to launch and interact with your local server.
*   **VS Code Debugging:** Use the "Attach to MCP Server Dev" launch configuration to attach a debugger to the server process started by the inspector.

### 4.5. Linting and Formatting

*   `npm run lint`: Check for linting errors.
*   `npm run lint:fix`: Automatically fix linting errors.
*   `npm run format`: Format all code with Prettier.

### 4.6. Error Handling Best Practices

The server must be resilient to tool failures (e.g., a build error).

*   **Return, Don't Throw:** A tool handler should **always** catch its own internal errors and return a `ToolResponse` with `isError: true`. The `createTextResponse(message, true)` and `createErrorResponse(...)` utilities are designed for this.
*   **Rationale:** This prevents a predictable failure in one tool from crashing the entire server process, allowing the client to continue issuing other commands.
*   **When to Throw:** Exceptions should only be thrown for unrecoverable programmer errors that should halt the application. These are caught by the top-level `try...catch` in `index.ts`.

### 4.7. Adding a New Tool

1.  **Philosophy:** Decide on the tool's granularity. The primary goal is to provide **composable, granular primitives** (e.g., `boot_sim`, `install_app_sim`). For very common sequences, a higher-level workflow tool (e.g., `build_run_sim_name_ws`) can be added for convenience.
2.  **Create:** Create a new file in `src/tools/`.
3.  **Implement:**
    *   Define a Zod schema for the tool's parameters.
    *   Create a registration function that calls `registerTool`.
    *   Implement the async handler, using utilities from `src/utils/` and adhering to the "Return, Don't Throw" error handling principle.
4.  **Register:**
    *   Open `src/utils/register-tools.ts`.
    *   Import your new registration function.
    *   Add a new entry to the `toolRegistrations` array, specifying the `register` function, a unique `envVar` name, and the `ToolGroup`(s) it belongs to.

## 5. Testing

### 5.1. Automated Test Strategy (Vision)

Establishing a robust automated test suite is the highest priority for improving project health. The strategy is tiered:

1.  **Unit Tests (Highest Priority):**
    *   **Target:** Utility modules in `src/utils/`.
    *   **Method:** Use **Vitest** or **Jest** to test pure functions (`validation.ts`, `tool-groups.ts`, `xcode.ts`) by providing various inputs and asserting on the outputs. Mock external dependencies like `fs` and `child_process`.

2.  **Integration Tests (Medium Priority):**
    *   **Target:** Individual tool handlers in `src/tools/`.
    *   **Method:** For each tool, write tests that call its handler. **Mock the `executeCommand` function** to assert that the tool constructs the *correct shell command* based on its inputs. This verifies the tool's logic without the overhead of running real builds.

3.  **End-to-End (E2E) Tests (Essential for Releases):**
    *   **Target:** A small, critical set of user workflows.
    *   **Method:** Create a minimal, real Xcode project fixture. An E2E test script would then start the server and use a simple client to execute a sequence of commands (e.g., build -> get path -> launch) and assert on the results.

### 5.2. Manual Test Plan

Until the automated suite is implemented, the following critical user journeys should be manually verified before any release, primarily using the MCP Inspector (`npm run inspect`):

*   **macOS Workflow:**
    1.  `discover_projs` -> `list_schems_ws` -> `build_mac_ws` -> `get_mac_app_path_ws` -> `launch_mac_app`.
*   **iOS Simulator Workflow:**
    1.  `list_sims` -> `build_run_sim_name_ws` -> `screenshot` -> `describe_ui` -> `tap`.
    2.  Test log capture: `start_sim_log_cap` and `stop_sim_log_cap`.
*   **Scaffolding Workflow:**
    1.  `scaffold_ios_project` into a new directory.
    2.  Verify the scaffolded project builds successfully with `build_sim_name_ws`.
*   **Diagnostic Tool:**
    1.  Run `npm run diagnostic` and review the output for correctness.

## 6. Configuration via Environment Variables

*   `XCODEBUILDMCP_DEBUG=true`: Enables debug logging and registers the `diagnostic` tool.
*   `INCREMENTAL_BUILDS_ENABLED=1`: Enables `xcodemake`.
*   `SENTRY_DISABLED=true`: Disables error reporting to Sentry.
*   `XCODEBUILDMCP_GROUP_*=true`: Enables a group of tools.
*   `XCODEBUILDMCP_TOOL_*=true`: Enables an individual tool.
*   `XCODEBUILDMCP_*_TEMPLATE_PATH`: Overrides scaffolding templates with a local path.

**Configuration Precedence:** The logic for enabling tools is **additive**. If a tool is enabled individually OR if any of its parent groups are enabled, it will be registered. There is no mechanism to "disable" a tool within an enabled group; for that level of control, you must enable tools individually.

## 7. Plugin Architecture Migration (v2.0.0)

The project is undergoing a major architectural shift from a monolithic tool registration system to a dynamic, file-system-based plugin architecture. This migration is documented extensively to ensure a smooth transition.

### 7.1. Migration Documentation

*   **Master Plan:** `PLUGIN_MIGRATION_PLAN.md` - The comprehensive migration strategy and test plan
*   **Migration Template:** `docs/MIGRATION_PLAN_TEMPLATE.md` - Generic template for migrating individual tools
*   **Shared Tools Strategy:** `docs/SHARED_TOOLS_STRATEGY.md` - How to handle tools that need to be available in multiple plugin directories
*   **Re-export Requirements:** `docs/TOOLS_REQUIRING_REEXPORT.md` - List of 22 tools that need re-exports
*   **Migration Status:** `docs/MIGRATION_STATUS_V2.md` - Current progress tracking

### 7.2. Key Migration Concepts

#### Surgical Edits Pattern
The migration uses a "surgical edit" approach to minimize changes and maintain stability:
1. Extract 4 exports from each tool (name, description, schema, handler)
2. Update the registration call to use the extracted exports
3. Create plugin wrapper that imports and re-exports these components
4. Original logic remains untouched, ensuring zero functional changes

#### Re-export Pattern
Some tools need to be available in multiple plugin directories (e.g., simulator tools in both `simulator-workspace/` and `simulator-project/`):
```javascript
// Primary implementation in simulator-workspace/
export default {
  name: toolName,
  description: toolDescription,
  schema: toolSchema,
  handler: toolHandler,
};

// Re-export in simulator-project/
export { default } from '../simulator-workspace/tool_name.js';
```

### 7.3. Plugin Directory Structure

```
plugins/
├── swift-package/           # Swift Package Manager tools (6 tools)
├── simulator-workspace/     # Simulator + Workspace tools (12 primary + re-exports)
├── simulator-project/       # Simulator + Project tools (12 re-exports)
├── device-workspace/        # Device + Workspace tools (4 primary + re-exports)
├── device-project/          # Device + Project tools (4 re-exports)
├── macos-workspace/         # macOS + Workspace tools (6 primary + re-exports)
├── macos-project/           # macOS + Project tools (6 re-exports)
├── simulator-utilities/     # Simulator management tools (16 tools)
├── ui-testing/              # UI automation tools (11 tools)
├── project-discovery/       # Project analysis tools (7 tools)
├── logging/                 # Log capture tools (4 tools)
├── utilities/               # General utilities (4 tools)
├── diagnostics/             # Diagnostic tools (1 tool)
└── discovery/               # Dynamic tool discovery (1 new tool)
```

### 7.4. Migration Guidelines

1. **Work One Tool at a Time:** Never migrate multiple tools simultaneously
2. **Test at Each Step:** Run `npm test` after each tool migration
3. **Validate Immediately:** Ensure both original and plugin tests pass
4. **Commit by Workflow Group:** Group related tools in commits
5. **Maintain Zero Regressions:** All 404 original tests must continue passing

### 7.5. Adding Tools Post-Migration

Once migration is complete, adding new tools becomes simpler:
1. Create a plugin file in the appropriate `plugins/` subdirectory
2. Export default object with `name`, `description`, `schema`, and `handler`
3. Add tests alongside the plugin
4. Tools are automatically discovered - no registration needed

## 8. Deployment

XcodeBuildMCP is distributed as an npm package.

1.  **Update Version:** Increment `version`, `iOSTemplateVersion`, and `macOSTemplateVersion` in `package.json` as needed.
2.  **Build:** Run `npm run build`.
3.  **Publish:** Run `npm publish`.