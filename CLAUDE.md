# XcodeBuildMCP: Developer's Guide

This document provides an overview of the `xcodebuildmcp` project architecture for developers working with the source code.

## 1. Introduction

**XcodeBuildMCP** is a server that implements the **Model Context Protocol (MCP)**. It exposes command-line Apple development tools (like `xcodebuild`, `simctl`, `devicectl`, `axe`) as a structured, AI-friendly API. This allows language models and automated agents to perform complex development tasks such as building, testing, and interacting with Xcode projects, simulators, and physical devices.

## 2. Architecture Overview

The project is a Node.js application written in TypeScript with a plugin-based architecture. It uses the **Model Context Protocol SDK for TypeScript** to handle all MCP communication and protocol details.

### 2.1. Core Components

*   **Entry Point (`src/index.ts`):** Server initialization and startup
*   **Plugin Registry (`src/core/plugin-registry.ts`):** Automatic plugin discovery and loading
*   **Plugins (`plugins/`):** Tool implementations organized by workflow
*   **Utilities (`src/utils/`):** Shared functionality (command execution, validation, logging)
*   **Diagnostic CLI (`src/diagnostic-cli.ts`):** Standalone diagnostic tool

## 3. Plugin Architecture

The project uses a file-system-based plugin architecture where tools are automatically discovered and loaded.

### 3.1. Plugin Structure

Each plugin is a TypeScript file that exports a default object:

```typescript
// Example: plugins/simulator-workspace/boot_sim.ts
export default {
  name: 'boot_sim',
  description: 'Boots an iOS simulator by UUID',
  schema: {
    simulatorUuid: z.string().uuid(),
  },
  async handler(args: any) {
    // Implementation logic
    return { content: [...], isError: false };
  },
};
```

### 3.2. Plugin Directory Structure

```
plugins/
├── swift-package/           # Swift Package Manager tools
├── simulator-workspace/     # Simulator + Workspace workflows
├── simulator-project/       # Simulator + Project workflows  
├── device-workspace/        # Device + Workspace workflows
├── device-project/          # Device + Project workflows
├── macos-workspace/         # macOS + Workspace workflows
├── macos-project/           # macOS + Project workflows
├── ui-testing/              # UI automation tools
├── project-discovery/       # Project analysis tools
├── logging/                 # Log capture tools
├── utilities/               # General utilities
├── diagnostics/             # Diagnostic tools
└── discovery/               # Dynamic tool discovery
```

### 3.3. Workflow Groups

Each plugin directory represents a workflow group and must contain an `index.ts` file that defines the workflow metadata:

```typescript
// Example: plugins/simulator-workspace/index.ts
export const workflow = {
  name: "iOS Simulator + Workspace",
  description: "Complete iOS simulator workflow for Xcode workspace projects",
  platforms: ["iOS"],
  targets: ["simulator"],
  projectTypes: ["workspace"],
  capabilities: ["build", "test", "run", "debug", "ui-automation"]
};
```

The workflow metadata is used by:
- **Dynamic tool discovery**: The `discover_tools` plugin uses this to recommend appropriate workflows
- **Tool organization**: Groups related tools together logically
- **Documentation**: Provides context about what each workflow supports

### 3.4. Adding New Tools

1. **Create Plugin File:** Add a new `.ts` file in the appropriate `plugins/` subdirectory
2. **Export Plugin Object:** Include `name`, `description`, `schema`, and `handler`
3. **Add Tests:** Create corresponding `.test.ts` file
4. **Update index.ts:** Ensure the workflow metadata reflects any new capabilities
5. **Automatic Discovery:** No manual registration needed

## 4. Development Workflow

### 4.1. Building

*   **Build:** `npm run build`
*   **Watch Mode:** `npm run build:watch`

### 4.2. Code Quality Requirements

**STRICT REQUIREMENT**: All linting and build warnings/errors must always be fixed before committing code. No exceptions.

*   **Build:** `npm run build` - Must complete without errors
*   **Linting:** `npm run lint` - Must pass with zero warnings or errors
*   **Testing:** `npm test` - All tests must pass
*   **Coverage:** `npm run test:coverage` - For coverage analysis

### 4.3. Testing Standards

All plugins must have comprehensive test coverage that validates the complete contract and output. Tests must be **literal and deterministic** - no partial matchers or inferred behavior.

#### Test Structure Requirements

Each plugin test suite must validate:

1. **Export Field Validation (Literal)**
   - Test exact literal values for `name`, `description` 
   - Validate `handler` is a function
   - Test `schema` with known valid/invalid inputs using `.safeParse()`

```typescript
// ✅ CORRECT: Literal value testing
expect(tool.name).toBe('list_sims');
expect(tool.description).toBe('Lists available iOS simulators with their UUIDs.');
expect(typeof tool.handler).toBe('function');
expect(tool.schema.safeParse({ enabled: true }).success).toBe(true);
expect(tool.schema.safeParse({ enabled: 'yes' }).success).toBe(false);

// ❌ FORBIDDEN: Type checking without literal values
expect(typeof tool.name).toBe('string');
```

2. **Handler Behavior Testing (Complete Literal Returns)**
   - Test each code path with literal inputs
   - Assert entire return value using `toEqual()` with complete literal structure
   - Cover success, command failure, parse failure, and exception paths

```typescript
// ✅ CORRECT: Complete literal return testing
expect(result).toEqual({
  content: [
    {
      type: 'text',
      text: 'Available iOS Simulators:\n\n...',  // literal content
    },
  ],
});

// ❌ FORBIDDEN: Partial matchers
expect(result).toEqual(expect.objectContaining({
  content: expect.any(Array)
}));
```

#### Required Test Paths

* **Success Path**: Handler succeeds with fully populated return object
* **Command Failure**: Simulate failed command/operation with literal error message
* **Parse Failure**: Command succeeds but outputs unparseable data
* **Exception Path**: Handler throws exception, returns literal error structure

#### Forbidden Test Patterns

**DO NOT USE**: `expect.objectContaining()`, `expect.stringContaining()`, `expect.any()`, `expect.toMatch()`, `.toBeDefined()`, `.toBeTruthy()` without literal comparisons.

Tests must be strict, literal, and deterministic. If handler output changes, tests must fail.

### 4.4. Error Handling

*   **Return, Don't Throw:** Plugin handlers should catch errors and return `{ isError: true }`
*   **Use Utilities:** `createTextResponse()`, `createErrorResponse()` for consistent responses
*   **Resilience:** Prevent tool failures from crashing the entire server

## 5. Key Implementation Details

### 5.1. Command Execution

The `executeCommand()` utility in `src/utils/command.ts` handles all external command execution with proper error handling and logging.

### 5.2. Validation

The `src/utils/validation.ts` module provides utilities for parameter validation and file system checks.

### 5.3. State Management

Some tools maintain state for long-running processes:
*   **Log Capture:** Active sessions tracked in `src/utils/log_capture.ts`
*   **Swift Processes:** Background executables managed in Swift package tools

### 5.4. Error Types

Consistent error handling using:
*   `ValidationError`: Invalid parameters
*   `CommandError`: External command failures  
*   `SystemError`: File system or environment issues