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

**Mock Patterns**:
```typescript
// Node.js API mocking (don't execute real commands)
vi.mock('child_process', () => ({
  spawn: vi.fn(() => mockChildProcess)
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(), 
  unlink: vi.fn()
}));
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

When adding a new tool, create corresponding test with this pattern:
```typescript
// tests-vitest/src/tools/[tool-file].test.ts
import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { callToolHandler } from '../../helpers/vitest-tool-helpers.js';
import { myNewTool } from '../../../src/tools/my-tool-file.js';

vi.mock('child_process', () => ({ spawn: vi.fn() }));

describe('[tool-name] tests', () => {
  let mockSpawn: MockedFunction<any>;
  let mockChildProcess: Partial<ChildProcess>;

  beforeEach(async () => {
    const { spawn: nodeSpawn } = await import('node:child_process');
    mockSpawn = nodeSpawn as MockedFunction<any>;
    
    mockChildProcess = {
      stdout: { on: vi.fn((event, callback) => {
        if (event === 'data') callback('SUCCESS OUTPUT');
      }) } as any,
      stderr: { on: vi.fn() } as any,
      on: vi.fn((event, callback) => {
        if (event === 'close') callback(0);
      })
    };
    
    mockSpawn.mockReturnValue(mockChildProcess as ChildProcess);
    vi.clearAllMocks();
  });

  describe('parameter validation', () => {
    it('should reject missing required parameters', async () => {
      const result = await callToolHandler(myNewTool, {});
      expect(result.content).toEqual([
        { type: 'text', text: "Required parameter 'paramName' is missing. Please provide a value for this parameter." }
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('success scenarios', () => {
    it('should return deterministic success response', async () => {
      const params = { paramName: 'validValue' };
      const result = await callToolHandler(myNewTool, params);
      
      // CRITICAL: Use exact response validation (no .toContain())
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Tool operation succeeded.' },
        { type: 'text', text: 'Output: SUCCESS OUTPUT' }
      ]);
      expect(result.isError).toBe(false);
      
      // Verify command generation
      expect(mockSpawn).toHaveBeenCalledWith('expected-command', expect.any(Array), expect.any(Object));
    });
  });
});
```

**Critical Requirements**:
- Use `callToolHandler()` for consistent tool testing  
- Mock Node.js APIs to prevent real command execution
- Validate complete response structure with `.toEqual()` (never `.toContain()`)
- Test parameter validation, success cases, and error handling
- Verify command generation without execution

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

1. Follow existing code patterns and structure
2. Use TypeScript strictly - no `any` types
3. Add proper error handling and logging
4. Update documentation for new features
5. **Update TOOLS.md** when adding, modifying, or removing tools
6. Test with example projects before submitting
7. Run lint and format checks before committing

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