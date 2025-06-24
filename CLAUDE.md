# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XcodeBuildMCP is a Model Context Protocol (MCP) server that exposes Xcode operations as tools for AI assistants. It enables programmatic interaction with Xcode projects, simulators, devices, and Swift packages through a standardized interface.

## Architecture

### Core Structure

- **Entry Point**: `src/index.ts` - Server initialization, tool registration, and lifecycle management
- **Server Configuration**: `src/server/server.ts` - MCP server setup and transport configuration
- **Tool Organization**: Platform-specific tools in `src/tools/` grouped by functionality:
  - Build tools: `build_*.ts`
  - Simulator management: `simulator.ts`, `screenshot.ts`, `axe.ts`
  - Device management: `device.ts`, `device_log.ts`
  - Swift Package Manager: `*-swift-package.ts`
  - Project utilities: `discover_projects.ts`, `scaffold.ts`, `clean.ts`
- **Shared Utilities**: `src/utils/` - Command execution, validation, logging, and error handling
- **Type Definitions**: `src/types/common.ts` - Shared interfaces and type definitions

### Key Patterns

1. **Tool Registration**: Tools are registered in `src/utils/register-tools.ts` using a centralized system with workflow-based grouping
2. **Schema Validation**: All tools use Zod schemas for parameter validation before execution
3. **Command Execution**: Standardized pattern using `src/utils/command.ts` for external command execution
4. **Error Handling**: Consistent error wrapping and logging through `src/utils/errors.ts`
5. **Selective Tool Enablement**: Environment variables control which tools are exposed (see `src/utils/tool-groups.ts`)

## Development Commands

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Watch mode for development
npm run build:watch

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check

# Test the server with MCP Inspector
npm run inspect

# Run diagnostic tool
npm run diagnostic
```

## Adding New Tools

When adding a new tool:

1. Create the tool implementation in `src/tools/`
2. Define Zod schema for parameters
3. Follow the existing pattern:
   ```typescript
   export async function myNewTool(params: z.infer<typeof MyToolSchema>): Promise<{ output: string }> {
     // Validate parameters
     const validated = MyToolSchema.parse(params);
     
     // Execute command using command.ts utilities
     const result = await exec(...);
     
     // Return standardized output
     return { output: result };
   }
   ```
4. Register the tool in `src/utils/register-tools.ts`
5. Add to appropriate tool group in `src/utils/tool-groups.ts`
6. Update TOOL_OPTIONS.md if adding a new group
7. **Update TOOLS.md** with the new tool's name, MCP tool name, and description in the appropriate category

## Testing

### MANDATORY Testing Principles

**🚨 ENGINEERING VIOLATION WARNING 🚨**

**NEVER TEST TEST CODE** - This makes zero sense and is a massive engineering violation. Tests that reimplement tool logic are testing the wrong thing and provide false confidence.

**MANDATORY PRINCIPLES - NO EXCEPTIONS**:

1. **✅ ALWAYS TEST PRODUCTION CODE**: Import and test actual tool functions from `src/tools/`
2. **✅ ALWAYS MOCK EXTERNAL DEPENDENCIES**: Mock file system, child processes, network calls - never real implementation logic  
3. **✅ ALWAYS TEST ALL LOGIC PATHS**: Complete coverage of production tool function behavior
4. **✅ ALWAYS VALIDATE INPUT/OUTPUT**: Test parameter validation and response formats against production code

**❌ ENGINEERING VIOLATIONS - NEVER DO THIS**:
- Creating mock tool handlers that reimplement business logic
- Testing test code instead of production code
- Reimplementing tool validation or response logic in tests
- Any test that doesn't import the actual production tool function

### Current Test Debt (MUST BE FIXED)

**CRITICAL**: Multiple test files currently violate testing principles by reimplementing tool logic instead of testing production code. These represent technical debt that must be systematically remediated:

**Files with Test Violations**:
- `src/tools/build_ios_simulator.test.ts` - Reimplements build logic instead of testing actual tools
- `src/tools/build_settings.test.ts` - Mock implementations instead of production code testing
- `src/tools/build-swift-package.test.ts` - Test handlers with business logic 
- `src/tools/bundleId.test.ts` - Reimplemented validation logic in tests
- `src/tools/clean.test.ts` - Mock tool objects instead of actual tool imports
- `src/tools/discover_projects.test.ts` - Test-specific logic instead of production testing
- `src/tools/log.test.ts` - Handler reimplementations instead of actual tool testing
- `src/tools/run-swift-package.test.ts` - Mock business logic instead of production code
- `src/tools/scaffold.test.ts` - Reimplemented scaffolding logic in test handlers
- `src/tools/screenshot.test.ts` - Mock implementations instead of actual tool testing
- `src/tools/simulator.test.ts` - Test handlers with reimplemented tool logic
- `src/tools/test_ios_simulator.test.ts` - Mock tool objects instead of production imports
- `src/tools/test_macos.test.ts` - Handler logic reimplementation instead of actual testing

**Additional Issues**:
- `src/tools/launch.test.ts` - Missing `isError: true` validation in tests (inconsistent error handling validation)
- `src/tools/build_macos.test.ts` - Fixed: Now correctly tests actual macOS build tool registration functions

**Remediation Strategy**: Use systematic sub-agent delegation to refactor all violating tests to follow correct patterns.

### Sub-Agent Delegation for Test Refactoring

**MANDATORY PROCESS**: When systematic test refactoring is required (multiple files, large-scale changes), ALWAYS use sub-agent delegation as follows:

#### When to Use Sub-Agents
- **Multiple file refactoring** (3+ test files need changes)
- **Systematic pattern violations** (test files reimplementing business logic)
- **Large-scale test updates** (updating test patterns across many files)
- **Parallel work efficiency** (when multiple independent changes can be done simultaneously)

#### Sub-Agent Assignment Structure

**Each Sub-Agent Receives**:
1. **Specific file assignments** - exact list of files to refactor
2. **Clear success criteria** - what constitutes completion
3. **Quality standards** - must follow CLAUDE.md testing principles
4. **Autonomous instructions** - no user feedback requests allowed
5. **Example patterns** - correct test structure to follow

**Example Sub-Agent Assignment**:
```
ASSIGNMENT: Test Refactoring - Build Tools Group
FILES: 
- src/tools/build_ios_simulator.test.ts
- src/tools/build_settings.test.ts
- src/tools/build-swift-package.test.ts

