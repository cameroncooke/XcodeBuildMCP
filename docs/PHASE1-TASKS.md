## Phase 1: Tool Consolidation Plan

### Overview
Consolidate all project/workspace tool pairs (e.g., `tool_proj` and `tool_ws`) into single canonical tools with XOR validation for `projectPath` vs `workspacePath`. Each unified tool will be re-exported to maintain compatibility with existing workflow groups.

### Consolidation Strategy

#### Tool Implementation Pattern
1. **Create unified tool** with XOR validation:
   - Accept both `projectPath` and `workspacePath` as optional parameters
   - Add validation to ensure exactly one is provided (mutually exclusive)
   - Use helper function to convert empty strings to undefined
   - Maintain all existing business logic unchanged

2. **Placement**: Put canonical tool in most logical workflow:
   - `utilities/` for general tools (clean)
   - `project-discovery/` for discovery tools (list_schemes, show_build_set)
   - Tool-specific workflow for specialized tools

3. **Re-exports**: Create `toolname.ts` re-export in each workflow that needs it:
   ```typescript
   // Re-export unified tool for [workflow-name] workflow
   export { default } from '../[canonical-location]/[toolname].js';
   ```

4. **Cleanup**: Delete old `tool_proj.ts` and `tool_ws.ts` files from all locations

#### Test Preservation Strategy (CRITICAL)
**DO NOT REWRITE TESTS** - Preserve existing test coverage by migrating and adapting:

1. **Choose base test file**: Select the more comprehensive test between `_proj` and `_ws` versions

2. **Move test file FIRST (before any edits)**:
   ```bash
   # Use git mv to preserve history
   git mv src/mcp/tools/[location]/__tests__/tool_proj.test.ts \
          src/mcp/tools/[canonical-location]/__tests__/tool.test.ts
   
   # Stage the move immediately
   git add -A
   
   # IMPORTANT: Commit the move BEFORE making any edits
   git commit -m "chore: move tool_proj test to unified location"
   ```
   
3. **THEN make surgical edits** (as a separate commit):
   - Update imports to reference unified tool
   - Add XOR validation tests (neither/both parameter cases)
   - Adapt existing tests to handle both project and workspace paths
   - Keep all existing test logic and assertions intact
   
4. **Commit the adaptations separately**:
   ```bash
   git add src/mcp/tools/[canonical-location]/__tests__/tool.test.ts
   git commit -m "test: adapt tool tests for unified project/workspace support"
   ```

**Why this matters**: Git tracks file moves better when the move is committed before edits. If you edit first or create a new file, Git sees it as a delete + add, losing history.

### Tools to Consolidate

#### ✅ Completed

**Consolidation Tools:**
1. **clean** (utilities/) - DONE
   - [x] Unified tool created
   - [x] Re-exported to 6 workflows
   - [x] Old files deleted
   - [x] Tests created

2. **list_schemes** (project-discovery/) - DONE
   - [x] Unified tool created  
   - [x] Re-exported to 6 workflows
   - [x] Old files deleted
   - [x] Tests preserved using git mv + adaptations

3. **show_build_settings** (project-discovery/) - DONE
   - [x] Unified tool created
   - [x] Re-exported to 6 workflows
   - [x] Old files deleted
   - [x] Tests preserved using git mv + adaptations

**Build Tools:**
4. **build_device** (device-shared/) - DONE
   - [x] Unified tool created
   - [x] Re-exported to device-project and device-workspace
   - [x] Old files deleted
   - [x] Tests preserved using git mv + adaptations

5. **build_macos** (macos-shared/) - DONE
   - [x] Unified tool created
   - [x] Re-exported to macos-project and macos-workspace
   - [x] Old files deleted
   - [x] Tests preserved using git mv + adaptations

6. **build_simulator_id** (simulator-shared/) - DONE
   - [x] Unified tool created
   - [x] Re-exported to simulator-project and simulator-workspace
   - [x] Old files deleted
   - [x] Tests preserved using git mv + adaptations

7. **build_simulator_name** (simulator-shared/) - DONE
   - [x] Unified tool created
   - [x] Re-exported to simulator-project and simulator-workspace
   - [x] Old files deleted
   - [x] Tests preserved using git mv + adaptations

**Build & Run Tools:**
8. **build_run_macos** (macos-shared/) - DONE
   - [x] Unified tool created
   - [x] Re-exported to macos-project and macos-workspace
   - [x] Old files deleted
   - [x] Tests preserved using git mv + adaptations

9. **build_run_simulator_id** (simulator-shared/) - DONE
   - [x] Unified tool created
   - [x] Re-exported to simulator-project and simulator-workspace
   - [x] Old files deleted
   - [x] Tests preserved using git mv + adaptations

10. **build_run_simulator_name** (simulator-shared/) - DONE
    - [x] Unified tool created
    - [x] Re-exported to simulator-project and simulator-workspace
    - [x] Old files deleted
    - [x] Tests preserved using git mv + adaptations

**App Path Tools:**
11. **get_device_app_path** (device-shared/) - DONE
    - [x] Unified tool created
    - [x] Re-exported to device-project and device-workspace
    - [x] Old files deleted
    - [x] Tests preserved using git mv + adaptations

12. **get_macos_app_path** (macos-shared/) - DONE
    - [x] Unified tool created
    - [x] Re-exported to macos-project and macos-workspace
    - [x] Old files deleted
    - [x] Tests preserved using git mv + adaptations

13. **get_simulator_app_path_id** (simulator-shared/) - DONE
    - [x] Unified tool created
    - [x] Re-exported to simulator-project and simulator-workspace
    - [x] Old files deleted
    - [x] Tests preserved using git mv + adaptations

