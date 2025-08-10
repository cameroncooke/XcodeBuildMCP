# Tool Consolidation Orchestration Guide

## Purpose
This document provides strict guidelines for orchestrating multiple AI agents to consolidate project/workspace tool pairs in parallel. Each agent works on ONE specific tool consolidation to avoid conflicts.

## Critical Rules for Master Orchestrator

### 1. Agent Isolation
- **ONE tool per agent** - Never assign multiple tools to a single agent
- **Explicit tool naming** - Always specify the exact tool name (e.g., "show_build_set_proj/ws" not "build settings tools")
- **No generalization** - Never use phrases like "consolidate similar tools" or "work on related tools"

### 2. Git Conflict Prevention
Each agent MUST:
- Only commit files related to their specific tool
- Never use `git add -A` or `git add .`
- Stage files explicitly by path
- Create focused, tool-specific commits

### 3. Required Context for Each Agent
Every agent task MUST include:
1. Link to `/Volumes/Developer/XcodeBuildMCP-unify/docs/PHASE1-TASKS.md`
2. The specific tool pair to consolidate (exact names)
3. The canonical location for the unified tool
4. Explicit file paths that will be modified
5. Git workflow requirements (preserve test history)

## Agent Task Template

```markdown
## Task: Consolidate [TOOL_NAME] 

### Scope
You will ONLY work on consolidating the `[tool_proj]` and `[tool_ws]` pair into a single `[unified_tool_name]` tool.

### Context
- Read the complete consolidation strategy: `/Volumes/Developer/XcodeBuildMCP-unify/docs/PHASE1-TASKS.md`
- Study the completed example: `list_schemes` in `src/mcp/tools/project-discovery/`
- Follow the XOR validation pattern from `src/mcp/tools/utilities/clean.ts`

### Your Specific Files
**Canonical tool location**: `src/mcp/tools/[workflow]/[tool_name].ts`

**Files you will CREATE**:
- `src/mcp/tools/[workflow]/[tool_name].ts` (unified tool)

**Files you will MOVE (using git mv)**:
- Choose the more comprehensive test between:
  - `src/mcp/tools/[location]/__tests__/[tool]_proj.test.ts`
  - `src/mcp/tools/[location]/__tests__/[tool]_ws.test.ts`
- Move to: `src/mcp/tools/[workflow]/__tests__/[tool_name].test.ts`

**Re-exports you will CREATE**:
- List each workflow that needs re-export

**Files you will DELETE**:
- List all old tool files to be removed

### Git Workflow (CRITICAL)
1. Create the unified tool and commit
2. Move test file using `git mv` and commit IMMEDIATELY (before any edits)
3. Adapt the test file and commit separately
4. Create re-exports and commit
5. Delete old files and commit

### Commit Commands
Use ONLY these specific git commands:
```bash
# For adding your unified tool
git add src/mcp/tools/[workflow]/[tool_name].ts
git commit -m "feat: create unified [tool_name] tool with XOR validation"

# For moving test (NO EDITS before commit)
git mv [old_test_path] [new_test_path]
git commit -m "chore: move [tool]_proj test to unified location"

# For test adaptations
git add src/mcp/tools/[workflow]/__tests__/[tool_name].test.ts
git commit -m "test: adapt [tool_name] tests for project/workspace support"

# For re-exports (list all paths explicitly)
git add [path1] [path2] [path3]...
git commit -m "feat: add [tool_name] re-exports to workflow groups"

# For cleanup
git rm [old_file_paths]
git commit -m "chore: remove old project/workspace [tool] files"
```

### DO NOT:
- Work on any other tools
- Use `git add -A` or `git add .`
- Make commits that include files from other tools
- Refactor or improve code beyond the consolidation requirements
- Create new features or fix unrelated bugs
```

## Tool Assignments for Parallel Work

### Batch 1: Project Discovery Tools
1. **Agent 1**: `show_build_set_proj` / `show_build_set_ws` → `show_build_settings`
   - Location: `project-discovery/`
   - Re-exports: 6 workflows

### Batch 2: Build Tools
2. **Agent 2**: `build_dev_proj` / `build_dev_ws` → `build_device`
   - Location: `device-shared/` (canonical), re-export to device-project/workspace
   
