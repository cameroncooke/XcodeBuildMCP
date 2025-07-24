# XcodeBuildMCP Architecture

## Table of Contents

1. [Overview](#overview)
2. [Core Architecture](#core-architecture)
3. [Design Principles](#design-principles)
4. [Component Details](#component-details)
5. [Registration System](#registration-system)
6. [Tool Naming Conventions & Glossary](#tool-naming-conventions--glossary)
7. [Testing Architecture](#testing-architecture)
8. [Build and Deployment](#build-and-deployment)
9. [Extension Guidelines](#extension-guidelines)
10. [Performance Considerations](#performance-considerations)
11. [Security Considerations](#security-considerations)

## Overview

XcodeBuildMCP is a Model Context Protocol (MCP) server that exposes Xcode operations as tools for AI assistants. The architecture emphasizes modularity, type safety, and selective enablement to support diverse development workflows.

### High-Level Objectives

- Expose Xcode-related tools (build, test, deploy, diagnostics, UI automation) through MCP
- Run as a long-lived stdio-based server for LLM agents, CLIs, or editors
- Enable fine-grained, opt-in activation of individual tools or tool groups
- Support incremental builds via experimental xcodemake with xcodebuild fallback

## Core Architecture

### Runtime Flow

1. **Initialization**
   - The `xcodebuildmcp` executable, as defined in `package.json`, points to the compiled `build/index.js` which executes the main logic from `src/index.ts`.
   - Sentry initialized for error tracking (optional)
   - Version information loaded from `package.json`

2. **Server Creation**
   - MCP server created with stdio transport
   - Plugin discovery system initialized

3. **Plugin Discovery & Loading**
   - `loadPlugins()` scans `src/mcp/tools/` directory automatically
   - `loadResources()` scans `src/mcp/resources/` directory automatically
   - Each tool exports standardized interface (`name`, `description`, `schema`, `handler`)
   - Tools are self-contained with no external dependencies
   - Dynamic vs static mode determines loading behavior

4. **Tool Registration**
   - Discovered tools automatically registered with server
   - No manual registration or configuration required
   - Environment variables can still control dynamic tool discovery

5. **Request Handling**
   - MCP client calls tool → server routes to tool handler
   - Zod validates parameters before execution
   - Tool handler uses shared utilities (build, simctl, etc.)
   - Returns standardized `ToolResponse`

6. **Response Streaming**
   - Server streams response back to client
   - Consistent error handling with `isError` flag

## Design Principles

### 1. **Plugin Autonomy**
Tools are self-contained units that export a standardized interface. They don't know about the server implementation, ensuring loose coupling and high testability.

### 2. **Pure Functions vs Stateful Components**
- Most utilities are stateless pure functions
- Stateful components (e.g., process tracking) isolated in specific tool modules
- Clear separation between computation and side effects

### 3. **Single Source of Truth**
- Version from `package.json` drives all version references
- Tool directory structure is authoritative tool source
- Environment variables provide consistent configuration interface

### 4. **Feature Isolation**
- Experimental features behind environment flags
- Optional dependencies (Sentry, xcodemake) gracefully degrade
- Tool directory structure enables workflow-specific organization

### 5. **Type Safety Throughout**
- TypeScript strict mode enabled
- Zod schemas for runtime validation
- Generic type constraints ensure compile-time safety

## Component Details

### Entry Points

#### `src/index.ts`
Main server entry point responsible for:
- Sentry initialization (if enabled)
- xcodemake availability check
- Server creation and startup
- Process lifecycle management (SIGTERM, SIGINT)
- Error handling and logging

#### `src/diagnostic-cli.ts`
Standalone diagnostic tool for:
- Environment validation
- Dependency checking
- Configuration verification
- Troubleshooting assistance

### Server Layer

#### `src/server/server.ts`
MCP server wrapper providing:
- Server instance creation
- stdio transport configuration
- Request/response handling
- Error boundary implementation

### Tool Discovery System

#### `src/core/plugin-registry.ts`
Automatic plugin loading system:
- Scans `src/mcp/tools/` directory structure using glob patterns
- Dynamically imports plugin modules
- Validates plugin interface compliance
- Handles both default exports and named exports (for re-exports)
- Supports workflow group metadata via `index.js` files

#### `src/core/plugin-types.ts`
Plugin type definitions:
- `PluginMeta` interface for plugin structure
- `WorkflowMeta` interface for workflow metadata
- `WorkflowGroup` interface for directory organization

### Tool Implementation

Each plugin (`src/mcp/tools/*/*.js`) follows this standardized pattern:

```javascript
// 1. Import dependencies and schemas
import { z } from 'zod';
import { log } from '../../src/utils/logger.js';
import { executeCommand } from '../../src/utils/command.js';

// 2. Define and export plugin
export default {
  name: 'tool_name',
  description: 'Tool description for AI agents',
  
  // 3. Define parameter schema
  schema: {
    requiredParam: z.string().describe('Description for AI'),
    optionalParam: z.string().optional().describe('Optional parameter')
  },
  
  // 4. Implement handler function
  async handler(params) {
    try {
      // 5. Execute tool logic using shared utilities
      const result = await executeCommand(['some', 'command']);
      
      // 6. Return standardized response
      return {
        content: [{ type: 'text', text: result.output }],
        isError: false
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};
```

### MCP Resources System

XcodeBuildMCP provides dual interfaces: traditional MCP tools and efficient MCP resources for supported clients. Resources are located in `src/mcp/resources/` and are automatically discovered. For more details on creating resources, see the [Plugin Development Guide](docs/PLUGIN_DEVELOPMENT.md).

#### Resource Architecture

```
src/mcp/resources/
├── simulators.ts           # Simulator data resource
└── __tests__/              # Resource-specific tests
```

#### Client Capability Detection

The system automatically detects client MCP capabilities:

```typescript
// src/core/resources.ts
export function supportsResources(server?: unknown): boolean {
  // Detects client capabilities via getClientCapabilities()
  // Conservative fallback: assumes resource support
}
```

#### Resource Implementation Pattern

Resources can reuse existing tool logic for consistency:

```typescript
// src/mcp/resources/some_resource.ts
import { log, getDefaultCommandExecutor, CommandExecutor } from '../../utils/index.js';
import { getSomeResourceLogic } from '../tools/some-workflow/get_some_resource.js';

// Testable resource logic separated from MCP handler
export async function someResourceResourceLogic(
  executor: CommandExecutor = getDefaultCommandExecutor(),
): Promise<{ contents: Array<{ text: string }> }> {
  try {
    log('info', 'Processing some resource request');

    const result = await getSomeResourceLogic({}, executor);

    if (result.isError) {
      const errorText = result.content[0]?.text;
      throw new Error(
        typeof errorText === 'string' ? errorText : 'Failed to retrieve some resource data',
      );
    }

    return {
      contents: [
        {
          text:
            typeof result.content[0]?.text === 'string'
              ? result.content[0].text
              : 'No data for that resource is available',
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error in some_resource resource handler: ${errorMessage}`);

    return {
      contents: [
        {
          text: `Error retrieving resource data: ${errorMessage}`,
        },
      ],
    };
  }
}

export default {
  uri: 'xcodebuildmcp://some_resource',
  name: 'some_resource',
  description: 'Returns some resource information',
  mimeType: 'text/plain',
  async handler(_uri: URL): Promise<{ contents: Array<{ text: string }> }> {
    return someResourceResourceLogic();
  },
};
```

## Registration System

XcodeBuildMCP supports two primary operating modes for tool registration, controlled by the `XCODEBUILDMCP_DYNAMIC_TOOLS` environment variable.

### Static Mode (Default)

- **Environment**: `XCODEBUILDMCP_DYNAMIC_TOOLS` is `false` or not set.
- **Behavior**: All available tools are loaded and registered with the MCP server at startup.
- **Use Case**: This mode is ideal for environments where the full suite of tools is desired immediately, providing a comprehensive and predictable toolset for the AI assistant.

### Dynamic Mode (AI-Powered Workflow Selection)

- **Environment**: `XCODEBUILDMCP_DYNAMIC_TOOLS=true`
- **Behavior**: At startup, only the `discover_tools` tool is registered. This tool is designed to analyze a natural language task description from the user.
- **Workflow**:
    1. The client sends a task description (e.g., "I want to build and test my iOS app") to the `discover_tools` tool.
    2. The tool uses the client's LLM via an MCP sampling request to determine the most relevant workflow group (e.g., `simulator-workspace`).
    3. The server then dynamically loads and registers all tools from the selected workflow group.
    4. The client is notified of the newly available tools.
- **Use Case**: This mode is beneficial for conserving the LLM's context window by only loading a relevant subset of tools, leading to more focused and efficient interactions.

## Tool Naming Conventions & Glossary

Tools follow a consistent naming pattern to ensure predictability and clarity. Understanding this convention is crucial for both using and developing tools.

### Naming Pattern

The standard naming convention for tools is:

`{action}_{target}_{specifier}_{projectType}`

- **action**: The primary verb describing the tool's function (e.g., `build`, `test`, `get`, `list`).
- **target**: The main subject of the action (e.g., `sim` for simulator, `dev` for device, `mac` for macOS).
- **specifier**: A variant that specifies *how* the target is identified (e.g., `id` for UUID, `name` for by-name).
- **projectType**: The type of Xcode project the tool operates on (e.g., `ws` for workspace, `proj` for project).

Not all parts are required for every tool. For example, `swift_package_build` has an action and a target, but no specifier or project type.

### Examples

- `build_sim_id_ws`: **Build** for a **simulator** identified by its **ID (UUID)** from a **workspace**.
- `test_dev_proj`: **Test** on a **device** from a **project**.
- `get_mac_app_path_ws`: **Get** the app path for a **macOS** application from a **workspace**.
- `list_sims`: **List** all **simulators**.

### Glossary

| Term/Abbreviation | Meaning | Description |
|---|---|---|
| `ws` | Workspace | Refers to an `.xcworkspace` file. Used for projects with multiple `.xcodeproj` files or dependencies managed by CocoaPods or SPM. |
| `proj` | Project | Refers to an `.xcodeproj` file. Used for single-project setups. |
| `sim` | Simulator | Refers to the iOS, watchOS, tvOS, or visionOS simulator. |
| `dev` | Device | Refers to a physical Apple device (iPhone, iPad, etc.). |
| `mac` | macOS | Refers to a native macOS application target. |
| `id` | Identifier | Refers to the unique identifier (UUID/UDID) of a simulator or device. |
| `name` | Name | Refers to the human-readable name of a simulator (e.g., "iPhone 15 Pro"). |
| `cap` | Capture | Used in logging tools, e.g., `start_sim_log_cap`. |

## Testing Architecture

### Framework and Configuration

- **Test Runner**: Vitest 3.x
- **Environment**: Node.js
- **Configuration**: `vitest.config.ts`
- **Test Pattern**: `*.test.ts` files alongside implementation

### Testing Principles

XcodeBuildMCP uses a strict **Dependency Injection (DI)** pattern for testing, which completely bans the use of traditional mocking libraries like Vitest's `vi.mock` or `vi.fn`. This ensures that tests are robust, maintainable, and verify the actual integration between components.

For detailed guidelines, see the [Testing Guide](docs/TESTING.md).

### Test Structure Example

Tests inject mock "executors" for external interactions like command-line execution or file system access. This allows for deterministic testing of tool logic without mocking the implementation itself.

```typescript
import { describe, it, expect } from 'vitest';
import { toolNameLogic } from '../tool-file.js'; // Import the logic function
import { createMockExecutor } from '../../../utils/test-common.js';

describe('Tool Name', () => {
  it('should execute successfully', async () => {
    // 1. Create a mock executor to simulate command-line results
    const mockExecutor = createMockExecutor({
      success: true,
      output: 'Command output'
    });

    // 2. Call the tool's logic function, injecting the mock executor
    const result = await toolNameLogic({ param: 'value' }, mockExecutor);
    
    // 3. Assert the final result
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Expected output' }],
      isError: false
    });
  });
});
```

## Build and Deployment

### Build Process

1. **Version Generation**
   ```bash
   npm run build
   ```
   - Reads version from `package.json`
   - Generates `src/version.ts`
   - Compiles TypeScript with tsup

2. **Build Configuration** (`tsup.config.ts`)
   - Entry points: `index.ts`, `diagnostic-cli.ts`
   - Output format: ESM
   - Target: Node 18+
   - Source maps enabled

3. **Distribution Structure**
   ```
   build/
   ├── index.js          # Main server executable
   ├── diagnostic-cli.js # Diagnostic tool
   └── *.js.map         # Source maps
   ```

### npm Package

- **Name**: `xcodebuildmcp`
- **Executables**:
  - `xcodebuildmcp` → Main server
  - `xcodebuildmcp-diagnostic` → Diagnostic tool
- **Dependencies**: Minimal runtime dependencies
- **Platform**: macOS only (due to Xcode requirement)

### Bundled Resources

```
bundled/
├── axe              # UI automation binary
└── Frameworks/      # Facebook device frameworks
    ├── FBControlCore.framework
    ├── FBDeviceControl.framework
    └── FBSimulatorControl.framework
```

## Extension Guidelines

This project is designed to be extensible. For comprehensive instructions on creating new tools, workflow groups, and resources, please refer to the dedicated [**Plugin Development Guide**](docs/PLUGIN_DEVELOPMENT.md).

The guide covers:
- The auto-discovery system architecture.
- The dependency injection pattern required for all new tools.
- How to organize tools into workflow groups.
- Testing guidelines and patterns.

## Performance Considerations

### Startup Performance

- **Lazy Loading**: Tools only initialized when registered
- **Selective Registration**: Fewer tools = faster startup
- **Minimal Dependencies**: Fast module resolution

### Runtime Performance

- **Stateless Operations**: Most tools complete quickly
- **Process Management**: Long-running processes tracked separately
- **Incremental Builds**: xcodemake provides significant speedup
- **Parallel Execution**: Tools can run concurrently

### Memory Management

- **Process Cleanup**: Proper process termination handling
- **Log Rotation**: Captured logs have size limits
- **Resource Disposal**: Explicit cleanup in lifecycle hooks

### Optimization Strategies

1. **Use Tool Groups**: Enable only needed workflows
2. **Enable Incremental Builds**: Set `INCREMENTAL_BUILDS_ENABLED=true`
3. **Limit Log Capture**: Use structured logging when possible
4. **Profile Performance**: Use diagnostic tool for bottleneck identification

## Security Considerations

### Input Validation

- All tool inputs validated with Zod schemas
- Command injection prevented via proper escaping
- Path traversal protection in file operations

### Process Isolation

- Tools run with user permissions
- No privilege escalation
- Sandboxed execution environment

### Error Handling

- Sensitive information scrubbed from errors
- Stack traces limited to application code
- Sentry integration respects privacy settings
