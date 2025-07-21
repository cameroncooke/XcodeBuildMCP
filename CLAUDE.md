# XcodeBuildMCP: Developer's Guide

This document provides an overview of the `xcodebuildmcp` project architecture for developers working with the source code.

## 📋 Quick Reference

**IMPORTANT**: Before working with tests, read the comprehensive @docs/TESTING.md which covers:
- Integration testing philosophy  
- Three-dimensional testing strategy (Input validation, Command generation, Output processing)
- Mock strategies and patterns
- Performance requirements
- Coverage standards

The testing guidelines are essential for understanding our no-mocks architecture and ensuring proper test implementation.

## 1. Introduction

**XcodeBuildMCP** is a server that implements the **Model Context Protocol (MCP)**. It exposes command-line Apple development tools (like `xcodebuild`, `simctl`, `devicectl`, `axe`) as a structured, AI-friendly API. This allows language models and automated agents to perform complex development tasks such as building, testing, and interacting with Xcode projects, simulators, and physical devices.

## 2. Architecture Overview

The project is a Node.js application written in TypeScript with a plugin-based architecture. It uses the **Model Context Protocol SDK for TypeScript** to handle all MCP communication and protocol details.

### 2.1. Core Components

*   **Entry Point (`src/index.ts`):** Server initialization and startup
*   **Plugin Registry (`src/core/plugin-registry.ts`):** Automatic plugin discovery and loading
*   **Plugins (`src/plugins/`):** Tool implementations organized by workflow
*   **Utilities (`src/utils/`):** Shared functionality (command execution, validation, logging)
*   **Diagnostic CLI (`src/diagnostic-cli.ts`):** Standalone diagnostic tool

## 3. Plugin Architecture

The project uses a file-system-based plugin architecture where tools are automatically discovered and loaded.

### 3.1. Plugin Structure

Each plugin is a TypeScript file that exports a default object:

```typescript
// Example: src/plugins/simulator-workspace/build_sim_name_ws.ts
export default {
  name: 'build_sim_name_ws',
  description: 'Builds an iOS simulator app from workspace',
  schema: {
    workspacePath: z.string().describe('Path to .xcworkspace file'),
    scheme: z.string().describe('Scheme to build'),
    simulatorName: z.string().describe('Simulator name'),
  },
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return build_sim_name_wsLogic(args, getDefaultCommandExecutor());
  },
};
```

### 3.2. Plugin Directory Structure

```
src/plugins/
├── swift-package/           # Swift Package Manager tools
├── simulator-workspace/     # Simulator + Workspace workflows
├── simulator-project/       # Simulator + Project workflows  
├── simulator-shared/        # Shared simulator tools
├── device-workspace/        # Device + Workspace workflows
├── device-project/          # Device + Project workflows
├── device-shared/           # Shared device tools
├── macos-workspace/         # macOS + Workspace workflows
├── macos-project/           # macOS + Project workflows
├── macos-shared/            # Shared macOS tools
├── ui-testing/              # UI automation tools
├── project-discovery/       # Project analysis tools
├── logging/                 # Log capture tools
├── utilities/               # General utilities
├── diagnostics/             # Diagnostic tools
└── discovery/               # Dynamic tool discovery
```

### 3.2.1. Plugin Architecture Principles

Plugin groups in `src/plugins/` represent specialized workflows for Apple platform development:

- **Project vs Workspace Separation**: Each plugin group may have variants like project (`_proj`) or workspace (`_ws`) tools, distinguished by file extensions. Project and workspace tools should NEVER be mixed.
- **DRY Implementation**: Underlying tool handlers are shared, but tool interfaces remain unique for better agent tool discovery. Internal shared functions should accept both workspace and project paths to keep code DRY (Don't Repeat Yourself).
- **Canonical Tool Location**: Some tools are canonical and live in shared groups, e.g., `boot_sim` in `simulator-shared` is re-exported to both `simulator-project` and `simulator-workspace`.
- **Re-export Rules**: 
  - Re-exported tools should come from canonical workflow groups (e.g., `discover_projs` from `project-discovery`)
  - Re-exports should not be derived from other re-exports
  - Workspace or project group tools should only re-export from canonical groups
  - Each tool should maintain specificity to either Xcode projects or workspaces

### 3.3. Workflow Groups

Plugin workflow groups are ultimately exposed as long as they have an `index.ts` file to the MCP server as workflows - groups of tools that are linked under a particular workflow theme (e.g., building on the simulator).

Each plugin directory represents a workflow group and must contain an `index.ts` file that defines the workflow metadata:

```typescript
// Example: src/plugins/simulator-workspace/index.ts
export const workflow = {
  name: "iOS Simulator Workspace Development",
  description: "Complete iOS development workflow for .xcworkspace files including build, test, deploy, and debug capabilities",
  platforms: ["iOS"],
  targets: ["simulator"],
  projectTypes: ["workspace"],
  capabilities: ["build", "test", "deploy", "debug", "ui-automation", "log-capture"]
};
```

**End-to-End Workflow Design**: These workflows should be end-to-end, representing complete themes like:
- Building apps on the simulator
- Building apps on device 
- UI automation
- Project discovery

Tools within a workflow should provide complete functionality without external dependencies. Workflows should include all necessary tools for a complete end-to-end process (e.g., build tools, scheme listing, installation tools). There's no point having just the build tool if you've got no way of getting the list of schemes or being able to install it on the simulator.

The workflow metadata is used by:
- **Dynamic tool discovery**: The `discover_tools` plugin uses this to recommend appropriate workflows
- **Tool organization**: Groups related tools together logically
- **Documentation**: Provides context about what each workflow supports

### 3.4. Adding New Tools

1. **Create Plugin File:** Add a new `.ts` file in the appropriate `src/plugins/` subdirectory
2. **Export Plugin Object:** Include `name`, `description`, `schema`, and `handler`
3. **Add Tests:** Create corresponding `.test.ts` file in the `__tests__/` folder
4. **Update Workflow:** Ensure the workflow metadata in `index.ts` reflects any new capabilities
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

**CRITICAL RULE**: Before claiming any work is complete, you MUST run `npm test` and verify that all tests pass with clean execution (no stderr output).

### 4.3. Testing Standards

#### CRITICAL: Vitest Mocking Ban

**🚨 ABSOLUTE RULE: ALL VITEST MOCKING IS COMPLETELY BANNED 🚨**

**FORBIDDEN PATTERNS (will cause immediate test failure):**
- `vi.mock()` - BANNED
- `vi.fn()` - BANNED  
- `vi.mocked()` - BANNED
- `vi.spyOn()` - BANNED
- `.mockResolvedValue()` - BANNED
- `.mockRejectedValue()` - BANNED
- `.mockReturnValue()` - BANNED
- `.mockImplementation()` - BANNED
- `.toHaveBeenCalled()` - BANNED
- `.toHaveBeenCalledWith()` - BANNED
- `MockedFunction` type - BANNED
- Any `mock*` variables - BANNED

**ONLY ALLOWED MOCKING:**
- `createMockExecutor({ success: true, output: 'result' })` - command execution
- `createMockFileSystemExecutor({ readFile: async () => 'content' })` - file system operations

**Rationale:** Vitest mocking defeats the purpose of dependency injection architecture. With proper dependency injection, you pass real implementations or clean mock implementations - no vitest mocking needed.

**Example - CORRECT:**
```typescript
const mockExecutor = createMockExecutor({
  success: true,
  output: 'BUILD SUCCEEDED'
});

const result = await toolNameLogic(params, mockExecutor);
```

**Example - FORBIDDEN:**
```typescript
const mockExecutor = vi.fn().mockResolvedValue({ success: true }); // BANNED
```

#### Sub-Agent Orchestration Workflow

**CRITICAL PROCESS for fixing vitest mocking violations:**

1. **Main Agent Coordination:**
   - Run `scripts/find-timeout-tests.js` to identify all violating files
   - Launch 5 parallel sub-agents, each assigned a unique test file
   - Coordinate work to prevent conflicts

2. **Sub-Agent Responsibilities:**
   - Convert ONE assigned test file to pure dependency injection
   - Remove ALL vitest mocking patterns (vi.mock, vi.fn, .mockResolvedValue, etc.)
   - Use ONLY createMockExecutor() and createMockFileSystemExecutor()
   - Update plugin implementation if needed to accept executor parameter

3. **Validation Process:**
   - Sub-agent reports completion
   - Main agent validates by running specific test: `npm test -- file.test.ts`
   - If test fails: Sub-agent fixes and re-submits
   - If test passes: Main agent re-runs `scripts/find-timeout-tests.js` to confirm compliance

4. **Selective Commit:**
   - Only when test passes AND script confirms compliance
   - Commit ONLY the validated file: `git add specific-file.test.ts && git commit`
   - This prevents committing other sub-agents' incomplete work

5. **Iteration:**
   - Continue until all 97 violating files are fixed
   - Each sub-agent works on next available file
   - Maintain parallel execution for efficiency

#### Test Organization

**Directory Structure:** Plugin groups use `__tests__/` subdirectories containing:
- **Tool Tests:** One `.test.ts` file per plugin tool (e.g., `build_sim_proj.test.ts`)
- **Workflow Tests:** `index.test.ts` file for canonical workflow groups testing workflow metadata
- **Re-export Tests:** `re-exports.test.ts` file for project/workspace groups testing re-exported tools

#### What to Test

Each plugin test must validate:

1. **Plugin Structure**
   - Export object has required fields (`name`, `description`, `schema`, `handler`)
   - Schema validates parameters correctly

2. **Command Generation**  
   - Different parameters produce correct CLI commands
   - Path resolution and argument building work properly

3. **Response Handling**
   - Success scenarios return proper response format
   - Error scenarios return proper error responses
   - Command failures are handled appropriately

#### Testing Approach

**Mock at System Level:** Mock `child_process.spawn` while allowing all plugin logic to execute. This tests actual parameter validation, command building, and response formatting.

**Use Literal Expectations:** All test assertions must use exact literal strings to ensure tests fail when behavior changes.

```typescript
// ✅ CORRECT: Test with literal strings
expect(mockSpawn).toHaveBeenCalledWith('sh', ['-c', 'swift build --package-path /test'], expect.any(Object));

// ❌ FORBIDDEN: Dynamic or computed strings  
expect(mockSpawn).toHaveBeenCalledWith('sh', ['-c', `swift build --package-path ${path}`], expect.any(Object));
```

**Test Coverage:** Aim for 95%+ coverage. Run `npm run test:coverage -- src/plugins/[directory]/` to validate coverage.

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