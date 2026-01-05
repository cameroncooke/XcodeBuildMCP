# TEST_RUNNER_ Environment Variables Implementation Plan

## Problem Statement

**GitHub Issue**: [#101 - Support TEST_RUNNER_ prefixed env vars](https://github.com/cameroncooke/XcodeBuildMCP/issues/101)

**Core Need**: Enable conditional test behavior by passing TEST_RUNNER_ prefixed environment variables from MCP client configurations to xcodebuild test processes. This addresses the specific use case of disabling `runsForEachTargetApplicationUIConfiguration` for faster development testing.

## Background Context

### xcodebuild Environment Variable Support

From the xcodebuild man page:
```
TEST_RUNNER_<VAR>   Set an environment variable whose name is prefixed
                    with TEST_RUNNER_ to have that variable passed, with
                    its prefix stripped, to all test runner processes
                    launched during a test action. For example,
                    TEST_RUNNER_Foo=Bar xcodebuild test ... sets the
                    environment variable Foo=Bar in the test runner's
                    environment.
```

### User Requirements

Users want to configure their MCP server with TEST_RUNNER_ prefixed environment variables:

```json
{
  "mcpServers": {
    "XcodeBuildMCP": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "xcodebuildmcp@latest"],
      "env": {
        "TEST_RUNNER_USE_DEV_MODE": "YES"
      }
    }
  }
}
```

And have tests that can conditionally execute based on these variables:

```swift
func testFoo() throws {
  let useDevMode = ProcessInfo.processInfo.environment["USE_DEV_MODE"] == "YES"
  guard useDevMode else {
    XCTFail("Test requires USE_DEV_MODE to be true")
    return
  }
  // Test logic here...
}
```

## Current Architecture Analysis

### XcodeBuildMCP Execution Flow
1. All Xcode commands flow through `executeXcodeBuildCommand()` function
2. Generic `CommandExecutor` interface handles all command execution
3. Test tools exist for device/simulator/macOS platforms
4. Zod schemas provide parameter validation and type safety

### Key Files in Current Architecture
- `src/utils/CommandExecutor.ts` - Command execution interface
- `src/utils/build-utils.ts` - Contains `executeXcodeBuildCommand`
- `src/mcp/tools/device/test_device.ts` - Device testing tool
- `src/mcp/tools/simulator/test_sim.ts` - Simulator testing tool  
- `src/mcp/tools/macos/test_macos.ts` - macOS testing tool
- `src/utils/test/index.ts` - Shared test logic for simulator

## Solution Analysis

### Design Options Considered

1. **Automatic Detection** (❌ Rejected)
   - Scan `process.env` for TEST_RUNNER_ variables and always pass them
   - **Issue**: Security risk of environment variable leakage
   - **Issue**: Unpredictable behavior based on server environment

2. **Explicit Parameter** (✅ Chosen)
   - Add `testRunnerEnv` parameter to test tools
   - Users explicitly specify which variables to pass
   - **Benefits**: Secure, predictable, well-validated

3. **Hybrid Approach** (🤔 Future Enhancement)
   - Both automatic + explicit with explicit overriding
   - **Issue**: Adds complexity, deferred for future consideration

### Expert Analysis Summary

**RepoPrompt Analysis**: Comprehensive architectural plan emphasizing security, type safety, and integration with existing patterns.

**Gemini Analysis**: Confirmed explicit approach as optimal, highlighting:
- Security benefits of explicit allow-list approach
- Architectural soundness of extending CommandExecutor
- Recommendation for automatic prefix handling for better UX

## Recommended Solution: Explicit Parameter with Automatic Prefix Handling

### Key Design Decisions

1. **Security-First**: Only explicitly provided variables are passed (no automatic process.env scanning)
2. **User Experience**: Automatic prefix handling - users provide unprefixed keys
3. **Architecture**: Extend execution layer generically for future extensibility  
4. **Validation**: Zod schema enforcement with proper type safety

### User Experience Design

**Input** (what users specify):
```json
{
  "testRunnerEnv": {
    "USE_DEV_MODE": "YES",
    "runsForEachTargetApplicationUIConfiguration": "NO"
  }
}
```

**Output** (what gets passed to xcodebuild):
```bash
TEST_RUNNER_USE_DEV_MODE=YES \
TEST_RUNNER_runsForEachTargetApplicationUIConfiguration=NO \
xcodebuild test ...
```

## Implementation Plan

### Phase 0: Test-Driven Development Setup

**Objective**: Create reproduction test to validate issue and later prove fix works

#### Tasks:
- [ ] Create test in `example_projects/iOS/MCPTest` that checks for environment variable
- [ ] Run current test tools to demonstrate limitation (test should fail)
- [ ] Document baseline behavior

**Test Code Example**:
```swift
func testEnvironmentVariablePassthrough() throws {
  let useDevMode = ProcessInfo.processInfo.environment["USE_DEV_MODE"] == "YES"
  guard useDevMode else {
    XCTFail("Test requires USE_DEV_MODE=YES via TEST_RUNNER_USE_DEV_MODE")
    return
  }
  XCTAssertTrue(true, "Environment variable successfully passed through")
}
```

### Phase 1: Core Infrastructure Updates

**Objective**: Extend CommandExecutor and build utilities to support environment variables

#### 1.1 Update CommandExecutor Interface

**File**: `src/utils/CommandExecutor.ts`

**Changes**:
- Add `CommandExecOptions` type for execution options
- Update `CommandExecutor` type signature to accept optional execution options

```typescript
export type CommandExecOptions = {
  cwd?: string;
  env?: Record<string, string | undefined>;
};

export type CommandExecutor = (
  args: string[],
  description?: string,
  quiet?: boolean,
  opts?: CommandExecOptions
) => Promise<CommandResponse>;
```

#### 1.2 Update Execution Facade

**File**: `src/utils/execution/index.ts`

**Changes**:
- Re-export `CommandExecOptions` type

```typescript
export type { CommandExecutor, CommandResponse, CommandExecOptions } from '../CommandExecutor.js';
```

#### 1.3 Update Default Command Executor

**File**: `src/utils/command.ts`

**Changes**:
- Modify `getDefaultCommandExecutor` to merge `opts.env` with `process.env` when spawning

```typescript
// In the returned function:
const env = { ...process.env, ...(opts?.env ?? {}) };
// Pass env and opts?.cwd to spawn/exec call
```

#### 1.4 Create Environment Variable Utility

**File**: `src/utils/environment.ts`

**Changes**:
- Add `normalizeTestRunnerEnv` function

```typescript
export function normalizeTestRunnerEnv(
  userVars?: Record<string, string | undefined>
): Record<string, string> {
  const result: Record<string, string> = {};
  if (userVars) {
    for (const [key, value] of Object.entries(userVars)) {
      if (value !== undefined) {
        result[`TEST_RUNNER_${key}`] = value;
      }
    }
  }
  return result;
}
```

#### 1.5 Update executeXcodeBuildCommand

**File**: `src/utils/build-utils.ts`

**Changes**:
- Add optional `execOpts?: CommandExecOptions` parameter (6th parameter)
- Pass execution options through to `CommandExecutor` calls

```typescript
export async function executeXcodeBuildCommand(
  build: { /* existing fields */ },
  runtime: { /* existing fields */ },
  preferXcodebuild = false,
  action: 'build' | 'test' | 'archive' | 'analyze' | string,
  executor: CommandExecutor = getDefaultCommandExecutor(),
  execOpts?: CommandExecOptions, // NEW
): Promise<ToolResponse>
```

### Phase 2: Test Tool Integration

**Objective**: Add `testRunnerEnv` parameter to all test tools and wire through execution

#### 2.1 Update Device Test Tool

**File**: `src/mcp/tools/device/test_device.ts`

**Changes**:
- Add `testRunnerEnv` to Zod schema with validation
- Import and use `normalizeTestRunnerEnv`
- Pass execution options to `executeXcodeBuildCommand`

**Schema Addition**:
```typescript
testRunnerEnv: z
  .record(z.string(), z.string().optional())
  .optional()
  .describe('Test runner environment variables (TEST_RUNNER_ prefix added automatically)')
```

**Usage**:
```typescript
const execEnv = normalizeTestRunnerEnv(params.testRunnerEnv);
const testResult = await executeXcodeBuildCommand(
  { /* build params */ },
  { /* runtime params */ },
  params.preferXcodebuild ?? false,
  'test',
  executor,
  { env: execEnv } // NEW
);
```

#### 2.2 Update macOS Test Tool

**File**: `src/mcp/tools/macos/test_macos.ts`

**Changes**: Same pattern as device test tool
- Schema addition for `testRunnerEnv`
- Import `normalizeTestRunnerEnv` 
- Pass execution options to `executeXcodeBuildCommand`

#### 2.3 Update Simulator Test Tool and Logic

**File**: `src/mcp/tools/simulator/test_sim.ts`

**Changes**:
- Add `testRunnerEnv` to schema
- Pass through to `handleTestLogic`

**File**: `src/utils/test/index.ts`

**Changes**:
- Update `handleTestLogic` signature to accept `testRunnerEnv?: Record<string, string | undefined>`
- Import and use `normalizeTestRunnerEnv`
- Pass execution options to `executeXcodeBuildCommand`

### Phase 3: Testing and Validation

**Objective**: Comprehensive testing coverage for new functionality

#### 3.1 Unit Tests

**File**: `src/utils/__tests__/environment.test.ts`

**Tests**:
- Test `normalizeTestRunnerEnv` with various inputs
- Verify prefix addition
- Verify undefined filtering
- Verify empty input handling

#### 3.2 Integration Tests  

**Files**: Update existing test files for test tools

**Tests**:
- Verify `testRunnerEnv` parameter is properly validated
- Verify environment variables are passed through `CommandExecutor`
- Mock executor to verify correct env object construction

#### 3.3 Tool Export Validation

**Files**: Test files in each tool directory

**Tests**:
- Verify schema exports include new `testRunnerEnv` field
- Verify parameter typing is correct

### Phase 4: End-to-End Validation

**Objective**: Prove the fix works with real xcodebuild scenarios

#### 4.1 Reproduction Test Validation

**Tasks**:
- Run reproduction test from Phase 0 with new `testRunnerEnv` parameter
- Verify test passes (proving env var was successfully passed)
- Document the before/after behavior

#### 4.2 Real-World Scenario Testing

**Tasks**:
- Test with actual iOS project using `runsForEachTargetApplicationUIConfiguration`
- Verify performance difference when variable is set
- Test with multiple environment variables
- Test edge cases (empty values, special characters)

## Security Considerations

### Security Benefits
- **No Environment Leakage**: Only explicit user-provided variables are passed
- **Command Injection Prevention**: Environment variables passed as separate object, not interpolated into command string
- **Input Validation**: Zod schemas prevent malformed inputs
- **Prefix Enforcement**: Only TEST_RUNNER_ prefixed variables can be set

### Security Best Practices
- Never log environment variable values (keys only for debugging)
- Filter out undefined values to prevent accidental exposure
- Validate all user inputs through Zod schemas
- Document supported TEST_RUNNER_ variables from Apple's documentation

## Architectural Benefits

### Clean Integration
- Extends existing `CommandExecutor` pattern generically
- Maintains backward compatibility (all existing calls remain valid)
- Follows established Zod validation patterns
- Consistent API across all test tools

### Future Extensibility  
- `CommandExecOptions` can support additional execution options (timeout, cwd, etc.)
- Pattern can be extended to other tools that need environment variables
- Generic approach allows for non-TEST_RUNNER_ use cases in the future

## File Modification Summary

### New Files
- `src/utils/__tests__/environment.test.ts` - Unit tests for environment utilities

### Modified Files
- `src/utils/CommandExecutor.ts` - Add execution options types
- `src/utils/execution/index.ts` - Re-export new types  
- `src/utils/command.ts` - Update default executor to handle env
- `src/utils/environment.ts` - Add `normalizeTestRunnerEnv` utility
- `src/utils/build-utils.ts` - Update `executeXcodeBuildCommand` signature
- `src/mcp/tools/device/test_device.ts` - Add schema and integration
- `src/mcp/tools/macos/test_macos.ts` - Add schema and integration
- `src/mcp/tools/simulator/test_sim.ts` - Add schema and pass-through
- `src/utils/test/index.ts` - Update `handleTestLogic` for simulator path
- Test files for each modified tool - Add validation tests

## Success Criteria

1. **Functionality**: Users can pass `testRunnerEnv` parameter to test tools and have variables appear in test runner environment
2. **Security**: No unintended environment variable leakage from server process
3. **Usability**: Users specify unprefixed variable names for better UX
4. **Compatibility**: All existing test tool calls continue to work unchanged
5. **Validation**: Comprehensive test coverage proves the feature works end-to-end

## Future Enhancements (Out of Scope)

1. **Configuration Profiles**: Allow users to define common TEST_RUNNER_ variable sets in config files
2. **Variable Discovery**: Help users discover available TEST_RUNNER_ variables
3. **Build Tool Support**: Extend to build tools if Apple adds similar BUILD_RUNNER_ support
4. **Performance Monitoring**: Track impact of environment variable passing on build times

## Implementation Timeline

- **Phase 0**: 1-2 hours (reproduction test setup)
- **Phase 1**: 4-6 hours (infrastructure changes)
- **Phase 2**: 3-4 hours (tool integration)
- **Phase 3**: 4-5 hours (testing)  
- **Phase 4**: 2-3 hours (validation)

**Total Estimated Time**: 14-20 hours

## Conclusion

This implementation plan provides a secure, user-friendly, and architecturally sound solution for TEST_RUNNER_ environment variable support. The explicit parameter approach with automatic prefix handling balances security concerns with user experience, while the test-driven development approach ensures we can prove the solution works as intended.

The plan leverages XcodeBuildMCP's existing patterns and provides a foundation for future environment variable needs across the tool ecosystem.