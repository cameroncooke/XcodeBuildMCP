# XcodeBuildMCP Architecture

## Table of Contents

1. [Overview](#overview)
2. [Core Architecture](#core-architecture)
3. [Design Principles](#design-principles)
4. [Component Details](#component-details)
5. [Tool Organization](#tool-organization)
6. [Registration System](#registration-system)
7. [Testing Architecture](#testing-architecture)
8. [Build and Deployment](#build-and-deployment)
9. [Extension Guidelines](#extension-guidelines)
10. [Performance Considerations](#performance-considerations)

## Overview

XcodeBuildMCP is a Model Context Protocol (MCP) server that exposes Xcode operations as tools for AI assistants. The architecture emphasizes modularity, type safety, and selective enablement to support diverse development workflows.

### High-Level Objectives

- Expose Xcode-related tools (build, test, deploy, diagnostics, UI automation) through MCP
- Run as a long-lived stdio-based server for LLM agents, CLIs, or editors
- Enable fine-grained, opt-in activation of individual tools or tool groups
- Support incremental builds via experimental xcodemake with xcodebuild fallback

## Core Architecture

### Layered Architecture Diagram

```
┌────────────────────────────────────────────────────────────┐
│            Presentation / Transport Layer                   │
│  • src/server/server.ts  – MCP server creation & transport │
│  • src/index.ts          – process entry, Sentry boot,     │
│                            plugin loading, lifecycle        │
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│            Plugin Discovery & Registration Layer           │
│  • src/core/plugin-registry.ts  – automatic plugin loading │
│  • src/core/plugin-types.ts     – plugin type definitions  │
│  • plugins/**/                  – self-contained plugins    │
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│                   Plugin Implementation Layer              │
│  • plugins/**/**.js – one file per tool capability         │
│  • Common patterns:                                         │
│      – Standardized plugin exports (name, schema, handler) │
│      – Zod schemas for param validation                    │
│      – Uniform ToolResponse payloads                       │
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│                     Shared Utilities Layer                 │
│  • src/utils/build-utils.ts        – Xcode build runner    │
│  • src/utils/xcodemake.ts          – incremental build     │
│  • src/utils/logger.ts / sentry.ts – logging & telemetry   │
│  • src/utils/validation.ts         – response helpers      │
│  • src/utils/command.ts            – shell execution       │
└────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────┐
│                   Domain Model / Types Layer               │
│  • src/types/common.ts   – enums, shared interfaces        │
│  • src/tools/common.ts   – reusable Zod schemas            │
└────────────────────────────────────────────────────────────┘
```

### Runtime Flow

1. **Initialization**
   - `bin/xcodebuildmcp` → compiled `index.js` → executes `src/index.ts`
   - Sentry initialized for error tracking (optional)
   - Version information loaded from `package.json`

2. **Server Creation**
   - MCP server created with stdio transport
   - Plugin discovery system initialized

3. **Plugin Discovery & Loading**
   - `loadPlugins()` scans `plugins/` directory automatically
   - Each plugin exports standardized interface (`name`, `description`, `schema`, `handler`)
   - Plugins are self-contained with no external dependencies
   - Dynamic vs static mode determines loading behavior

4. **Tool Registration**
   - Discovered plugins automatically registered with server
   - No manual registration or configuration required
   - Environment variables can still control dynamic tool discovery

5. **Request Handling**
   - MCP client calls tool → server routes to plugin handler
   - Zod validates parameters before execution
   - Plugin handler uses shared utilities (build, simctl, etc.)
   - Returns standardized `ToolResponse`

6. **Response Streaming**
   - Server streams response back to client
   - Consistent error handling with `isError` flag

## Design Principles

### 1. **Plugin Autonomy**
Plugins are self-contained units that export a standardized interface. They don't know about the server implementation, ensuring loose coupling and high testability.

### 2. **Pure Functions vs Stateful Components**
- Most utilities are stateless pure functions
- Stateful components (e.g., process tracking) isolated in specific modules
- Clear separation between computation and side effects

### 3. **Single Source of Truth**
- Version from `package.json` drives all version references
- Plugin directory structure is authoritative tool source
- Environment variables provide consistent configuration interface

### 4. **Feature Isolation**
- Experimental features behind environment flags
- Optional dependencies (Sentry, xcodemake) gracefully degrade
- Plugin directory structure enables workflow-specific organization

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

### Plugin Discovery System

#### `src/core/plugin-registry.ts`
Automatic plugin loading system:
- Scans `plugins/` directory structure using glob patterns
- Dynamically imports plugin modules
- Validates plugin interface compliance
- Handles both default exports and named exports (for re-exports)
- Supports workflow group metadata via `index.js` files

#### `src/core/plugin-types.ts`
Plugin type definitions:
- `PluginMeta` interface for plugin structure
- `WorkflowMeta` interface for workflow metadata
- `WorkflowGroup` interface for directory organization

### Plugin Implementation

Each plugin (`plugins/*/*.js`) follows this standardized pattern:

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

### Plugin Directory Structure

```
plugins/
├── device-workspace/        # Device + Workspace operations
├── device-project/          # Device + Project operations (re-exports)
├── device-shared/           # Shared device tools (canonical)
├── simulator-workspace/     # Simulator + Workspace operations  
├── simulator-project/       # Simulator + Project operations (re-exports)
├── simulator-shared/        # Shared simulator tools (canonical)
├── macos-workspace/         # macOS + Workspace operations
├── macos-project/           # macOS + Project operations (re-exports)
├── macos-shared/            # Shared macOS tools (canonical)
├── ui-testing/              # UI automation tools
├── swift-package/           # Swift Package Manager tools
├── project-discovery/       # Project analysis tools
├── logging/                 # Log capture tools
├── utilities/               # General utilities
├── diagnostics/             # Diagnostic tools
└── discovery/               # Dynamic tool discovery
```

### Utility Layer

#### Command Execution (`src/utils/command.ts`)
- Shell command execution with proper escaping
- Process spawning and output capture
- Error handling and timeout support
- Environment variable injection

#### Build Utilities (`src/utils/build-utils.ts`)
- xcodebuild command construction
- Platform-specific destination handling
- Build configuration management
- Incremental build support via xcodemake

#### Validation (`src/utils/validation.ts`)
- Parameter validation helpers
- Response formatting utilities
- Error response builders
- Warning message construction

#### Logging (`src/utils/logger.ts`)
- Structured logging with levels
- Console output formatting
- Integration with error tracking
- Debug mode support

## Plugin Organization

### Plugin Categories (84 tools total across 16 directories)

#### Build Tools (20 tools)
- macOS builds (workspace/project)
- iOS simulator builds (by name/UUID)
- iOS device builds
- Swift package builds
- Clean operations

#### Test Tools (14 tools)
- macOS test execution
- iOS simulator testing
- iOS device testing
- Swift package tests
- Test result parsing

#### Management Tools (28 tools)
- Simulator lifecycle management
- Device discovery and control
- App installation/launch/termination
- Bundle ID extraction
- App path resolution

#### UI Automation (13 tools)
- Element inspection (`describe_ui`)
- Gestures (tap, swipe, scroll)
- Keyboard input
- Screenshot capture
- Hardware button simulation

#### Project Tools (4 tools)
- Project/workspace discovery
- Scheme listing
- Build settings inspection
- Project scaffolding

#### Diagnostic Tools (2 tools)
- Log capture (simulator/device)
- Server diagnostics

### Tool Naming Conventions

Tools follow a consistent naming pattern:
- `{action}_{target}_{variant}_{source}`
- Examples:
  - `build_sim_name_ws` (build simulator by name from workspace)
  - `test_device_proj` (test on device from project)
  - `get_mac_app_path_ws` (get macOS app path from workspace)

## Registration System

### Environment-Based Enablement

Three levels of tool enablement:

1. **All Tools** (default)
   - No environment variables set
   - All 84 tools registered

2. **Group-Based**
   - `XCODEBUILDMCP_GROUP_*=true`
   - Enables all tools in specified groups
   - Multiple groups can be combined

3. **Individual Tools**
   - `XCODEBUILDMCP_TOOL_*=true`
   - Fine-grained control
   - Overrides group settings

### Tool Groups

| Group | Purpose | Environment Variable |
|-------|---------|---------------------|
| PROJECT_DISCOVERY | Project exploration | XCODEBUILDMCP_GROUP_PROJECT_DISCOVERY |
| MACOS_WORKFLOW | macOS development | XCODEBUILDMCP_GROUP_MACOS_WORKFLOW |
| IOS_SIMULATOR_WORKFLOW | iOS simulator development | XCODEBUILDMCP_GROUP_IOS_SIMULATOR_WORKFLOW |
| IOS_DEVICE_WORKFLOW | Physical device development | XCODEBUILDMCP_GROUP_IOS_DEVICE_WORKFLOW |
| SWIFT_PACKAGE_WORKFLOW | Swift Package Manager | XCODEBUILDMCP_GROUP_SWIFT_PACKAGE_WORKFLOW |
| TESTING | Test execution | XCODEBUILDMCP_GROUP_TESTING |
| DIAGNOSTICS | Logging and debugging | XCODEBUILDMCP_GROUP_DIAGNOSTICS |
| UI_TESTING | UI automation | XCODEBUILDMCP_GROUP_UI_TESTING |
| APP_DEPLOYMENT | App installation/launch | XCODEBUILDMCP_GROUP_APP_DEPLOYMENT |
| SIMULATOR_MANAGEMENT | Simulator control | XCODEBUILDMCP_GROUP_SIMULATOR_MANAGEMENT |
| DEVICE_MANAGEMENT | Device control | XCODEBUILDMCP_GROUP_DEVICE_MANAGEMENT |

### Write Tools

Tools that modify system state require:
- `isWriteTool: true` in registration
- `XCODEBUILDMCP_ALLOW_WRITE_TOOLS=true` environment variable

Examples: `stop_app_sim`, `stop_mac_app`, `install_app_device`

## Testing Architecture

### Framework and Configuration

- **Test Runner**: Vitest 3.x
- **Environment**: Node.js
- **Configuration**: `vitest.config.ts`
- **Test Pattern**: `*.test.ts` files alongside implementation

### Testing Principles

**MANDATORY - NO EXCEPTIONS**:

1. **✅ ALWAYS TEST PRODUCTION CODE**
   - Import actual tool functions from `src/tools/`
   - Never create mock implementations with business logic

2. **✅ ALWAYS MOCK EXTERNAL DEPENDENCIES**
   - Mock only: `child_process`, `fs`, network calls, logger
   - Never mock tool logic or validation

3. **✅ ALWAYS TEST ALL LOGIC PATHS**
   - Parameter validation (success and failure)
   - Command execution paths
   - Error handling scenarios

4. **✅ ALWAYS VALIDATE INPUT/OUTPUT**
   - Use exact response validation with `.toEqual()`
   - Verify complete response structure
   - Ensure `isError: true` on all failures

### Test Structure Example

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { actualToolFunction } from './tool-file.js';

// Mock only external dependencies
vi.mock('child_process', () => ({
  execSync: vi.fn()
}));

vi.mock('../utils/logger.js', () => ({
  log: vi.fn()
}));

describe('Tool Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate parameters', async () => {
    await expect(actualToolFunction({})).rejects.toThrow();
  });

  it('should execute successfully', async () => {
    const mockExecSync = vi.mocked(execSync);
    mockExecSync.mockReturnValue('SUCCESS');
    
    const result = await actualToolFunction({ param: 'value' });
    
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Expected output' }],
      isError: false
    });
  });
});
```

### Test Coverage

- **Total Tests**: 407
- **Test Files**: 26
- **Coverage**: All 84 tools have comprehensive tests
- **Execution Time**: ~1 second for full suite

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

### Adding a New Tool

1. **Create Tool Implementation**
   ```typescript
   // src/tools/my-new-tool.ts
   export function registerMyNewTool(server: McpServer): void {
     // Implementation
   }
   ```

2. **Add to Registration Catalog**
   ```typescript
   // src/utils/register-tools.ts
   {
     register: registerMyNewTool,
     groups: [ToolGroup.APPROPRIATE_GROUP],
     envVar: 'XCODEBUILDMCP_TOOL_MY_NEW_TOOL',
     isWriteTool: false
   }
   ```

3. **Create Tests**
   ```typescript
   // src/tools/my-new-tool.test.ts
   // Test implementation following testing principles
   ```

4. **Update Documentation**
   - Add to `TOOLS.md`
   - Update relevant group in `TOOL_OPTIONS.md`
   - Add to CHANGELOG.md if significant

### Adding a Tool Group

1. **Extend ToolGroup Enum**
   ```typescript
   // src/utils/tool-groups.ts
   export enum ToolGroup {
     // ... existing groups
     MY_NEW_GROUP = 'MY_NEW_GROUP'
   }
   ```

2. **Add Environment Mapping**
   ```typescript
   // src/utils/tool-groups.ts
   const GROUP_ENV_MAPPING = {
     // ... existing mappings
     [ToolGroup.MY_NEW_GROUP]: 'XCODEBUILDMCP_GROUP_MY_NEW_GROUP'
   };
   ```

3. **Assign Tools to Group**
   - Update tool registrations with new group
   - Document in `TOOL_OPTIONS.md`

### Supporting New Platforms

1. **Update Platform Enum**
   ```typescript
   // src/types/common.ts
   export enum XcodePlatform {
     // ... existing platforms
     newOS = 'newOS',
     newOSSimulator = 'newOS Simulator'
   }
   ```

2. **Update Build Utilities**
   - Modify destination construction in `build-utils.ts`
   - Add platform-specific logic

3. **Create Platform Tools**
   - Follow existing patterns (e.g., iOS tools)
   - Maintain naming consistency

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

## Future Considerations

### Architectural Evolution

1. **Transport Layer**
   - WebSocket support for multi-client scenarios
   - gRPC for higher performance requirements

2. **Plugin Architecture**
   - Dynamic tool loading
   - Third-party tool integration
   - Custom tool development SDK

3. **Configuration Management**
   - JSON/YAML configuration files
   - Tool preset definitions
   - User-defined workflows

4. **Enhanced Diagnostics**
   - Performance profiling
   - Request tracing
   - Advanced error analytics

### Scalability Paths

1. **Horizontal Scaling**
   - Multiple server instances
   - Load balancing support
   - Distributed tool execution

2. **Cloud Integration**
   - Remote build support
   - Distributed testing
   - Cloud simulator farms

3. **Enterprise Features**
   - Authentication/authorization
   - Audit logging
   - Usage analytics