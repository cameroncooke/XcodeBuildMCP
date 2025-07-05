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

**CRITICAL RULE - NEVER IGNORE**: Before claiming any work is complete, you MUST run `npm test` and verify that:
1. **ALL TESTS PASS** - Zero failing tests
2. **NO STDERR OUTPUT** - No log outputs, warnings, or errors during test execution
3. **CLEAN TEST EXECUTION** - Tests run silently without any debugging output

**IF TESTS FAIL OR PRODUCE OUTPUT**: You MUST fix all issues before proceeding. This is non-negotiable and overrides all other priorities. Test failures indicate broken functionality that must be addressed immediately.

### 4.3. Testing Standards

All plugins must have comprehensive integration test coverage that validates both the command generation logic and response formatting logic. Tests must be **literal and deterministic** using proper mocking at the lowest system level.

#### Testing Workflow

**MANDATORY**: Follow this workflow when writing or updating plugin tests:

1. **Write Integration Tests**: Create tests using the patterns below
2. **Run Code Coverage**: Execute `npm run test:coverage -- plugins/[directory]/` 
3. **Validate Coverage**: Ensure **all plugin logic paths are covered** (aim for 95%+ coverage)
4. **Fix Missing Coverage**: Add tests for uncovered branches, error paths, and parameter combinations
5. **Verify Real Code Execution**: Check that tests actually execute plugin logic (not just mocks)

**Coverage validates that tests are testing actual plugin code, not just mock responses.**

#### Integration Testing Approach

Tests should mock at the **lowest system level** (`child_process.spawn`) while allowing all plugin logic to execute:
- Parameter validation
- Argument building
- Path resolution
- Response formatting
- Error handling

**DO NOT** mock high-level utilities like `executeCommand` as this prevents testing the actual plugin logic.

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
```

2. **Command Generation Testing**
   - Mock `child_process.spawn` to capture what CLI commands get built
   - Test different parameter combinations to verify correct command construction
   - **CRITICAL**: Use literal strings in expectations, never computed strings or template literals

```typescript
// ✅ CORRECT: Command generation testing with literal strings
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
}

const mockProcess = new MockChildProcess();
mockSpawn.mockReturnValue(mockProcess);

await tool.handler({ packagePath: '/test/package' });

expect(mockSpawn).toHaveBeenCalledWith(
  'sh',
  ['-c', 'swift build --package-path /test/package'],  // ✅ Literal string
  expect.any(Object)
);

// ❌ FORBIDDEN: Computed or template strings
expect(mockSpawn).toHaveBeenCalledWith(
  'sh',
  ['-c', `swift build --package-path ${process.cwd()}/test/package`],  // ❌ Template literal
  expect.any(Object)
);
```

3. **Response Logic Testing**
   - Test different command result scenarios (success, failure, error)
   - **CRITICAL**: Assert complete response objects with literal text content
   - **CRITICAL**: Use exact error message formats from utility functions

```typescript
// ✅ CORRECT: Response logic testing with literal content
setTimeout(() => {
  mockProcess.stdout.emit('data', 'Build succeeded');
  mockProcess.emit('close', 0);
}, 0);

const result = await tool.handler({ packagePath: '/test/package' });

expect(result).toEqual({
  content: [
    { type: 'text', text: '✅ Swift package build succeeded.' },  // ✅ Literal string
    { type: 'text', text: 'Build succeeded' },  // ✅ Literal string
  ],
  isError: false,
});

// ✅ CORRECT: Error response format (from createErrorResponse)
expect(result).toEqual({
  content: [{
    type: 'text',
    text: 'Error: Swift package build failed\nDetails: Compilation error'  // ✅ Literal with actual format
  }],
  isError: true
});

// ❌ FORBIDDEN: Computed or simplified error messages
expect(result).toEqual({
  content: [{
    type: 'text',
    text: 'Swift package build failed: Compilation error'  // ❌ Wrong format
  }],
  isError: true
});
```

#### Required Test Paths

* **Validation Errors**: Invalid parameters return literal error responses
* **Command Generation**: Different parameters produce different CLI commands
* **Success Responses**: Successful command execution with literal output
* **Command Failures**: Failed commands (non-zero exit codes) with error responses
* **Process Errors**: Spawn errors with appropriate error handling

#### Forbidden Test Patterns

**DO NOT USE**: 
- `expect.objectContaining()`, `expect.stringContaining()`, `expect.any()` for response content
- Mocking `executeCommand` or other high-level utilities
- Partial matchers for response validation
- **Template literals or computed strings in expectations** (e.g., `${process.cwd()}/path`)
- **Dynamic path construction in test expectations**
- **Simplified error message formats that don't match actual utility output**

**DO USE**:
- `expect.toEqual()` with complete literal response objects
- Mock only `child_process.spawn` at the lowest level
- **Exact literal strings in all command and response expectations**
- **Actual error message formats from `createErrorResponse()` and `createTextResponse()`**
- **Literal command strings that match exact plugin output**

#### Literal String Requirements

**CRITICAL**: All test expectations must use literal strings to ensure tests fail when plugin behavior changes:

```typescript
// ✅ CORRECT: Literal strings
expect(mockSpawn).toHaveBeenCalledWith('sh', ['-c', 'swift build --package-path /test/package'], expect.any(Object));
expect(result.content[0].text).toBe('✅ Swift package build succeeded.');
expect(result.content[0].text).toBe('Error: Build failed\nDetails: Compilation error');

// ❌ FORBIDDEN: Template literals, computed strings, or dynamic construction
expect(mockSpawn).toHaveBeenCalledWith('sh', ['-c', `swift build --package-path ${someVariable}/package`], expect.any(Object));
expect(result.content[0].text).toBe(`${successMessage} completed.`);
expect(result.content[0].text).toContain('Build failed');
```

#### Common Error Response Formats

Tests must use the exact error formats produced by utility functions:

**`createErrorResponse(message, details)`** produces:
```typescript
{
  content: [{ type: 'text', text: 'Error: ${message}\nDetails: ${details}' }],
  isError: true
}
```

**`createTextResponse(message, true)`** produces:
```typescript
{
  content: [{ type: 'text', text: '${message}' }],
  isError: true
}
```

**`validateRequiredParam()`** produces:
```typescript
{
  content: [{ type: 'text', text: "Required parameter 'paramName' is missing. Please provide a value for this parameter." }],
  isError: true
}
```

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