SUCCESS CRITERIA:
✅ Import actual production functions (not mock implementations)
✅ Mock external dependencies only (child_process, fs, network)
✅ Test actual tool function behavior with real parameter validation
✅ Use exact response validation with .toEqual()
✅ Ensure isError: true on all failure scenarios
✅ All tests pass with npm test

AUTONOMOUS: Work independently, no user feedback requests
QUALITY: Follow CLAUDE.md testing principles exactly
DEADLINE: Complete all files in single session
```

#### Parallel Execution Strategy

**Phase 1: Analysis & Planning**
- Launch 1-2 agents to analyze test violations and create detailed assignments
- Generate specific file groupings for optimal parallel processing
- Create success criteria and quality checklists

**Phase 2: Systematic Refactoring** 
- Launch 4-6 agents in parallel for maximum efficiency
- Each agent handles 2-4 related files (e.g., iOS tools, Swift Package tools)
- Agents work autonomously following exact patterns
- No cross-dependencies between agent assignments

**Phase 3: Validation & Cleanup**
- Launch 1-2 agents to run comprehensive test validation
- Verify all tests pass, no regressions introduced
- Confirm all quality standards met across all refactored files

#### Quality Control Standards

**Pre-Assignment Validation**:
- Verify agent understands CLAUDE.md testing principles
- Confirm agent can identify engineering violations in current tests
- Ensure agent knows correct import and mocking patterns

**Post-Completion Validation**:
- All tests must pass: `npm test`
- No linting errors: `npm run lint`
- Code properly formatted: `npm run format`
- Build successful: `npm run build`

**Success Metrics**:
- 100% of assigned files refactored to correct patterns
- Zero test files with mock business logic implementations
- All production tool functions properly imported and tested
- Complete external dependency mocking (no real command execution)

#### No User Feedback Policy

**CRITICAL**: Sub-agents must work autonomously without requesting user feedback:
- ✅ **Autonomous decision making** on technical implementation details
- ✅ **Self-sufficient problem solving** using CLAUDE.md as reference
- ✅ **Independent quality validation** before marking work complete
- ❌ **No requests for clarification** once assignment is clear
- ❌ **No status updates during work** - deliver completed results only
- ❌ **No "should I..." questions** - follow CLAUDE.md principles exactly

### Test Infrastructure (Operational)

**MIGRATION COMPLETE**: This canonical implementation now has comprehensive test infrastructure migrated from the failed plugin architecture. All 285 tests covering 81 tools are operational and provide complete test coverage.

**Current Testing Methods**:
- **Automated Testing**: Complete Vitest test suite with 285 tests across 14 test files
- **Manual Testing**: Example projects in `example_projects/` for integration testing
- **Interactive Testing**: MCP Inspector for debugging (`npm run inspect`)
- **Environment Validation**: Diagnostic tool for system verification

**Test Infrastructure Features**:
- **Framework**: Vitest with native TypeScript ES modules support
- **Coverage**: 285 tests covering all 81 canonical tools with deterministic validation
- **Organization**: Tests organized by canonical tool functionality with complete response validation
- **Quality**: Tests validate exact tool responses, preventing regressions
- **CI Integration**: Automated testing in GitHub Actions workflow

### Test Infrastructure Architecture

#### Test Dependencies
```bash
# Test execution
npm test              # Run all tests
npm run test:watch    # Watch mode for development  
npm run test:ui       # Interactive test UI
npm run test:coverage # Coverage reporting
```

#### Test Directory Structure (Current)
```
tests-vitest/
├── helpers/
│   └── vitest-tool-helpers.ts    # Core test utilities and mock helpers
├── infrastructure.test.ts        # Test infrastructure validation
└── src/
    └── tools/
        ├── app_path.test.ts                     # Tests for app path tools
        ├── axe.test.ts                          # Tests for UI automation tools  
        ├── build_ios_device.test.ts             # Tests for iOS device build tools
        ├── build_ios_simulator_project.test.ts  # Tests for iOS simulator project tools
        ├── build_ios_simulator_workspace.test.ts # Tests for iOS simulator workspace tools
        ├── build_macos.test.ts                  # Tests for macOS build tools
        ├── device.test.ts                       # Tests for device management tools
        ├── device_log.test.ts                   # Tests for device log capture tools
        ├── diagnostic.test.ts                   # Tests for diagnostic tools
        ├── discover_projects.test.ts            # Tests for project discovery
        ├── scaffold.test.ts                     # Tests for project scaffolding
        ├── swift-package.test.ts                # Tests for Swift Package tools
        └── test_ios_device.test.ts              # Tests for iOS device testing tools
