# XcodeBuildMCP Plugin Testing Guidelines

This document provides comprehensive testing guidelines for XcodeBuildMCP plugins, ensuring consistent, robust, and maintainable test coverage across the entire codebase.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Architecture](#test-architecture)  
3. [Mock Strategy](#mock-strategy)
4. [Three-Dimensional Testing](#three-dimensional-testing)
5. [Test Organization](#test-organization)
6. [Test Patterns](#test-patterns)
7. [Performance Requirements](#performance-requirements)
8. [Coverage Standards](#coverage-standards)
9. [Common Patterns](#common-patterns)
10. [Troubleshooting](#troubleshooting)

## Testing Philosophy

### Integration Testing Over Unit Testing

XcodeBuildMCP follows an **integration testing philosophy** that prioritizes testing plugin interfaces over implementation details:

- ✅ **Test plugin interfaces** (public API contracts)
- ✅ **Test integration flows** (plugin → utilities → external tools)
- ✅ **Mock external dependencies only** (child_process.spawn)
- ❌ **Avoid mocking internal utilities** (executeCommand, validation functions)

### Benefits

1. **Implementation Independence**: Internal refactoring doesn't break tests
2. **Real Coverage**: Tests verify actual user data flows
3. **Maintainability**: Fewer brittle tests that break on implementation changes
4. **True Integration**: Catches integration bugs between layers

## Test Architecture

### Correct Test Flow
```
Test → Plugin Handler → executeCommand → utilities → [MOCKED] child_process.spawn
```

### What Gets Tested
- Plugin parameter validation
- Business logic execution
- Command generation
- Response formatting
- Error handling
- Integration between layers

### What Gets Mocked
- External system dependencies (`child_process.spawn`)
- File system operations (when testing without real files)
- Network calls
- Time-dependent functions (when testing timeouts)

## Mock Strategy

### Mock vs Spy Decision Matrix

| Test Goal | Strategy | Implementation |
|-----------|----------|----------------|
| **Command Generation** | SPY | Verify correct CLI commands generated |
| **Success Handling** | CONTROLLED MOCK | Return successful responses |
| **Error Handling** | FAILURE MOCK | Return error responses/exit codes |
| **Output Parsing** | REALISTIC MOCK | Return complex real-world output |

### Mock Implementation Patterns

#### 1. Spy Pattern (Command Verification)
```typescript
it('should generate correct xcodebuild command', async () => {
  const mockSpawn = vi.mocked(spawn);
  
  await plugin.handler({
    projectPath: '/test.xcodeproj',
    scheme: 'MyApp',
    configuration: 'Release'
  });
  
  expect(mockSpawn).toHaveBeenCalledWith('sh', [
    '-c',
    'xcodebuild -project /test.xcodeproj -scheme MyApp -configuration Release build'
  ], expect.any(Object));
});
```

#### 2. Controlled Mock Pattern (Success Testing)
```typescript
it('should handle successful build', async () => {
  setTimeout(() => {
    mockProcess.stdout.emit('data', 'BUILD SUCCEEDED');
    mockProcess.emit('close', 0);
  }, 0);
  
  const result = await plugin.handler({ projectPath: '/test', scheme: 'MyApp' });
  
  expect(result).toEqual({
    content: [{ type: 'text', text: '✅ Build succeeded for scheme MyApp' }]
  });
});
```

#### 3. Failure Mock Pattern (Error Testing)
```typescript
it('should handle compilation errors', async () => {
  setTimeout(() => {
    mockProcess.stderr.emit('data', 'error: Use of undeclared identifier');
    mockProcess.emit('close', 1);
  }, 0);
  
  const result = await plugin.handler({ projectPath: '/test', scheme: 'MyApp' });
  
  expect(result.isError).toBe(true);
  expect(result.content[0].text).toContain('Use of undeclared identifier');
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
    const result = await tool.handler({ scheme: 'MyApp' }); // Missing projectPath
    
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

Verify correct CLI command construction:

```typescript
describe('Command Generation', () => {
  it('should generate command with minimal parameters', async () => {
    await tool.handler({
      projectPath: '/test.xcodeproj',
      scheme: 'MyApp'
    });
    
    expect(mockSpawn).toHaveBeenCalledWith('sh', [
      '-c',
      'xcodebuild -project /test.xcodeproj -scheme MyApp -configuration Debug build'
    ], expect.any(Object));
  });
  
  it('should generate command with all parameters', async () => {
    await tool.handler({
      projectPath: '/test.xcodeproj',
      scheme: 'MyApp',
      configuration: 'Release',
      derivedDataPath: '/custom/derived',
      extraArgs: ['--verbose']
    });
    
    expect(mockSpawn).toHaveBeenCalledWith('sh', [
      '-c',
      'xcodebuild -project /test.xcodeproj -scheme MyApp -configuration Release -derivedDataPath /custom/derived --verbose build'
    ], expect.any(Object));
  });
  
  it('should handle paths with spaces', async () => {
    await tool.handler({
      projectPath: '/Users/dev/My Project/app.xcodeproj',
      scheme: 'MyApp'
    });
    
    expect(mockSpawn).toHaveBeenCalledWith('sh', [
      '-c',
      'xcodebuild -project "/Users/dev/My Project/app.xcodeproj" -scheme MyApp -configuration Debug build'
    ], expect.any(Object));
  });
});
```

### 3. Output Processing (Response Testing)

Test response formatting and error handling:

```typescript
describe('Response Processing', () => {
  it('should format successful response', async () => {
    setTimeout(() => {
      mockProcess.stdout.emit('data', 'BUILD SUCCEEDED');
      mockProcess.emit('close', 0);
    }, 0);
    
    const result = await tool.handler({ projectPath: '/test', scheme: 'MyApp' });
    
    expect(result).toEqual({
      content: [{ type: 'text', text: '✅ Build succeeded for scheme MyApp' }]
    });
  });
  
  it('should extract and format warnings', async () => {
    setTimeout(() => {
      mockProcess.stdout.emit('data', 'warning: deprecated method\nBUILD SUCCEEDED');
      mockProcess.emit('close', 0);
    }, 0);
    
    const result = await tool.handler({ projectPath: '/test', scheme: 'MyApp' });
    
    expect(result.content).toEqual([
      { type: 'text', text: '⚠️ Warning: warning: deprecated method' },
      { type: 'text', text: '✅ Build succeeded for scheme MyApp' }
    ]);
  });
  
  it('should handle spawn errors', async () => {
    setTimeout(() => {
      mockProcess.emit('error', new Error('spawn xcodebuild ENOENT'));
    }, 0);
    
    const result = await tool.handler({ projectPath: '/test', scheme: 'MyApp' });
    
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
import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import { EventEmitter } from 'events';
import { spawn } from 'child_process';

// CRITICAL: Mock BEFORE imports to ensure proper mock chain
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

import tool from '../tool_name.ts';

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
}

describe('tool_name', () => {
  let mockProcess: MockChildProcess;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProcess = new MockChildProcess();
    vi.mocked(spawn).mockReturnValue(mockProcess);
  });

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
    // CLI command tests...
  });

  describe('Response Processing', () => {
    // Output handling tests...
  });
});
```

### Critical Mock Ordering

**CORRECT (Working)**:
```typescript
// ✅ Mock FIRST
vi.mock('child_process', () => ({ spawn: vi.fn() }));

// ✅ Import AFTER mock
import tool from '../tool.ts';
```

**INCORRECT (Broken)**:
```typescript
// ❌ Import FIRST (caches real spawn)
import tool from '../tool.ts';

// ❌ Mock too late
vi.mock('child_process', () => ({ spawn: vi.fn() }));
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
- ✅ **Command generation variations**
- ✅ **Successful command execution**
- ✅ **Command failure scenarios**
- ✅ **Spawn error handling**
- ✅ **Output parsing edge cases**

## Common Patterns

### Testing Parameter Defaults

```typescript
it('should use default configuration when not provided', async () => {
  await tool.handler({
    projectPath: '/test.xcodeproj',
    scheme: 'MyApp'
    // configuration intentionally omitted
  });
  
  expect(mockSpawn).toHaveBeenCalledWith('sh', [
    '-c',
    expect.stringContaining('-configuration Debug') // Default value
  ], expect.any(Object));
});
```

### Testing Complex Output Parsing

```typescript
it('should extract app path from build settings', async () => {
  setTimeout(() => {
    mockProcess.stdout.emit('data', `
      CONFIGURATION_BUILD_DIR = /path/to/build
      BUILT_PRODUCTS_DIR = /path/to/products  
      FULL_PRODUCT_NAME = MyApp.app
      OTHER_SETTING = ignored_value
    `);
    mockProcess.emit('close', 0);
  }, 0);
  
  const result = await tool.handler({ projectPath: '/test', scheme: 'MyApp' });
  
  expect(result.content[0].text).toContain('/path/to/products/MyApp.app');
});
```

### Testing Error Message Formatting

```typescript
it('should format validation errors correctly', async () => {
  const result = await tool.handler({}); // Missing required params
  
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

#### 1. Tests Execute Real Commands
**Symptoms**: Tests take minutes, stderr shows real command execution
**Cause**: Mock ordering issue
**Fix**: Move `vi.mock('child_process')` before imports

#### 2. Mock Not Applied
**Symptoms**: `mockSpawn` not called, real spawn executed  
**Cause**: Import chain cached real spawn before mock applied
**Fix**: Ensure mock is first statement in test file

#### 3. Inconsistent Mock Behavior
**Symptoms**: Some tests work, others don't
**Cause**: Mixed mock strategies (some mock utils, some mock spawn)
**Fix**: Standardize on child_process mocking only

#### 4. Type Errors with Mocks
**Symptoms**: TypeScript errors on mock setup
**Fix**: Use proper type assertions:
```typescript
const mockSpawn = vi.mocked(spawn);
mockSpawn.mockReturnValue(mockProcess as any);
```

### Debug Commands

```bash
# Run specific test file
npm test -- plugins/simulator-workspace/__tests__/tool_name.test.ts

# Run with verbose output
npm test -- --reporter=verbose

# Check for real command execution
npm test 2>&1 | grep "Executing.*command"

# Coverage for specific directory
npm run test:coverage -- plugins/simulator-workspace/
```

### Mock Verification

```typescript
// Verify mock is properly applied
beforeEach(() => {
  const mockSpawn = vi.mocked(spawn);
  expect(vi.isMockFunction(mockSpawn)).toBe(true);
});
```

## Best Practices Summary

1. **Mock ordering**: Always mock external dependencies before imports
2. **Integration focus**: Test plugin interfaces, not implementation details  
3. **Three dimensions**: Test input validation, command generation, and output processing
4. **Literal expectations**: Use exact strings in assertions to catch regressions
5. **Performance**: Ensure fast execution through proper mocking
6. **Coverage**: Aim for 95%+ with focus on error paths
7. **Consistency**: Follow standard patterns across all plugin tests

This testing strategy ensures robust, maintainable tests that provide confidence in plugin functionality while remaining resilient to implementation changes.