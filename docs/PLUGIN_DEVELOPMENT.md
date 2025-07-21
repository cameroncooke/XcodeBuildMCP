# XcodeBuildMCP Plugin Development Guide

This guide provides comprehensive instructions for creating new tools and workflow groups in XcodeBuildMCP using the filesystem-based auto-discovery system.

## Table of Contents

1. [Overview](#overview)
2. [Plugin Architecture](#plugin-architecture)
3. [Creating New Tools](#creating-new-tools)
4. [Creating New Workflow Groups](#creating-new-workflow-groups)
5. [Auto-Discovery System](#auto-discovery-system)
6. [Testing Guidelines](#testing-guidelines)
7. [Development Workflow](#development-workflow)
8. [Best Practices](#best-practices)

## Overview

XcodeBuildMCP uses a **plugin-based architecture** with **filesystem-based auto-discovery**. Tools are automatically discovered and loaded without manual registration, and can be dynamically enabled using AI-powered workflow selection.

### Key Features

- **Auto-Discovery**: Tools are automatically found by scanning `src/plugins/` directory
- **Dynamic Loading**: AI can select relevant workflow groups based on user tasks
- **Dependency Injection**: All tools use testable patterns with mock-friendly executors
- **Workflow Organization**: Tools are grouped into end-to-end development workflows

## Plugin Architecture

### Directory Structure

```
src/plugins/
├── simulator-workspace/        # iOS Simulator + Workspace tools
├── simulator-project/          # iOS Simulator + Project tools (re-exports)
├── simulator-shared/           # Shared simulator tools (canonical)
├── device-workspace/           # iOS Device + Workspace tools
├── device-project/             # iOS Device + Project tools (re-exports)
├── device-shared/              # Shared device tools (canonical)
├── macos-workspace/            # macOS + Workspace tools
├── macos-project/              # macOS + Project tools (re-exports)
├── macos-shared/               # Shared macOS tools (canonical)
├── swift-package/              # Swift Package Manager tools
├── ui-testing/                 # UI automation tools
├── project-discovery/          # Project analysis tools
├── utilities/                  # General utilities
├── diagnostics/                # Diagnostic tools
├── logging/                    # Log capture tools
└── discovery/                  # Dynamic tool discovery
```

### Plugin Types

1. **Canonical Workflows**: Standalone workflow groups (e.g., `swift-package`, `ui-testing`)
2. **Shared Tools**: Common tools in `*-shared` directories
3. **Project/Workspace Variants**: Re-export shared tools for specific project types

## Creating New Tools

### 1. Tool File Structure

Every tool follows this standardized pattern:

```typescript
// Example: src/plugins/simulator-workspace/build_sim_name_ws.ts
import { z } from 'zod';
import { ToolResponse } from '../../types/common.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../utils/command.js';
import { log, validateRequiredParam, createTextResponse, createErrorResponse } from '../../utils/index.js';

// Internal logic function with dependency injection
export async function build_sim_name_wsLogic(
  params: Record<string, unknown>,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  // 1. Parameter validation
  const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
  if (!workspaceValidation.isValid) {
    return workspaceValidation.errorResponse;
  }

  const schemeValidation = validateRequiredParam('scheme', params.scheme);
  if (!schemeValidation.isValid) {
    return schemeValidation.errorResponse;
  }

  // 2. Parameter processing with defaults
  const configuration = params.configuration ?? 'Debug';
  const simulatorName = params.simulatorName as string;
  
  log('info', `Building ${params.scheme} for simulator ${simulatorName}`);

  try {
    // 3. Command execution using executor
    const command = [
      'xcodebuild',
      '-workspace', params.workspacePath as string,
      '-scheme', params.scheme as string,
      '-configuration', configuration,
      '-destination', `platform=iOS Simulator,name=${simulatorName}`,
      'build'
    ];

    const result = await executor(command, 'Build iOS App', false);
    
    // 4. Response processing
    if (!result.success) {
      return createErrorResponse('Build failed', result.error);
    }

    return createTextResponse(`✅ Build succeeded for scheme ${params.scheme}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Build error: ${errorMessage}`);
    return createErrorResponse('Build execution failed', errorMessage);
  }
}

// Required default export with plugin metadata
export default {
  name: 'build_sim_name_ws',
  description: 'Builds an iOS app from a workspace for a specific simulator by name. Example: build_sim_name_ws({ workspacePath: "/path/to/App.xcworkspace", scheme: "MyApp", simulatorName: "iPhone 15" })',
  schema: {
    workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
    scheme: z.string().describe('The scheme to build (Required)'),
    simulatorName: z.string().describe('Name of the simulator to target (Required)'),
    configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
    extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
  },
  handler: async (args: Record<string, unknown>): Promise<ToolResponse> => {
    return build_sim_name_wsLogic(args, getDefaultCommandExecutor());
  },
};
```

### 2. Required Plugin Properties

Every plugin **must** export a default object with these properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Tool name (must match filename without extension) |
| `description` | `string` | Clear description with usage examples |
| `schema` | `Record<string, z.ZodTypeAny>` | Zod validation schema for parameters |
| `handler` | `function` | Async function: `(args) => Promise<ToolResponse>` |

### 3. Naming Conventions

Tools follow the pattern: `{action}_{target}_{specifier}_{projectType}`

**Examples:**
- `build_sim_id_ws` → Build + Simulator + ID + Workspace
- `build_sim_name_proj` → Build + Simulator + Name + Project  
- `test_device_ws` → Test + Device + Workspace
- `swift_package_build` → Swift Package + Build

**Project Type Suffixes:**
- `_ws` → Works with `.xcworkspace` files
- `_proj` → Works with `.xcodeproj` files
- No suffix → Generic or canonical tools

### 4. Parameter Validation Patterns

Use utility functions for consistent validation:

```typescript
// Required parameter validation
const pathValidation = validateRequiredParam('workspacePath', params.workspacePath);
if (!pathValidation.isValid) return pathValidation.errorResponse;

// At-least-one parameter validation
const identifierValidation = validateAtLeastOneParam(
  'simulatorId', params.simulatorId,
  'simulatorName', params.simulatorName
);
if (!identifierValidation.isValid) return identifierValidation.errorResponse;

// File existence validation
const fileValidation = validateFileExists(params.workspacePath as string);
if (!fileValidation.isValid) return fileValidation.errorResponse;
```

### 5. Response Patterns

Use utility functions for consistent responses:

```typescript
// Success responses
return createTextResponse('✅ Operation succeeded');
return createTextResponse('Operation completed', false); // Not an error

// Error responses  
return createErrorResponse('Operation failed', errorDetails);
return createErrorResponse('Validation failed', errorMessage, 'ValidationError');

// Complex responses
return {
  content: [
    { type: 'text', text: '✅ Build succeeded' },
    { type: 'text', text: 'Next steps: Run install_app_sim...' }
  ],
  isError: false
};
```

## Creating New Workflow Groups

### 1. Workflow Group Structure

Each workflow group requires:

1. **Directory**: Following naming convention
2. **Workflow Metadata**: `index.ts` file with workflow export
3. **Tool Files**: Individual tool implementations
4. **Tests**: Comprehensive test coverage

### 2. Directory Naming Convention

```
[platform]-[projectType]/     # e.g., simulator-workspace, device-project
[platform]-shared/            # e.g., simulator-shared, macos-shared
[workflow-name]/               # e.g., swift-package, ui-testing
```

### 3. Workflow Metadata (index.ts)

**Required for all workflow groups:**

```typescript
// Example: src/plugins/simulator-workspace/index.ts
export const workflow = {
  name: 'iOS Simulator Workspace Development',
  description: 'Complete iOS development workflow for .xcworkspace files including build, test, deploy, and debug capabilities',
  platforms: ['iOS'],
  targets: ['simulator'], 
  projectTypes: ['workspace'],
  capabilities: ['build', 'test', 'deploy', 'debug', 'ui-automation', 'log-capture'],
};
```

**Required Properties:**
- `name`: Human-readable workflow name
- `description`: Clear description of workflow purpose
- `platforms`: Array of supported platforms
- `targets`: Array of deployment targets  
- `projectTypes`: Array of supported project types
- `capabilities`: Array of workflow capabilities

### 4. Tool Organization Patterns

#### Canonical Workflow Groups
Self-contained workflows that don't re-export from other groups:

```
swift-package/
├── index.ts                    # Workflow metadata
├── swift_package_build.ts      # Build tool
├── swift_package_test.ts       # Test tool
├── swift_package_run.ts        # Run tool
└── __tests__/                  # Test directory
    ├── index.test.ts           # Workflow tests
    ├── swift_package_build.test.ts
    └── ...
```

#### Shared Workflow Groups  
Provide canonical tools for re-export by project/workspace variants:

```
simulator-shared/
├── boot_sim.ts                 # Canonical simulator boot tool
├── install_app_sim.ts          # Canonical app install tool
└── __tests__/                  # Test directory
    ├── boot_sim.test.ts
    └── ...
```

#### Project/Workspace Workflow Groups
Re-export shared tools and add variant-specific tools:

```
simulator-project/
├── index.ts                    # Workflow metadata
├── boot_sim.ts                 # Re-export: export { default } from '../simulator-shared/boot_sim.js';
├── build_sim_id_proj.ts        # Project-specific build tool
└── __tests__/                  # Test directory
    ├── index.test.ts           # Workflow tests  
    ├── re-exports.test.ts      # Re-export validation
    └── ...
```

### 5. Re-export Implementation

For project/workspace groups that share tools:

```typescript
// simulator-project/boot_sim.ts
export { default } from '../simulator-shared/boot_sim.js';
```

**Re-export Rules:**
1. Re-exports come from canonical `-shared` groups
2. No chained re-exports (re-exports from re-exports)
3. Each tool maintains project or workspace specificity
4. Implementation shared, interfaces remain unique

## Auto-Discovery System

### How Auto-Discovery Works

1. **Filesystem Scan**: `loadPlugins()` scans `src/plugins/` directory
2. **Workflow Loading**: Each subdirectory is treated as a potential workflow group
3. **Metadata Validation**: `index.ts` files provide workflow metadata
4. **Tool Discovery**: All `.ts` files (except tests and index) are loaded as tools
5. **Registration**: Tools are automatically registered with the MCP server

### Discovery Process

```typescript
// Simplified discovery flow
const plugins = await loadPlugins();
for (const plugin of plugins.values()) {
  server.tool(plugin.name, plugin.description, plugin.schema, plugin.handler);
}
```

### Dynamic Mode Integration

When `XCODEBUILDMCP_DYNAMIC_TOOLS=true`:

1. Only `discover_tools` is loaded initially
2. User provides task description to `discover_tools`
3. AI analyzes task and selects relevant workflow groups
4. Selected workflows are dynamically enabled via `enableWorkflows()`
5. Client is notified of new available tools

## Testing Guidelines

### Test Organization

```
__tests__/
├── index.test.ts              # Workflow metadata tests (canonical groups only)
├── re-exports.test.ts         # Re-export validation (project/workspace groups)
└── tool_name.test.ts          # Individual tool tests
```

### Dependency Injection Testing

**✅ CORRECT Pattern:**
```typescript
import { createMockExecutor } from '../../../utils/test-common.js';

describe('build_sim_name_ws', () => {
  it('should build successfully', async () => {
    const mockExecutor = createMockExecutor({
      success: true,
      output: 'BUILD SUCCEEDED'
    });

    const result = await build_sim_name_wsLogic(params, mockExecutor);
    expect(result.isError).toBe(false);
  });
});
```

**❌ FORBIDDEN Pattern (Vitest Mocking Banned):**
```typescript
// ❌ ALL VITEST MOCKING IS COMPLETELY BANNED
vi.mock('child_process');
const mockSpawn = vi.fn();
```

### Three-Dimensional Testing

Every tool test must cover:

1. **Input Validation**: Parameter schema validation and error cases
2. **Command Generation**: Verify correct CLI commands are built
3. **Output Processing**: Test response formatting and error handling

### Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { createMockExecutor } from '../../../utils/test-common.js';
import tool, { toolNameLogic } from '../tool_name.js';

describe('tool_name', () => {
  describe('Export Validation', () => {
    it('should export correct name', () => {
      expect(tool.name).toBe('tool_name');
    });

    it('should export correct description', () => {
      expect(tool.description).toContain('Expected description');
    });

    it('should export handler function', () => {
      expect(typeof tool.handler).toBe('function');
    });
  });

  describe('Parameter Validation', () => {
    it('should validate required parameters', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: '' });
      
      const result = await toolNameLogic({}, mockExecutor);
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Required parameter");
    });
  });

  describe('Command Generation', () => {
    it('should generate correct command', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'SUCCESS' });
      
      await toolNameLogic({ param: 'value' }, mockExecutor);
      
      expect(mockExecutor).toHaveBeenCalledWith(
        expect.arrayContaining(['expected', 'command']),
        expect.any(String),
        expect.any(Boolean)
      );
    });
  });

  describe('Response Processing', () => {
    it('should handle successful execution', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'SUCCESS' });
      
      const result = await toolNameLogic({ param: 'value' }, mockExecutor);
      
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('✅');
    });

    it('should handle execution errors', async () => {
      const mockExecutor = createMockExecutor({ success: false, error: 'Command failed' });
      
      const result = await toolNameLogic({ param: 'value' }, mockExecutor);
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Command failed');
    });
  });
});
```

## Development Workflow

### Adding a New Tool

1. **Choose Directory**: Select appropriate workflow group or create new one
2. **Create Tool File**: Follow naming convention and structure
3. **Implement Logic**: Use dependency injection pattern
4. **Define Schema**: Add comprehensive Zod validation
5. **Write Tests**: Cover all three dimensions
6. **Test Integration**: Build and verify auto-discovery

### Step-by-Step Tool Creation

```bash
# 1. Create tool file
touch src/plugins/simulator-workspace/my_new_tool_ws.ts