```

#### Test Patterns and Quality Standards

**Deterministic Response Validation**:
```typescript
// Example of expected test quality (MAINTAIN THIS STANDARD)
expect(result.content).toEqual([
  { type: 'text', text: '✅ macOS Build succeeded for scheme MyScheme.' },
  { type: 'text', text: '🖥️ Target: macOS' }, 
  { type: 'text', text: 'Build output:\nBUILD SUCCEEDED' }
]);
expect(result.isError).toBe(false);
```

**Complete Tool Coverage**:
- Every tool must have parameter validation tests
- Every tool must have success response format tests  
- Every tool must have error handling tests
- Command generation must be validated without execution

**CORRECT Test Patterns - ALWAYS FOLLOW THIS**:
```typescript
// ✅ CORRECT: Import actual production tool function
import { actualToolFunction } from '../../../src/tools/my-tool-file.js';

// ✅ CORRECT: Mock external dependencies only
vi.mock('child_process', () => ({
  spawn: vi.fn(() => mockChildProcess),
  execSync: vi.fn()
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(), 
  unlink: vi.fn()
}));

// ✅ CORRECT: Mock logger to prevent real logging
vi.mock('../utils/logger.js', () => ({
  log: vi.fn()
}));

// ✅ CORRECT: Test the actual production function
describe('my-tool tests', () => {
  it('should test actual production code', async () => {
    // Setup mocks for external dependencies
    const mockExecSync = vi.mocked(execSync);
    mockExecSync.mockReturnValue('SUCCESS OUTPUT');
    
    // Call actual production function
    const result = await actualToolFunction({ param: 'value' });
    
    // Validate actual production response
    expect(result.content).toEqual([
      { type: 'text', text: '✅ Tool operation succeeded.' }
    ]);
    expect(result.isError).toBe(false);
  });
});
```

**❌ WRONG Pattern - NEVER DO THIS**:
```typescript
// ❌ WRONG: Creating mock tool with reimplemented logic
const mockTool = {
  handler: async (params: any) => {
    // ❌ This is reimplementing business logic in tests!
    if (!params.required) {
      return { content: [{ type: 'text', text: 'Error' }], isError: true };
    }
    // ❌ This is testing test code, not production code!
    return { content: [{ type: 'text', text: 'Success' }], isError: false };
  }
};
```

### Test Migration Summary (COMPLETED)

**Migration Source**: Failed plugin architecture with excellent test infrastructure
**Migration Target**: Canonical implementation (stable foundation) 
**Migration Result**: Successfully preserved 285 tests while fixing architectural issues

**Key Migration Achievements**:
1. **Import Path Updates**: All tests updated to import from canonical tool structure
2. **Response Format Alignment**: Test expectations aligned with canonical tool responses
3. **Tool Organization**: Tests reorganized by canonical file structure instead of plugin categories
4. **Convenience Functions**: Test utilities and response helpers successfully ported

**Success Criteria Met**:
- ✅ 100% test pass rate against canonical implementation (285/285 tests passing)
- ✅ Complete coverage of all 81 canonical tools
- ✅ Deterministic response validation maintained
- ✅ Stable foundation ready for future plugin re-architecture

### Adding Tests for New Tools

**MANDATORY**: When adding a new tool, create corresponding test that TESTS PRODUCTION CODE:

```typescript
// src/tools/[tool-file].test.ts  
import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { execSync } from 'child_process';
import { myNewToolFunction } from './my-tool-file.js';  // ✅ Import actual production function

