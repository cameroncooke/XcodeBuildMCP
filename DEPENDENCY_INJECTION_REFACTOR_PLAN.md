# Dependency Injection Refactoring Plan

## Issue We're Fixing

### Current Problems
1. **Runtime Type Mismatches**: The `wrapHandlerWithExecutor` in `index.ts` uses string matching to determine which dependencies to inject, leading to runtime errors when the wrong number/type of parameters are passed.
2. **Brittle String Matching**: Checking `handlerString.includes('fileSystemExecutor')` is error-prone and lacks type safety.
3. **Complex Conditional Logic**: Overlapping conditions cause handlers to receive wrong parameters (e.g., CommandExecutor passed as FileSystemExecutor).
4. **Testing Complexity**: Current approach mixes production and testing concerns in the same handler signature.

### Root Cause
MCP protocol requires handlers to accept only `(args: Record<string, unknown>)`, but we need dependency injection for testing. The current solution of adding optional parameters with defaults has proven unreliable.

## Proposed Solution: Separation of Concerns Pattern

### Pattern Overview
```typescript
// 1. Pure business logic function (exported for testing)
export async function toolNameLogic(
  params: ParamType,
  executor: CommandExecutor,
  fs?: FileSystemExecutor
): Promise<ToolResponse> {
  // All actual implementation here
}

// 2. MCP handler (thin wrapper)
export default {
  name: 'tool_name',
  description: '...',
  schema: { ... },
  handler: async (args: Record<string, unknown>) => {
    return toolNameLogic(args, getDefaultCommandExecutor(), getDefaultFileSystemExecutor());
  }
};

// 3. Tests call logic directly
test('tool behavior', async () => {
  const result = await toolNameLogic(params, mockExecutor, mockFs);
  expect(result).toEqual(...);
});
```

### Benefits
- **Zero Magic**: No string matching, no wrappers
- **100% Type Safe**: TypeScript validates all parameter types at compile time
- **Clean Separation**: MCP concerns separated from business logic
- **Direct Testing**: Tests call logic functions directly with mocks
- **Backwards Compatible**: MCP still sees the same handler interface

## Implementation Process

### Phase 0: Validation Script Setup
We've created `scripts/check-separation-of-concerns.js` that checks for:
- Exported logic functions (e.g., `toolNameLogic`)
- Handler functions without optional parameters
- Handlers that are thin wrappers (≤5 lines)

Run: `node scripts/check-separation-of-concerns.js` to see current violations.

### Phase 1: Setup Infrastructure
1. Remove `wrapHandlerWithExecutor` from `index.ts`
2. Update plugin loading to use handlers directly
3. Ensure all imports/exports work correctly

### Phase 2: Tool Refactoring

#### Refactoring Steps Per Tool
1. Extract handler logic into a separate `{toolName}Logic` function
2. Add proper TypeScript types for parameters
3. Update handler to be a thin wrapper calling the logic function
4. Update tests to call logic function directly
5. Remove mock executor creation from tests (use imported ones)
6. **Use targeted serial edits** - Never rewrite entire files
   - Use `Edit` tool with specific old_string/new_string
   - Make incremental changes to preserve existing code structure
   - Avoid using `Write` tool on existing files
7. Verify tool works via MCP
8. Run tests and ensure they pass

### Phase 3: Categories of Tools

#### Category A: CommandExecutor Only (~60 tools)
- Pattern: `toolLogic(params, executor)`
- Examples: build tools, simulator tools, device tools

#### Category B: FileSystemExecutor Only (~10 tools)
- Pattern: `toolLogic(params, fs)`  
- Examples: discover_projs, file operations

#### Category C: Both Executors (~5 tools)
- Pattern: `toolLogic(params, executor, fs)`
- Examples: screenshot, scaffold tools

#### Category D: Special Dependencies (~5 tools)
- ProcessManager: Swift package tools
- SyncExecutor: Bundle ID extraction tools
- MockUtilities: Diagnostic tool

## Execution Strategy

### Main Agent Orchestration
1. **Parallel Execution**: Launch 5-10 sub-agents simultaneously
2. **File Assignment**: Each sub-agent assigned exactly ONE tool file
3. **Independent Work**: Sub-agents work without conflicts
4. **Atomic Commits**: Commit each file individually after validation

### Sub-Agent Instructions
```
You are Sub-Agent [N]. Your task:
1. Refactor ONE tool: [tool_name.ts]
2. Follow the Separation of Concerns pattern exactly
3. Extract logic into exported {toolName}Logic function
4. Update tests to call logic directly
5. Run: npm test -- path/to/your/tests
6. Report completion to main agent
```

### Validation Per File
1. **Separation Check**: `node scripts/check-separation-of-concerns.js` (ensure tool no longer shows violations)
2. **Test Execution**: `npm test -- src/plugins/[category]/__tests__/[tool].test.ts`
3. **Build Check**: `npm run build` (ensure no compilation errors)
4. **MCP Test**: Use `mcp__XcodeBuildMCP__call_tool` to verify tool works
5. **Commit**: Only after all validations pass

### Commit Strategy
```bash
# After each tool is validated
git add src/plugins/[category]/[tool].ts
git add src/plugins/[category]/__tests__/[tool].test.ts
git commit -m "refactor: apply separation of concerns to [tool] tool"
```

## Progress Tracking

### Tools to Refactor (Total: ~84)

