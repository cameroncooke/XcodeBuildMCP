# XcodeBuildMCP Plugin Testing Guidelines

This document provides comprehensive testing guidelines for XcodeBuildMCP plugins, ensuring consistent, robust, and maintainable test coverage across the entire codebase.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Architecture](#test-architecture)  
3. [Dependency Injection Strategy](#dependency-injection-strategy)
4. [Three-Dimensional Testing](#three-dimensional-testing)
5. [Test Organization](#test-organization)
6. [Test Patterns](#test-patterns)
7. [Performance Requirements](#performance-requirements)
8. [Coverage Standards](#coverage-standards)
9. [Common Patterns](#common-patterns)
10. [Troubleshooting](#troubleshooting)

## Testing Philosophy

### 🚨 CRITICAL: No Vitest Mocking Allowed

**ABSOLUTE RULE: ALL VITEST MOCKING IS COMPLETELY BANNED**

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

### Integration Testing with Dependency Injection

XcodeBuildMCP follows a **pure dependency injection** testing philosophy that eliminates vitest mocking:

- ✅ **Test plugin interfaces** (public API contracts)
- ✅ **Test integration flows** (plugin → utilities → external tools)
- ✅ **Use dependency injection** with createMockExecutor()
- ❌ **Never mock vitest functions** (vi.mock, vi.fn, etc.)

### Benefits

1. **Implementation Independence**: Internal refactoring doesn't break tests
2. **Real Coverage**: Tests verify actual user data flows
3. **Maintainability**: No brittle vitest mocks that break on implementation changes
4. **True Integration**: Catches integration bugs between layers
5. **Test Safety**: Default executors throw errors in test environment

### Automated Violation Checking

To enforce the no-mocking policy, the project includes a script that automatically checks for banned testing patterns.

```bash
# Run the script to check for violations
node scripts/check-test-patterns.js
```

This script is part of the standard development workflow and should be run before committing changes to ensure compliance with the testing standards. It will fail if it detects any use of `vi.mock`, `vi.fn`, or other forbidden patterns in the test files.

## Test Architecture

### Correct Test Flow
```
Test → Plugin Handler → utilities → [DEPENDENCY INJECTION] createMockExecutor()
```

### What Gets Tested
- Plugin parameter validation
- Business logic execution  
- Command generation
- Response formatting
- Error handling
- Integration between layers

### What Gets Mocked
- Command execution via `createMockExecutor()`
- File system operations via `createMockFileSystemExecutor()`
- Nothing else - all vitest mocking is banned

## Dependency Injection Strategy

### Handler Requirements

All plugin handlers must support dependency injection:

```typescript
export function tool_nameLogic(
  args: Record<string, unknown>, 
  commandExecutor: CommandExecutor,
  fileSystemExecutor?: FileSystemExecutor
): Promise<ToolResponse> {
  // Use injected executors
  const result = await executeCommand(['xcrun', 'simctl', 'list'], commandExecutor);
  return createTextResponse(result.output);
}

export default {
  name: 'tool_name',
  description: 'Tool description',
  schema: { /* zod schema */ },
  async handler(args: Record<string, unknown>): Promise<ToolResponse> {
    return tool_nameLogic(args, getDefaultCommandExecutor(), getDefaultFileSystemExecutor());
  },
};
```

**Important**: The dependency injection pattern applies to ALL handlers, including:
- Tool handlers
- Resource handlers
- Any future handler types (prompts, etc.)

Always use default parameter values (e.g., `= getDefaultCommandExecutor()`) to ensure production code works without explicit executor injection, while tests can override with mock executors.

### Test Requirements

All tests must explicitly provide mock executors:

```typescript
it('should handle successful command execution', async () => {
  const mockExecutor = createMockExecutor({
    success: true,
    output: 'BUILD SUCCEEDED'
  });
  
  const result = await tool_nameLogic(
    { projectPath: '/test.xcodeproj', scheme: 'MyApp' },
    mockExecutor
  );
  
  expect(result.content[0].text).toContain('Build succeeded');
});
```

## Three-Dimensional Testing

Every plugin test suite must validate three critical dimensions:

### 1. Input Validation (Schema Testing)

Test parameter validation and schema compliance:

```typescript
describe('Parameter Validation', () => {
  it('should accept valid parameters', () => {
    const schema = z.object(tool.schema);
    expect(schema.safeParse({
      projectPath: '/valid/path.xcodeproj',
      scheme: 'ValidScheme'
    }).success).toBe(true);
  });
  
  it('should reject invalid parameters', () => {
    const schema = z.object(tool.schema);
    expect(schema.safeParse({
      projectPath: 123, // Wrong type
      scheme: 'ValidScheme'
    }).success).toBe(false);
  });
  
  it('should handle missing required parameters', async () => {
    const mockExecutor = createMockExecutor({ success: true });
    
    const result = await tool.handler({ scheme: 'MyApp' }, mockExecutor); // Missing projectPath
    
    expect(result).toEqual({
      content: [{
        type: 'text',
        text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter."
      }],
      isError: true
    });
  });
});
```

### 2. Command Generation (CLI Testing)

**CRITICAL: No command spying allowed. Test command generation through response validation.**

```typescript
describe('Command Generation', () => {
  it('should execute correct command with minimal parameters', async () => {
    const mockExecutor = createMockExecutor({
      success: true,
      output: 'BUILD SUCCEEDED'
    });
    
    const result = await tool.handler({
      projectPath: '/test.xcodeproj',
      scheme: 'MyApp'
    }, mockExecutor);
    
    // Verify through successful response - command was executed correctly
    expect(result.content[0].text).toContain('Build succeeded');
  });
  
  it('should handle paths with spaces correctly', async () => {
    const mockExecutor = createMockExecutor({
      success: true,
      output: 'BUILD SUCCEEDED'
    });
    
    const result = await tool.handler({
      projectPath: '/Users/dev/My Project/app.xcodeproj',
      scheme: 'MyApp'
    }, mockExecutor);
    
    // Verify successful execution (proper path handling)
    expect(result.content[0].text).toContain('Build succeeded');
  });
});
```

### 3. Output Processing (Response Testing)

Test response formatting and error handling:

```typescript
describe('Response Processing', () => {
  it('should format successful response', async () => {
    const mockExecutor = createMockExecutor({
      success: true,
      output: 'BUILD SUCCEEDED'
    });
    
    const result = await tool.handler({ projectPath: '/test', scheme: 'MyApp' }, mockExecutor);
    
    expect(result).toEqual({
      content: [{ type: 'text', text: '✅ Build succeeded for scheme MyApp' }]
    });
  });
  
  it('should handle command failures', async () => {
    const mockExecutor = createMockExecutor({
      success: false,
      output: 'Build failed with errors',
      error: 'Compilation error'
    });
    
    const result = await tool.handler({ projectPath: '/test', scheme: 'MyApp' }, mockExecutor);
    
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Build failed');
  });
  
  it('should handle executor errors', async () => {
    const mockExecutor = createMockExecutor(new Error('spawn xcodebuild ENOENT'));
    
    const result = await tool.handler({ projectPath: '/test', scheme: 'MyApp' }, mockExecutor);
    
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Error during build: spawn xcodebuild ENOENT' }],
      isError: true
    });
  });
});
```

## Test Organization

### Directory Structure

```
src/plugins/[workflow-group]/
├── __tests__/
│   ├── index.test.ts          # Workflow metadata tests (canonical groups only)
│   ├── re-exports.test.ts     # Re-export validation (project/workspace groups only)
│   ├── tool1.test.ts          # Individual tool tests
│   ├── tool2.test.ts
│   └── ...
├── tool1.ts
├── tool2.ts
├── index.ts                   # Workflow metadata
└── ...
```

### Test File Types

#### 1. Tool Tests (`tool_name.test.ts`)
Test individual plugin tools with full three-dimensional coverage.

#### 2. Workflow Tests (`index.test.ts`)
Test workflow metadata for canonical groups:

```typescript
describe('simulator-workspace workflow metadata', () => {
  it('should have correct workflow name', () => {
    expect(workflow.name).toBe('iOS Simulator Workspace Development');
  });
  
  it('should have correct capabilities', () => {
    expect(workflow.capabilities).toEqual([
      'build', 'test', 'deploy', 'debug', 'ui-automation', 'log-capture'
    ]);
  });
});
```

#### 3. Re-export Tests (`re-exports.test.ts`) 
Test re-export integrity for project/workspace groups:

```typescript
describe('simulator-project re-exports', () => {
  it('should re-export boot_sim from simulator-shared', () => {
    expect(bootSim.name).toBe('boot_sim');
    expect(typeof bootSim.handler).toBe('function');
  });
});
```

## Test Patterns

### Standard Test Template

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';

// CRITICAL: NO VITEST MOCKING ALLOWED
// Import ONLY what you need - no mock setup

import tool from '../tool_name.ts';
import { createMockExecutor } from '../../utils/command.js';

describe('tool_name', () => {

  describe('Export Field Validation (Literal)', () => {
    it('should export correct name', () => {
      expect(tool.name).toBe('tool_name');
    });

    it('should export correct description', () => {
      expect(tool.description).toBe('Expected literal description');
    });

    it('should export handler function', () => {
      expect(typeof tool.handler).toBe('function');
    });

    // Schema validation tests...
  });

  describe('Command Generation', () => {
    it('should execute commands successfully', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Expected output'
      });
      
      const result = await tool.handler(validParams, mockExecutor);
      
      expect(result.content[0].text).toContain('Expected result');
    });
  });

  describe('Response Processing', () => {
    // Output handling tests...
  });
});
```

## Performance Requirements

### Test Execution Speed

- **Individual test**: < 100ms
- **Test file**: < 5 seconds  
- **Full test suite**: < 20 seconds
- **No real system calls**: Tests must use mocks

### Performance Anti-Patterns

❌ **Real command execution**:
```
[INFO] Executing command: xcodebuild -showBuildSettings...
```

❌ **Long timeouts** (indicates real calls)
❌ **File system operations** (unless testing file utilities)
❌ **Network requests** (unless testing network utilities)

## Coverage Standards

### Target Coverage
- **Overall**: 95%+
- **Plugin handlers**: 100%
- **Command generation**: 100%
- **Error paths**: 100%

### Coverage Validation
```bash
# Check coverage for specific plugin group
npm run test:coverage -- plugins/simulator-workspace/

# Ensure all code paths are tested
npm run test:coverage -- --reporter=lcov
```

### Required Test Paths

Every plugin test must cover:

- ✅ **Valid parameter combinations**
- ✅ **Invalid parameter rejection**  
- ✅ **Missing required parameters**
- ✅ **Successful command execution**
- ✅ **Command failure scenarios**
- ✅ **Executor error handling**
- ✅ **Output parsing edge cases**

## Common Patterns

### Testing Parameter Defaults

```typescript
it('should use default configuration when not provided', async () => {
  const mockExecutor = createMockExecutor({
    success: true,
    output: 'BUILD SUCCEEDED'
  });
  
  const result = await tool.handler({
    projectPath: '/test.xcodeproj',
    scheme: 'MyApp'
    // configuration intentionally omitted
  }, mockExecutor);
  
  // Verify default behavior through successful response
  expect(result.content[0].text).toContain('Build succeeded');
});
```

### Testing Complex Output Parsing

```typescript
it('should extract app path from build settings', async () => {
  const mockExecutor = createMockExecutor({
    success: true,
    output: `
      CONFIGURATION_BUILD_DIR = /path/to/build
      BUILT_PRODUCTS_DIR = /path/to/products  
      FULL_PRODUCT_NAME = MyApp.app
      OTHER_SETTING = ignored_value
    `
  });
  
  const result = await tool.handler({ projectPath: '/test', scheme: 'MyApp' }, mockExecutor);
  
  expect(result.content[0].text).toContain('/path/to/products/MyApp.app');
});
```

### Testing Error Message Formatting

```typescript
it('should format validation errors correctly', async () => {
  const mockExecutor = createMockExecutor({ success: true });
  
  const result = await tool.handler({}, mockExecutor); // Missing required params
  
  expect(result).toEqual({
    content: [{
      type: 'text',
      text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter."
    }],
    isError: true
  });
});
```

## Troubleshooting

### Common Issues

#### 1. "Real System Executor Detected" Error
**Symptoms**: Test fails with error about real system executor being used
**Cause**: Handler not receiving mock executor parameter
**Fix**: Ensure test passes createMockExecutor() to handler:

```typescript
// ❌ WRONG
const result = await tool.handler(params);

// ✅ CORRECT
const mockExecutor = createMockExecutor({ success: true });
const result = await tool.handler(params, mockExecutor);
```

#### 2. "Real Filesystem Executor Detected" Error
**Symptoms**: Test fails when trying to access file system
**Cause**: Handler not receiving mock file system executor
**Fix**: Pass createMockFileSystemExecutor():

```typescript
const mockCmd = createMockExecutor({ success: true });
const mockFS = createMockFileSystemExecutor({ readFile: async () => 'content' });
const result = await tool.handler(params, mockCmd, mockFS);
```

#### 3. Handler Signature Errors
**Symptoms**: TypeScript errors about handler parameters
**Cause**: Handler doesn't support dependency injection
**Fix**: Update handler signature:

```typescript
async handler(args: Record<string, unknown>): Promise<ToolResponse> {
  return tool_nameLogic(args, getDefaultCommandExecutor(), getDefaultFileSystemExecutor());
}
```

### Debug Commands

```bash
# Run specific test file
npm test -- src/plugins/simulator-workspace/__tests__/tool_name.test.ts

# Run with verbose output
npm test -- --reporter=verbose

# Check for banned patterns
node scripts/check-test-patterns.js

# Verify dependency injection compliance
node scripts/audit-dependency-container.js

# Coverage for specific directory
npm run test:coverage -- src/plugins/simulator-workspace/
```

### Validation Scripts

```bash
# Check for vitest mocking violations
node scripts/check-test-patterns.js --pattern=vitest

# Check dependency injection compliance
node scripts/audit-dependency-container.js

# Both scripts must pass before committing
```

## Best Practices Summary

1. **Dependency injection**: Always use createMockExecutor() and createMockFileSystemExecutor()
2. **No vitest mocking**: All vi.mock, vi.fn, etc. patterns are banned
3. **Three dimensions**: Test input validation, command execution, and output processing
4. **Literal expectations**: Use exact strings in assertions to catch regressions
5. **Performance**: Ensure fast execution through proper mocking
6. **Coverage**: Aim for 95%+ with focus on error paths
7. **Consistency**: Follow standard patterns across all plugin tests
8. **Test safety**: Default executors prevent accidental real system calls

This testing strategy ensures robust, maintainable tests that provide confidence in plugin functionality while remaining resilient to implementation changes and completely eliminating vitest mocking dependencies.