3. **Agent 3**: `build_mac_proj` / `build_mac_ws` → `build_macos`
   - Location: `macos-shared/` (canonical), re-export to macos-project/workspace
   
4. **Agent 4**: `build_sim_id_proj` / `build_sim_id_ws` → `build_simulator_id`
   - Location: `simulator-shared/` (canonical), re-export to simulator-project/workspace
   
5. **Agent 5**: `build_sim_name_proj` / `build_sim_name_ws` → `build_simulator_name`
   - Location: `simulator-shared/` (canonical), re-export to simulator-project/workspace

### Batch 3: Build & Run Tools
6. **Agent 6**: `build_run_mac_proj` / `build_run_mac_ws` → `build_run_macos`
   - Location: `macos-shared/` (canonical), re-export to macos-project/workspace
   
7. **Agent 7**: `build_run_sim_id_proj` / `build_run_sim_id_ws` → `build_run_simulator_id`
   - Location: `simulator-shared/` (canonical), re-export to simulator-project/workspace
   
8. **Agent 8**: `build_run_sim_name_proj` / `build_run_sim_name_ws` → `build_run_simulator_name`
   - Location: `simulator-shared/` (canonical), re-export to simulator-project/workspace

### Batch 4: App Path Tools
9. **Agent 9**: `get_device_app_path_proj` / `get_device_app_path_ws` → `get_device_app_path`
   - Location: `device-shared/` (canonical), re-export to device-project/workspace
   
10. **Agent 10**: `get_mac_app_path_proj` / `get_mac_app_path_ws` → `get_macos_app_path`
    - Location: `macos-shared/` (canonical), re-export to macos-project/workspace
    
11. **Agent 11**: `get_sim_app_path_id_proj` / `get_sim_app_path_id_ws` → `get_simulator_app_path_id`
    - Location: `simulator-shared/` (canonical), re-export to simulator-project/workspace
    
12. **Agent 12**: `get_sim_app_path_name_proj` / `get_sim_app_path_name_ws` → `get_simulator_app_path_name`
    - Location: `simulator-shared/` (canonical), re-export to simulator-project/workspace

### Batch 5: Test Tools
13. **Agent 13**: `test_device_proj` / `test_device_ws` → `test_device`
    - Location: `device-shared/` (canonical), re-export to device-project/workspace
    
14. **Agent 14**: `test_macos_proj` / `test_macos_ws` → `test_macos`
    - Location: `macos-shared/` (canonical), re-export to macos-project/workspace
    
15. **Agent 15**: `test_sim_id_proj` / `test_sim_id_ws` → `test_simulator_id`
    - Location: `simulator-shared/` (canonical), re-export to simulator-project/workspace
    
16. **Agent 16**: `test_sim_name_proj` / `test_sim_name_ws` → `test_simulator_name`
    - Location: `simulator-shared/` (canonical), re-export to simulator-project/workspace

## Orchestration Workflow

### Phase 1: Setup
1. Ensure all agents have access to the worktree
2. Verify no uncommitted changes exist
3. Create this orchestration guide

### Phase 2: Parallel Execution
1. Launch agents in batches to minimize conflicts
2. Each agent works independently on their assigned tool
3. Monitor for completion signals

### Phase 3: Verification
After each agent completes:
1. Run `npm run test` for their specific test file
2. Run `npm run build` to verify no compilation errors
3. Check that re-exports are working

### Phase 4: Integration Testing
After all agents complete:
1. Run full test suite: `npm run test`
2. Run linting: `npm run lint`
3. Run build: `npm run build`
4. Test with Reloaderoo to verify tool availability

## Error Handling

### If an agent encounters conflicts:
1. Have them stash their changes
2. Pull latest changes
3. Reapply their specific changes
4. Never have them resolve conflicts for files outside their scope

### If tests fail:
1. Agent should only fix tests for their specific tool
2. If failure is in unrelated code, report back to orchestrator
3. Never have agents fix tests for other tools

## Success Criteria
- Each tool pair consolidated into single tool with XOR validation
- All tests passing with preserved history
- No Git conflicts between agents
- Each agent's commits are isolated to their tool
- Build succeeds after all consolidations