#### High Priority (Fix first)
- [ ] discover_projs (known issue with executor)
- [ ] diagnostic (mock utilities issue)
- [ ] screenshot (both executors)
- [ ] stop_device_log_cap (schema fix applied)
- [ ] stop_sim_log_cap (schema fix applied)
- [ ] start_device_log_cap (schema fix applied)
- [ ] get_app_bundle_id (schema fix applied)
- [ ] get_mac_bundle_id (schema fix applied)

#### Device Project Tools (3)
- [ ] build_dev_proj
- [ ] get_device_app_path_proj
- [ ] test_device_proj

#### Device Shared Tools (4)
- [ ] install_app_device
- [ ] launch_app_device
- [ ] list_devices
- [ ] stop_app_device

#### Device Workspace Tools (3)
- [ ] build_dev_ws
- [ ] get_device_app_path_ws
- [ ] test_device_ws

#### Diagnostics Tools (1)
- [ ] diagnostic

#### Discovery Tools (1)
- [ ] discover_tools

#### Logging Tools (4)
- [ ] start_device_log_cap
- [ ] start_sim_log_cap
- [ ] stop_device_log_cap
- [ ] stop_sim_log_cap

#### macOS Project Tools (4)
- [ ] build_mac_proj
- [ ] build_run_mac_proj
- [ ] get_mac_app_path_proj
- [ ] test_macos_proj

#### macOS Shared Tools (2)
- [ ] launch_mac_app
- [ ] stop_mac_app

#### macOS Workspace Tools (4)
- [ ] build_mac_ws
- [ ] build_run_mac_ws
- [ ] get_mac_app_path_ws
- [ ] test_macos_ws

#### Project Discovery Tools (7)
- [ ] discover_projs
- [ ] get_app_bundle_id
- [ ] get_mac_bundle_id
- [ ] list_schems_proj
- [ ] list_schems_ws
- [ ] show_build_set_proj
- [ ] show_build_set_ws

#### Simulator Project Tools (8)
- [ ] build_run_sim_id_proj
- [ ] build_run_sim_name_proj
- [ ] build_sim_id_proj
- [ ] build_sim_name_proj
- [ ] get_sim_app_path_id_proj
- [ ] get_sim_app_path_name_proj
- [ ] test_sim_id_proj
- [ ] test_sim_name_proj

#### Simulator Shared Tools (12)
- [ ] boot_sim
- [ ] install_app_sim
- [ ] launch_app_logs_sim
- [ ] launch_app_sim
- [ ] list_sims
- [ ] open_sim
- [ ] reset_network_condition
- [ ] reset_simulator_location
- [ ] set_network_condition
- [ ] set_sim_appearance
- [ ] set_simulator_location
- [ ] stop_app_sim

#### Simulator Workspace Tools (10)
- [ ] build_run_sim_id_ws
- [ ] build_run_sim_name_ws
- [ ] build_sim_id_ws
- [ ] build_sim_name_ws
- [ ] get_sim_app_path_id_ws
- [ ] get_sim_app_path_name_ws
- [ ] launch_app_sim_name_ws
- [ ] stop_app_sim_name_ws
- [ ] test_sim_id_ws
- [ ] test_sim_name_ws

#### Swift Package Tools (6)
- [ ] swift_package_build
- [ ] swift_package_clean
- [ ] swift_package_list
- [ ] swift_package_run
- [ ] swift_package_stop
- [ ] swift_package_test

#### UI Testing Tools (11)
- [ ] button
- [ ] describe_ui
- [ ] gesture
- [ ] key_press
- [ ] key_sequence
- [ ] long_press
- [ ] screenshot
- [ ] swipe
- [ ] tap
- [ ] touch
- [ ] type_text

#### Utilities Tools (4)
- [ ] clean_proj
- [ ] clean_ws
- [ ] scaffold_ios_project
- [ ] scaffold_macos_project

## Success Criteria

### Per Tool
- [ ] Logic extracted into separate function
- [ ] Handler is thin wrapper only
- [ ] Tests call logic directly
- [ ] No vitest mocking used
- [ ] Tool works via MCP
- [ ] All tests pass

### Overall
- [ ] Zero string matching for dependency injection
- [ ] No wrapHandlerWithExecutor needed
- [ ] 100% type safety
- [ ] All 84 tools refactored
- [ ] All tests passing
- [ ] Build succeeds
- [ ] MCP server starts without errors

## Canonical Requirements

1. **No Vitest Mocking**: Use only `createMockExecutor` and `createMockFileSystemExecutor`
2. **MCP Compliance**: Handlers must accept only `(args: Record<string, unknown>)`
3. **Type Safety**: All parameters must be properly typed
4. **Test Coverage**: Maintain 95%+ coverage
5. **Performance**: Tests must run in <100ms per test
6. **Error Handling**: Return `{ isError: true }`, never throw
7. **Literal Expectations**: Use exact strings in test assertions

## Risk Mitigation

1. **Incremental Commits**: Each tool committed separately
2. **Parallel Safety**: No two agents work on same file
3. **Rollback Plan**: Git history allows reverting individual tools
4. **Continuous Validation**: Test after each change

## Timeline Estimate

- **Setup Phase**: 30 minutes
- **Per Tool**: ~10-15 minutes
- **Total Estimate**: 8-12 hours with parallel execution

---

**Ready for Review?** This plan ensures systematic refactoring with zero downtime and maintains all our architectural principles.