14. **get_simulator_app_path_name** (simulator-shared/) - DONE
    - [x] Unified tool created
    - [x] Re-exported to simulator-project and simulator-workspace
    - [x] Old files deleted
    - [x] Tests preserved using git mv + adaptations

**Test Tools:**
15. **test_device** (device-shared/) - DONE
    - [x] Unified tool created
    - [x] Re-exported to device-project and device-workspace
    - [x] Old files deleted
    - [x] Tests preserved using git mv + adaptations

16. **test_macos** (macos-shared/) - DONE
    - [x] Unified tool created
    - [x] Re-exported to macos-project and macos-workspace
    - [x] Old files deleted
    - [x] Tests preserved using git mv + adaptations

17. **test_simulator_id** (simulator-shared/) - DONE
    - [x] Unified tool created
    - [x] Re-exported to simulator-project and simulator-workspace
    - [x] Old files deleted
    - [x] Tests preserved using git mv + adaptations

18. **test_simulator_name** (simulator-shared/) - DONE
    - [x] Unified tool created
    - [x] Re-exported to simulator-project and simulator-workspace
    - [x] Old files deleted
    - [x] Tests preserved using git mv + adaptations

#### 🔄 In Progress
None currently

#### 📋 Remaining Tools
None - All tools have been successfully consolidated!

### Workflow for Each Tool

1. **Analyze existing implementations**:
   ```bash
   # Compare project and workspace versions
   diff src/mcp/tools/*/tool_proj.ts src/mcp/tools/*/tool_ws.ts
   
   # Check which test is more comprehensive
   wc -l src/mcp/tools/*/__tests__/tool_proj.test.ts
   wc -l src/mcp/tools/*/__tests__/tool_ws.test.ts
   ```

2. **Create unified tool**:
   - Copy more complete version as base
   - Add XOR validation for projectPath/workspacePath
   - Adjust logic to handle both cases
   - Commit this change first

3. **Preserve tests (CRITICAL ORDER)**:
   ```bash
   # Step 3a: Move test file WITHOUT any edits
   git mv src/mcp/tools/[location]/__tests__/tool_proj.test.ts \
          src/mcp/tools/[canonical]/__tests__/tool.test.ts
   
   # Step 3b: Stage and commit the move IMMEDIATELY
   git add -A
   git commit -m "chore: move tool_proj test to unified location"
   
   # Step 3c: NOW make edits to the moved file
   # - Update imports
   # - Add XOR validation tests
   # - Adapt for both project/workspace
   
   # Step 3d: Commit the edits as a separate commit
   git add src/mcp/tools/[canonical]/__tests__/tool.test.ts
   git commit -m "test: adapt tool tests for unified project/workspace"
   ```

4. **Create re-exports**:
   ```bash
   # For each workflow that had the tool
   for workflow in device-project device-workspace macos-project macos-workspace simulator-project simulator-workspace; do
     echo "// Re-export unified tool for $workflow workflow" > \
       src/mcp/tools/$workflow/tool.ts
     echo "export { default } from '../[canonical]/tool.js';" >> \
       src/mcp/tools/$workflow/tool.ts
   done
   ```

5. **Clean up old files**:
   ```bash
   # Delete old tool files
   git rm src/mcp/tools/*/tool_proj.ts
   git rm src/mcp/tools/*/tool_ws.ts
   
   # Delete the test file that wasn't moved
   git rm src/mcp/tools/*/__tests__/tool_ws.test.ts
   
   # Commit the cleanup
   git commit -m "chore: remove old project/workspace specific tool files"
   ```

6. **Validate**:
   ```bash
   npm run build
   npm run test -- src/mcp/tools/[canonical]/__tests__/tool.test.ts
   npm run lint
   npm run format
   
   # If all passes, commit any formatting changes
   git add -A
   git commit -m "chore: format unified tool code"
   ```

### Common Patterns

#### XOR Validation Helper
```typescript
// Convert empty strings to undefined
function nullifyEmptyStrings(value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const copy: Record<string, unknown> = { ...(value as Record<string, unknown>) };
    for (const key of Object.keys(copy)) {
      const v = copy[key];
      if (typeof v === 'string' && v.trim() === '') copy[key] = undefined;
    }
    return copy;
  }
  return value;
}
```

#### Schema Pattern
```typescript
const baseSchema = z.preprocess(nullifyEmptyStrings, baseSchemaObject);

const toolSchema = baseSchema
  .refine((val) => val.projectPath !== undefined || val.workspacePath !== undefined, {
    message: 'Either projectPath or workspacePath is required.',
  })
  .refine((val) => !(val.projectPath !== undefined && val.workspacePath !== undefined), {
    message: 'projectPath and workspacePath are mutually exclusive. Provide only one.',
  });
```

#### Test Adaptation Pattern
```typescript
// Add to existing test file after moving with mv:

describe('XOR Validation', () => {
  it('should error when neither projectPath nor workspacePath provided', async () => {
    const result = await plugin.handler({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Either projectPath or workspacePath is required');
  });

  it('should error when both provided', async () => {
    const result = await plugin.handler({
      projectPath: '/path/project.xcodeproj',
      workspacePath: '/path/workspace.xcworkspace',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('mutually exclusive');
  });
});
```

### Success Criteria
- [x] All project/workspace tool pairs consolidated
- [x] Tests preserved (not rewritten) with high coverage
- [x] No regressions in functionality
- [x] All workflow groups maintain same tool availability
- [x] Build, lint, and tests pass
- [x] Tool count reduced by ~50% (from pairs to singles)

### Notes
- Phase 2 will consolidate workflow groups themselves
- Tool names may be refined during consolidation for clarity
- Empty string handling is critical for MCP clients that send "" instead of undefined