# 2. Implement tool following patterns above

# 3. Create test file
touch src/plugins/simulator-workspace/__tests__/my_new_tool_ws.test.ts

# 4. Build project
npm run build

# 5. Verify tool is discovered (should appear in tools list)
npm run inspect  # Use MCP Inspector to verify
```

### Adding a New Workflow Group

1. **Create Directory**: Follow naming convention
2. **Add Workflow Metadata**: Create `index.ts` with workflow export
3. **Implement Tools**: Add tool files following patterns
4. **Create Tests**: Add comprehensive test coverage
5. **Verify Discovery**: Test auto-discovery and dynamic mode

### Step-by-Step Workflow Creation

```bash
# 1. Create workflow directory
mkdir src/plugins/my-new-workflow

# 2. Create workflow metadata
cat > src/plugins/my-new-workflow/index.ts << 'EOF'
export const workflow = {
  name: 'My New Workflow',
  description: 'Description of workflow capabilities',
  platforms: ['iOS'],
  targets: ['simulator'],
  projectTypes: ['workspace'],
  capabilities: ['build', 'test'],
};
EOF

# 3. Create tools directory and test directory
mkdir src/plugins/my-new-workflow/__tests__

# 4. Implement tools following patterns

# 5. Build and verify
npm run build
npm run inspect
```

## Best Practices

### Tool Design

1. **Single Responsibility**: Each tool should have one clear purpose
2. **Descriptive Names**: Follow naming conventions for discoverability
3. **Clear Descriptions**: Include usage examples in tool descriptions
4. **Comprehensive Validation**: Validate all parameters with helpful error messages
5. **Consistent Responses**: Use utility functions for response formatting

### Error Handling

1. **Graceful Failures**: Always return ToolResponse, never throw from handlers
2. **Descriptive Errors**: Provide actionable error messages
3. **Error Types**: Use appropriate error types for different scenarios
4. **Logging**: Log important events and errors for debugging

### Testing

1. **Dependency Injection**: Always test with mock executors
2. **Complete Coverage**: Test all input, command, and output scenarios
3. **Literal Assertions**: Use exact string expectations to catch changes
4. **Fast Execution**: Tests should complete quickly without real system calls

### Workflow Organization  

1. **End-to-End Workflows**: Groups should provide complete functionality
2. **Logical Grouping**: Group related tools together
3. **Clear Capabilities**: Document what each workflow can accomplish
4. **Consistent Patterns**: Follow established patterns for maintainability

### Dynamic Mode Considerations

1. **Workflow Completeness**: Each group should be self-sufficient
2. **Clear Descriptions**: AI uses descriptions to select workflows
3. **Platform Clarity**: Make supported platforms and targets obvious
4. **Capability Documentation**: List all workflow capabilities clearly

## Integration with Dynamic Discovery

When creating new tools and workflows, consider:

1. **AI Selection**: How will the AI understand when to select your workflow?
2. **Description Quality**: Is your workflow description clear for AI analysis?
3. **Platform Targeting**: Are platform and target requirements obvious?
4. **Workflow Completeness**: Does the workflow provide end-to-end functionality?

The auto-discovery system makes your tools immediately available, while the dynamic mode allows AI to intelligently select relevant workflows based on user tasks. Following these patterns ensures seamless integration with both systems.