// ✅ Mock external dependencies only
vi.mock('child_process', () => ({ 
  execSync: vi.fn()
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn()
}));

// ✅ Mock logger to prevent real logging
vi.mock('../utils/logger.js', () => ({
  log: vi.fn()
}));

describe('myNewTool tests', () => {
  let mockExecSync: MockedFunction<typeof execSync>;

  beforeEach(() => {
    mockExecSync = vi.mocked(execSync);
    vi.clearAllMocks();
  });

  describe('parameter validation', () => {
    it('should reject missing required parameters', async () => {
      // ✅ Test actual production function parameter validation
      await expect(myNewToolFunction({})).rejects.toThrow();
    });

    it('should accept valid parameters', async () => {
      mockExecSync.mockReturnValue('SUCCESS');
      
      // ✅ Test actual production function with valid params
      const result = await myNewToolFunction({ paramName: 'validValue' });
      expect(result.isError).toBe(false);
    });
  });

  describe('success scenarios', () => {
    it('should return deterministic success response', async () => {
      // ✅ Mock external dependency behavior
      mockExecSync.mockReturnValue('BUILD SUCCEEDED');
      
      // ✅ Call actual production function
      const result = await myNewToolFunction({ paramName: 'validValue' });
      
      // ✅ Validate actual production response format
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Tool operation succeeded.' },
        { type: 'text', text: 'Output: BUILD SUCCEEDED' }
      ]);
      expect(result.isError).toBe(false);
      
      // ✅ Verify actual production function called external dependency correctly
      expect(mockExecSync).toHaveBeenCalledWith('expected-command', expect.any(Object));
    });
  });

  describe('error scenarios', () => {
    it('should handle command failures correctly', async () => {
      // ✅ Mock external dependency failure
      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });
      
      // ✅ Test actual production function error handling
      const result = await myNewToolFunction({ paramName: 'validValue' });
      
      // ✅ Validate actual production error response
      expect(result.isError).toBe(true);  // ✅ MUST be true on failures
      expect(result.content[0].text).toContain('Command failed');
    });
  });
});
```

**MANDATORY Requirements**:
- ✅ Import actual production tool function from `src/tools/`
- ✅ Mock external dependencies (child_process, fs, network) only
- ✅ Test actual production function behavior, not test implementations
- ✅ Validate exact response structure with `.toEqual()` (never `.toContain()`)
- ✅ Test all logic paths: parameter validation, success cases, error handling
- ✅ Verify external dependency calls without executing real commands
- ✅ Ensure `isError: true` is set on all failure scenarios

### Test Violation Detection

**MANDATORY**: Use these criteria to identify tests that violate engineering principles:

#### Red Flags - Immediate Engineering Violations

**🚨 Test Files with Mock Tool Implementations**:
```typescript
// ❌ RED FLAG: Mock tool with business logic
const mockTool = {
  handler: async (params: any) => {
    // ❌ This is reimplementing production logic in tests!
    if (!params.workspacePath) {
      return { content: [{ type: 'text', text: 'Error' }], isError: true };
    }
    return { content: [{ type: 'text', text: 'Success' }], isError: false };
  }
};
```

**🚨 Tests NOT Importing Production Code**:
```typescript
// ❌ RED FLAG: No import of actual tool function
// Missing: import { actualToolFunction } from './tool.js';
// Instead has: Mock implementations in test file
```

**🚨 Test Handlers with Business Logic**:
```typescript
// ❌ RED FLAG: Business logic in test handler
handler: async (params: any): Promise<ToolResponse> => {
  // Validate required parameters ← ❌ This should be in production code!
  const workspaceValidation = validateRequiredParam('workspacePath', params.workspacePath);
  if (!workspaceValidation.isValid) return workspaceValidation.errorResponse!;
  // ... more business logic ← ❌ Engineering violation!
}
```

#### Validation Checklist

**✅ CORRECT Test Structure**:
- [ ] Imports actual production tool function from `src/tools/`
- [ ] Mocks external dependencies only (child_process, fs, network, logger)
- [ ] Calls actual production function in test cases
- [ ] No business logic reimplementation in test file
- [ ] Uses exact response validation with `.toEqual()`
- [ ] Tests all production code paths (validation, success, error)

**❌ VIOLATION Indicators**:
- [ ] Mock tool objects with handler functions
- [ ] Reimplemented parameter validation in tests
- [ ] Business logic duplicated from production code
- [ ] Tests that don't call actual production functions
- [ ] Missing imports of production tool functions
- [ ] Test-specific logic that mirrors production logic

#### File Audit Process

**Step 1: Check Imports**
```bash
# ✅ Should see imports of actual tool functions
grep -n "import.*from.*\.\/.*\.js" src/tools/*.test.ts

# ❌ Red flag if no production imports found
```

**Step 2: Check for Mock Tools**
```bash
# ❌ Red flag: Mock tools with handlers
grep -n "handler.*async.*params" src/tools/*.test.ts
```

**Step 3: Check for Business Logic**
```bash
# ❌ Red flag: Validation logic in tests
grep -n "validateRequiredParam\|validation.*isValid" src/tools/*.test.ts
```

**Step 4: Verify Production Function Calls**
```bash
# ✅ Should see actual function calls in tests
grep -n "await.*Tool.*(" src/tools/*.test.ts
```

#### Immediate Action Required

**If ANY Red Flags Found**:
1. **STOP** - Do not continue with test as-is
2. **Refactor** - Import actual production function
3. **Remove** - Delete all mock business logic
4. **Remock** - Mock external dependencies only
5. **Retest** - Verify tests still pass with production code
6. **Validate** - Ensure complete logic path coverage

### Error Handling Standards

**MANDATORY**: All tool functions must consistently implement error handling:

#### Required Error Response Pattern
```typescript
// ✅ CORRECT: All failures must set isError: true
if (errorCondition) {
  return {
    content: [{ type: 'text', text: 'Error message describing the failure' }],
    isError: true  // ← MANDATORY on all failures
  };
}
```

#### Common Violations
- **Missing `isError: true`**: Functions that return error responses without setting error flag
- **Inconsistent error formats**: Different error response structures across tools
- **Silent failures**: Functions that fail but return success responses

#### Validation Requirements
- [ ] All error scenarios set `isError: true`
- [ ] All success scenarios set `isError: false` 
- [ ] Error messages are descriptive and actionable
- [ ] Consistent error response format across all tools

### Coverage Enforcement Standards

**MANDATORY**: All test files must achieve minimum coverage requirements:

#### Coverage Requirements
- **Minimum Coverage**: 40% overall test coverage required
- **Tool Function Coverage**: 100% coverage for all tool registration functions
- **Test-to-Production Mapping**: Each test file must test the exact corresponding production file
- **Coverage Validation**: Must run coverage tools after all test development

#### Pre-Commit Coverage Validation
```bash
# MANDATORY: Run coverage analysis before any commit
npm run test:coverage

# Verify minimum 40% coverage requirement
# Tool functions must have 100% coverage
```

#### Coverage Enforcement Rules
1. **File Mapping**: `src/tools/[name].test.ts` must test `src/tools/[name].ts`
2. **Function Coverage**: All exported tool registration functions must be tested
3. **Coverage Gates**: CI pipeline must enforce minimum coverage thresholds
4. **Regular Audits**: Coverage reports must be reviewed for all test changes

### Systematic Test Validation Pipeline

**MANDATORY**: Before any test development completion, run full validation:

#### Validation Commands (ALL MUST PASS)
```bash
# 1. MANDATORY: Linting (0 errors required)
npm run lint

# 2. MANDATORY: Code formatting (all files formatted)
npm run format

# 3. MANDATORY: Build compilation (must compile successfully)  
npm run build

# 4. MANDATORY: Test execution (all tests must pass)
npm test

# 5. MANDATORY: Coverage analysis (40% minimum)
npm run test:coverage
```

#### Validation Enforcement
- **Zero Tolerance**: Any command failure blocks commit
- **Coverage Gates**: Below 40% coverage blocks commit
- **Tool Function Coverage**: Below 100% tool function coverage blocks commit
- **Documentation Updates**: CLAUDE.md must be updated for new requirements

#### Quality Assurance Checklist
- [ ] Each test file tests exact production file of same name
- [ ] All tool registration functions have 100% test coverage
- [ ] Overall project maintains minimum 40% coverage
- [ ] All validation commands pass without errors
- [ ] Test patterns follow CLAUDE.md engineering standards exactly

### Hallucinated Tool Removal Guidelines

**CANONICAL IS THE SINGLE SOURCE OF TRUTH** - Any tools that don't exist in the canonical implementation must be removed completely.

**Process for Future Development**:
1. **Before adding any tool**: Verify it exists in canonical implementation
2. **Before writing tests**: Check tool exists in `/src/tools/` directory
3. **Tool validation**: All tools must be registered in `src/utils/register-tools.ts`
4. **Test creation**: Only create tests for tools that exist in canonical codebase

**Common Hallucinated Tool Patterns** (NEVER CREATE):
- Tools with suffixes like `_direct`, `_deps`, `_init` 
- Convenience wrapper tools not in canonical
- Platform-specific variants not implemented in canonical
- Legacy tools that were planned but never implemented

**Validation Checklist**:
- [ ] Tool exists in canonical `src/tools/` directory
- [ ] Tool is registered in `src/utils/register-tools.ts`
- [ ] Tool is documented in `TOOLS.md`
- [ ] Tool count matches canonical exactly (81 tools total)

### Test Quality Assurance

**Automated Validation**:
- All tests run in CI pipeline ensuring continuous validation
- 100% test pass rate required for all pull requests
- Deterministic response validation prevents regressions
- Code coverage reporting ensures comprehensive testing

**Test Maintenance**:
- Tests are automatically updated when tool responses change
- Mock patterns ensure tests run without external dependencies
- Response format validation catches breaking changes early
- Tool registration validation ensures all tools have test coverage

## Important Implementation Details

### Incremental Builds
- Experimental feature using `xcodemake` instead of `xcodebuild`
- Enabled via `INCREMENTAL_BUILDS_ENABLED` environment variable
- Implementation in `src/utils/xcodemake.ts`

### UI Automation
- Uses bundled AXe tool (`bundled/axe`) for simulator UI interaction
- Coordinates are obtained from UI hierarchy, not screenshots
- Implementation in `src/tools/axe.ts`

### Device Support
- Requires proper code signing configuration in Xcode
- Uses FB frameworks bundled in `bundled/Frameworks/`
- Supports both USB and Wi-Fi connected devices

### Template System
- Project scaffolding templates are external and versioned
- Downloaded on-demand from GitHub releases
- Managed by `src/utils/template-manager.ts`

## Debugging

1. **Server Logs**: Set `LOG_LEVEL=debug` environment variable
2. **MCP Inspector**: Use `npm run inspect` for interactive debugging
3. **Diagnostic Tool**: Run `npm run diagnostic` to check environment
4. **Client Logs**: Check MCP client logs (e.g., Cursor logs in `~/Library/Application Support/Cursor/logs`)

## Contributing Guidelines

### Code Quality Requirements

1. **Follow existing code patterns and structure**
2. **Use TypeScript strictly** - no `any` types, proper typing throughout
3. **Add proper error handling and logging** - all failures must set `isError: true`
4. **Update documentation for new features**
5. **Update TOOLS.md** when adding, modifying, or removing tools
6. **Test with example projects before submitting**

### MANDATORY Pre-Commit Commands

**CRITICAL**: You MUST run these commands before any commit and ensure they all pass:

```bash
# 1. MANDATORY: Run linting (must pass with 0 errors)
npm run lint

# 2. MANDATORY: Run formatting (must format all files)
npm run format

# 3. MANDATORY: Run build (must compile successfully)
npm run build

# 4. MANDATORY: Run tests (all tests must pass)
npm test
```

**NO EXCEPTIONS**: Code that fails any of these commands cannot be committed.

### Testing Requirements

**ENGINEERING VIOLATION ENFORCEMENT**:

- **❌ NEVER** create tests that reimplement production logic
- **❌ NEVER** create mock tool handlers with business logic
- **❌ NEVER** test test code instead of production code
- **✅ ALWAYS** import actual production tool functions
- **✅ ALWAYS** mock external dependencies only (child_process, fs, network)
- **✅ ALWAYS** test all logic paths in production functions
- **✅ ALWAYS** use exact response validation with `.toEqual()`
- **✅ ALWAYS** ensure `isError: true` on all failure scenarios

**Pre-Submit Validation**:
- [ ] All tests import actual production functions from `src/tools/`
- [ ] No mock business logic implementations in test files
- [ ] External dependencies properly mocked (child_process, fs, logger)
- [ ] Complete logic path coverage for all tool functions
- [ ] Exact response format validation in all test assertions

### Sub-Agent Work Standards

**When using sub-agents for systematic changes**:
- Provide specific file assignments and success criteria
- Require autonomous work (no user feedback requests)
- Enforce CLAUDE.md testing principles exactly
- Validate all quality standards before completion
- Ensure parallel execution for maximum efficiency

## Tool Documentation

All available tools are comprehensively documented in **TOOLS.md**, which provides:
- Complete list of all 81 tools organized by category
- Tool names and MCP tool names
- Detailed descriptions and parameter requirements
- Common workflow patterns
- Environment variable configuration

## Common Operations Quick Reference

### Build Commands
- macOS: `build_mac_ws`, `build_mac_proj`
- iOS Simulator: `build_sim_name_ws`, `build_sim_id_ws`
- iOS Device: `build_dev_ws`, `build_dev_proj`
- Swift Package: `swift_package_build`

### Run Commands
- macOS: `launch_mac_app`
- iOS Simulator: `launch_app_sim`
- iOS Device: `launch_app_device`
- Swift Package: `swift_package_run`

### Test Commands
- macOS: `test_macos_ws`, `test_macos_proj`
- iOS Simulator: `test_sim_name_ws`, `test_sim_id_ws`
- iOS Device: `test_device_ws`, `test_device_proj`
- Swift Package: `swift_package_test`