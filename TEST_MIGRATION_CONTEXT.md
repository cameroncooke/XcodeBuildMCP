# Test Infrastructure Migration Context

**Date**: 2025-06-23  
**Purpose**: Complete context for migrating test infrastructure from failed plugin architecture back to canonical implementation

## Executive Summary

This document provides complete context for a new agent tasked with porting a comprehensive Vitest test infrastructure (700+ tests) from a failed plugin architecture implementation back to the stable canonical implementation. The plugin migration introduced significant architectural regressions that require reverting to the canonical codebase while preserving the valuable test infrastructure investment.

## Background: What Happened

### The Plugin Architecture Migration Attempt
A monolithic tool architecture (81 tools in `src/tools/`) was refactored into a plugin-based system organized by workflow categories:
- **Original**: Tools organized logically by function in `src/tools/build_ios_device.ts`, etc.
- **Plugin**: Tools organized by workflow in `plugins/ios-device-project/`, `plugins/ios-simulator-workspace/`, etc.

### Critical Issues Discovered
1. **Tool Misplacement**: Discovery tools scattered across platform-specific plugins instead of centralized
2. **Missing Categories**: No logical groupings for clean, app-management, log-capture tools
3. **Incomplete Workflows**: Tool count discrepancies between similar workflows (macos-project vs macos-workspace)
4. **Hallucinated Tools**: Extra tools that never existed in canonical - `swift_package_build_direct`, `swift_package_deps`, `swift_package_init`
5. **Architectural Complexity**: Plugin system broke logical tool organization without providing clear workflow benefits

### Decision: Revert to Canonical
The plugin architecture had too many regressions to continue. The decision was made to:
1. **Revert to canonical implementation** (stable, 81 tools working)
2. **Port comprehensive test infrastructure** (700+ tests, significant investment)
3. **Re-architect plugins properly** in the future from tested foundation

## Test Infrastructure Overview

### What Was Built (Current Implementation)
The plugin implementation has **excellent test infrastructure** that must be preserved:

**Test Framework**: Vitest with native TypeScript ES modules support
**Test Count**: 700+ tests across all tool categories
**Test Quality**: Deterministic validation with complete response checking
**Test Organization**: Organized by plugin categories (needs reorganization)

### Key Test Infrastructure Components

#### 1. Test Dependencies (package.json)
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui", 
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "@vitest/ui": "^3.2.4",
    "vitest": "^3.2.4"
  }
}
```

#### 2. Test Directory Structure
```
tests-vitest/
├── helpers/
│   └── vitest-tool-helpers.ts          # Core test utilities
└── plugins/                            # NEEDS REORGANIZATION
    ├── ios-device-project/             # 3 test files
    ├── ios-device-workspace/           # 9 test files  
    ├── ios-simulator-project/          # 11 test files
    ├── ios-simulator-workspace/        # 20 test files
    ├── macos-project/                  # 4 test files
    ├── macos-workspace/                # 10 test files
    ├── swift-package/                  # 6 test files
    ├── ui-testing/                     # 10 test files
    ├── simulator-utilities/            # 5 test files
    ├── project-discovery/              # 1 test file
    ├── project-scaffolding/            # 2 test files
    └── diagnostics/                    # 1 test file
```

#### 3. Test Helper Functions (`tests-vitest/helpers/vitest-tool-helpers.ts`)
**Critical utility** that provides:
- `callToolHandler(tool, params)` - Unified tool testing interface
- Mock setup patterns for Node.js APIs (child_process, fs/promises)
- Deterministic response validation helpers

#### 4. Test Patterns
**Excellent test quality** with deterministic validation:
```typescript
// Example test pattern (PRESERVE THIS QUALITY)
expect(result.content).toEqual([
  { type: 'text', text: '✅ iOS Build succeeded for scheme MyScheme.' },
  { type: 'text', text: '📱 Simulator: iPhone 16' },
  { type: 'text', text: 'Build output:\nBUILD SUCCEEDED' }
]);
expect(result.isError).toBe(false);
```

## CRITICAL: Multi-Agent Orchestration Strategy

### Main Agent Role: ORCHESTRATOR ONLY
**The main agent MUST NOT do any direct refactoring work.** Your role is purely orchestration:

1. **Launch multiple sub-agents in parallel** to maximize throughput
2. **Distribute work systematically** across sub-agents
3. **Monitor progress** and coordinate dependencies
4. **Keep refactoring active** until 100% completion
5. **NO user feedback requests** - sub-agents must be fully autonomous

### Sub-Agent Distribution Strategy

#### Phase 1: Infrastructure Setup (1-2 Sub-Agents)
**Sub-Agent 1**: Dependencies & Configuration
- Port test dependencies to canonical package.json
- Copy vitest.config.ts if exists
- Set up test scripts
- Verify test infrastructure builds

**Sub-Agent 2**: Directory Structure Setup
- Copy tests-vitest/ directory to canonical
- Create initial test organization structure
- Set up helper functions import paths

#### Phase 2: Tool Category Migration (6-8 Sub-Agents in PARALLEL)
**Sub-Agent 3**: Swift Package Tools (6 tools)
- Migrate all swift-package tests
- Fix swift-package-build-direct investigation
- Update imports to canonical structure

**Sub-Agent 4**: Discovery & Scaffolding Tools (3 tools)
- Migrate discover_projs, scaffold_ios_project, scaffold_macos_project tests
- Handle tool location mapping

**Sub-Agent 5**: macOS Tools (14 tools)
- Migrate all macos-project and macos-workspace tests
- Handle build_mac, test_macos, launch_mac tools

**Sub-Agent 6**: iOS Device Tools (12 tools)
- Migrate all ios-device-project and ios-device-workspace tests
- Handle build_dev, test_device, device management tools

**Sub-Agent 7**: iOS Simulator Project Tools (11 tools)
- Migrate ios-simulator-project tests
- Handle build_sim, test_sim project variants

**Sub-Agent 8**: iOS Simulator Workspace Tools (22 tools)
- Migrate ios-simulator-workspace tests
- Handle complex simulator management tools

**Sub-Agent 9**: UI Testing & Utilities (15 tools)
- Migrate ui-testing tests (10 tools)
- Migrate simulator-utilities tests (5 tools)

**Sub-Agent 10**: Diagnostic & Logging Tools (3 tools)
- Migrate diagnostic tool tests
- Migrate log capture tools
- Handle screenshot tools

#### Phase 3: Validation & Cleanup (2 Sub-Agents)
**Sub-Agent 11**: Test Validation
- Run complete test suite
- Fix any remaining import issues
- Verify 100% pass rate

**Sub-Agent 12**: Documentation & CI
- **Port comprehensive test documentation** from current CLAUDE.md to canonical CLAUDE.md
- **Update test infrastructure documentation** with canonical paths and structure
- **Add hallucinated tool removal guidelines** for future development
- Verify GitHub Actions CI works with migrated tests
- Final cleanup and organization
- **Ensure test format documentation is complete** in canonical implementation

### Sub-Agent Instruction Template

Each sub-agent MUST receive:

#### 1. Complete Context Document
- Full copy of this TEST_MIGRATION_CONTEXT.md
- Specific section highlighting their assigned tools

#### 2. Autonomous Instructions
```
YOU ARE ASSIGNED: [Specific tool category]
YOUR TOOLS: [Exact list of tools to migrate]
YOUR DELIVERABLE: 100% working tests for your assigned tools

AUTONOMY REQUIREMENTS:
- NO questions back to main agent
- Handle all technical decisions independently  
- Fix all issues you encounter
- Verify your work with test runs
- Report completion with test results

TECHNICAL APPROACH:
[Specific technical guidance for their category]

SUCCESS CRITERIA:
- All assigned tests pass (npm test)
- Proper canonical tool imports
- Response format alignment
- No remaining TODOs or FIXME comments
```

#### 3. Tool-Specific Context
Each sub-agent gets specific information about:
- Which canonical files contain their tools
- Expected import patterns for their category
- Common issues for their tool type
- Tool response format examples

### Orchestration Workflow

#### Main Agent Process:
1. **Launch Phase 1** (Infrastructure) - Wait for completion
2. **Launch Phase 2** (All categories in parallel) - Monitor progress
3. **Launch Phase 3** (Validation) - Final verification
4. **Report completion** when 100% test pass rate achieved

#### Progress Tracking:
**Main agent tracks:**
- Which sub-agents are active
- Which tool categories are complete
- Overall test pass rate progress
- Any blockers requiring coordination

#### No User Interaction:
- Sub-agents work autonomously
- Main agent resolves any conflicts
- No requests for clarification
- Complete until 100% done

## Your Mission: Port Tests to Canonical (SUB-AGENT INSTRUCTIONS)

### Phase 1: Infrastructure Port

#### 1.1 Copy Test Dependencies
**Action**: Update `/Volumes/Developer/XcodeBuildMCP-main/package.json`
- Add Vitest dependencies from current implementation
- Add test scripts (`test`, `test:watch`, `test:ui`, `test:coverage`)
- Copy `vitest.config.ts` if it exists

#### 1.2 Copy Test Directory
**Action**: Copy entire test infrastructure
```bash
cp -r /Volumes/Developer/XcodeBuildMCP/tests-vitest/ /Volumes/Developer/XcodeBuildMCP-main/
```

### Phase 2: Reorganize Test Structure

#### 2.1 Current vs Canonical Tool Organization

**CRITICAL**: Tests are organized by plugin categories but canonical uses monolithic structure.

**Current Test Imports** (BROKEN in canonical):
```typescript
import buildTool from '../../../plugins/ios-device-project/build-dev-proj.tool.js';
import listDevices from '../../../plugins/ios-device-workspace/list-devices.tool.js';
```

**Canonical Tool Locations** (WHERE THEY ACTUALLY ARE):
```
src/tools/
├── build_ios_device.ts        # Contains build_dev_proj, build_dev_ws tools
├── device.ts                  # Contains list_devices, install_app_device, etc.
├── build_ios_simulator.ts     # Contains all simulator build tools
├── build_macos.ts             # Contains all macOS build tools
├── test_ios_device.ts         # Contains test_device_proj, test_device_ws
├── test_ios_simulator.ts      # Contains all simulator test tools
├── test_macos.ts              # Contains all macOS test tools
├── simulator.ts               # Contains list_sims, boot_sim, etc.
├── launch.ts                  # Contains launch tools for all platforms
├── app_path.ts                # Contains get_*_app_path tools
├── bundleId.ts                # Contains bundle ID tools
├── clean.ts                   # Contains clean_ws, clean_proj
├── build_settings.ts          # Contains show_build_set tools
├── common.ts                  # Contains list_schems tools
├── discover_projects.ts       # Contains discover_projs
├── scaffold.ts                # Contains scaffold tools
├── build-swift-package.ts     # Contains swift_package_build
├── run-swift-package.ts       # Contains swift_package_run
├── test-swift-package.ts      # Contains swift_package_test
├── axe.ts                     # Contains UI testing tools
├── screenshot.ts              # Contains screenshot tool
├── device_log.ts              # Contains device log capture tools
├── log.ts                     # Contains simulator log capture tools
└── diagnostic.ts              # Contains diagnostic tool
```

#### 2.2 Test Reorganization Strategy

**Option A: Reorganize by canonical file structure**
```
tests-vitest/
├── helpers/
└── src/
    └── tools/
        ├── build_ios_device.test.ts     # Tests for build_dev_proj, build_dev_ws
        ├── device.test.ts               # Tests for list_devices, install_app_device
        ├── build_ios_simulator.test.ts  # Tests for all simulator builds
        └── ... (match canonical structure)
```

**Option B: Keep plugin organization but fix imports**
- Keep current test file organization
- Update imports to point to canonical tool locations
- May be easier initial approach

**RECOMMENDATION**: Start with Option B (fix imports), then consider Option A for long-term organization.

### Phase 3: Fix Specific Import Issues

#### 3.1 Tool Import Pattern Fixes

**Current Pattern** (BROKEN):
```typescript
import buildTool from '../../../plugins/ios-device-project/build-dev-proj.tool.js';
```

**Required Pattern** (WORKING):
You need to examine canonical tool files to understand their export patterns.

**Investigation Required**:
1. Look at `/Volumes/Developer/XcodeBuildMCP-main/src/tools/build_ios_device.ts`
2. Understand how tools are exported (named exports vs default exports)
3. Update test imports accordingly

**Likely Pattern**:
```typescript
import { registerDeviceBuildProjectTool } from '../../../src/tools/build_ios_device.js';
// OR
import * as buildIosDeviceTools from '../../../src/tools/build_ios_device.js';
```

#### 3.2 Tool Handler Function Updates

**Current Pattern**:
```typescript
const result = await callToolHandler(buildTool, params);
```

**Investigation Required**:
- Examine how canonical tools are structured
- Update `callToolHandler` in `vitest-tool-helpers.ts` to work with canonical tool exports
- May need to adapt to different tool registration patterns

### Phase 4: Test Response Format Issues

#### 4.1 Expected Response Format Differences

**Current Tests Expect** (Plugin Architecture):
```typescript
expect(result.content).toEqual([...]);
expect(result.isError).toBe(false);
```

**Canonical May Use** (Investigation Required):
- Different response structure
- Different error handling patterns
- Different success/failure indicators

**Action Required**:
1. Run one simple test to see actual canonical response format
2. Update test expectations to match
3. Update `vitest-tool-helpers.ts` to normalize responses if needed

#### 4.2 Convenience Function Availability

**Current Tests Use**:
- `createTextResponse()`, `createErrorResponse()`
- `validateRequiredParam()`
- `ToolResponse` interface

**Investigation Required**:
- Check if these exist in canonical implementation
- Port from current implementation if missing
- Update tool implementations if needed

### Phase 5: Systematic Test Fixing

#### 5.1 Start with Simple Tools
**Recommended Order**:
1. **Diagnostic tool** (single tool, simple)
2. **Discovery tools** (discover_projs)
3. **Swift package tools** (isolated functionality)
4. **macOS tools** (stable platform)
5. **iOS simulator tools** (complex but well-tested)
6. **iOS device tools** (most complex)
7. **UI testing tools** (requires AXE integration)

#### 5.2 Test Fixing Process
For each failing test:
1. **Identify the tool** being tested
2. **Find canonical location** of the tool
3. **Update import** to canonical location
4. **Run test** and check actual vs expected output
5. **Update expectations** to match canonical behavior
6. **Verify test passes** with canonical implementation

#### 5.3 Common Issues to Expect

**Import Issues**:
- Plugin imports don't exist in canonical
- Tool export patterns may be different
- File structure completely different

**Response Format Issues**:
- Response structure may be different
- Error handling may be different
- Success indicators may be different

**Missing Dependencies**:
- Convenience functions may not exist in canonical
- Validation helpers may need porting
- Tool response types may be different

## Critical Success Factors

### 1. Preserve Test Quality
The current tests have **excellent deterministic validation**. Do NOT lower test quality to make them pass quickly. If canonical responses are different, update the tests but maintain the same level of rigorous validation.

### 2. Understand Canonical Architecture
Before making changes, spend time understanding:
- How tools are organized in canonical
- How tools are exported and registered
- What response formats are used
- What error handling patterns exist

### 3. Incremental Approach
Fix tests incrementally:
- Start with simplest tools
- Get 100% pass rate for each category before moving on
- Don't try to fix everything at once

### 4. Document Differences
As you find differences between plugin and canonical implementations:
- Document them for future reference
- Consider if they represent regressions or improvements
- Note anything that should be preserved in future plugin re-architecture

## Key File Locations

### Canonical Codebase
- **Tools**: `/Volumes/Developer/XcodeBuildMCP-main/src/tools/`
- **Utils**: `/Volumes/Developer/XcodeBuildMCP-main/src/utils/`
- **Types**: `/Volumes/Developer/XcodeBuildMCP-main/src/types/`
- **Tool Registration**: `/Volumes/Developer/XcodeBuildMCP-main/src/utils/register-tools.ts`

### Current Plugin Codebase (REFERENCE ONLY)
- **Tests**: `/Volumes/Developer/XcodeBuildMCP/tests-vitest/`
- **Helpers**: `/Volumes/Developer/XcodeBuildMCP/tests-vitest/helpers/vitest-tool-helpers.ts`
- **Plugin Tools**: `/Volumes/Developer/XcodeBuildMCP/plugins/` (FOR REFERENCE)

## Success Criteria

### Phase 1 Complete
- [ ] Test dependencies added to canonical package.json
- [ ] Test directory copied to canonical
- [ ] Test scripts functional (`npm test` runs)

### Phase 2 Complete  
- [ ] All test imports updated to canonical tool locations
- [ ] No import errors when running tests
- [ ] Tests can find and load canonical tools

### Phase 3 Complete
- [ ] All tests pass with canonical implementation
- [ ] 100% test pass rate maintained
- [ ] Test quality and deterministic validation preserved

### Final Success
- [ ] 700+ tests running against canonical implementation
- [ ] Complete coverage of all 81 canonical tools
- [ ] Stable foundation for future plugin re-architecture
- [ ] CI/CD pipeline with automated testing

## Troubleshooting Guide

### "Module not found" errors
- Check canonical tool file structure
- Verify export patterns in canonical tools
- Update import paths to match canonical organization

### "Tool is not a function" errors
- Examine canonical tool export structure
- Update `callToolHandler` to work with canonical patterns
- Check if tools are exported as functions vs objects

### Test expectation failures
- Run failing test and examine actual output
- Compare with expected output in test
- Update test expectations to match canonical behavior
- Verify new expectations are still meaningful

### Missing convenience functions
- Check if functions exist in canonical utils
- Port missing functions from current implementation
- Update canonical tools if needed

## Tool Category Migration Guides (FOR SUB-AGENTS)

### Swift Package Tools (Sub-Agent 3)
**Assigned Tools**: swift_package_build, swift_package_test, swift_package_run, swift_package_stop, swift_package_list, swift_package_clean, swift_package_build_direct

**Canonical Locations**:
- `src/tools/build-swift-package.ts` - Contains swift_package_build
- `src/tools/run-swift-package.ts` - Contains swift_package_run  
- `src/tools/test-swift-package.ts` - Contains swift_package_test
- Other swift package tools may be in same files or separate files

**Current Test Location**: `tests-vitest/plugins/swift-package/`
**Target Test Location**: `tests-vitest/src/tools/swift-package.test.ts` (consolidate all)

**CRITICAL INVESTIGATION**: 
- `swift_package_build_direct` is EXTRA tool not in canonical - MUST be removed, it's a hallucinated tool
- Tests for `swift_package_deps` and `swift_package_init` (marked .REMOVE) should be deleted - these are also hallucinated tools
- Verify only 6 canonical Swift package tools exist and remove any extras

**HALLUCINATED TOOLS TO REMOVE**:
- `swift_package_build_direct` - Delete from plugin implementation and all associated tests
- `swift_package_deps` - Delete all test files (this tool never existed in canonical)
- `swift_package_init` - Delete all test files (this tool never existed in canonical)

### Discovery & Scaffolding Tools (Sub-Agent 4)  
**Assigned Tools**: discover_projs, scaffold_ios_project, scaffold_macos_project

**Canonical Locations**:
- `src/tools/discover_projects.ts` - Contains discover_projs
- `src/tools/scaffold.ts` - Contains scaffold tools

**Current Test Locations**: `tests-vitest/plugins/project-discovery/`, `tests-vitest/plugins/project-scaffolding/`
**Target Test Locations**: `tests-vitest/src/tools/discover_projects.test.ts`, `tests-vitest/src/tools/scaffold.test.ts`

### macOS Tools (Sub-Agent 5)
**Assigned Tools**: build_mac_ws, build_mac_proj, build_run_mac_ws, build_run_mac_proj, test_macos_ws, test_macos_proj, get_mac_app_path_ws, get_mac_app_path_proj, get_mac_bundle_id, launch_mac_app, stop_mac_app, clean_ws, list_schems_ws, show_build_set_ws

**Canonical Locations**:
- `src/tools/build_macos.ts` - Contains build_mac_* and build_run_mac_* tools
- `src/tools/test_macos.ts` - Contains test_macos_* tools  
- `src/tools/app_path.ts` - Contains get_mac_app_path_* tools
- `src/tools/bundleId.ts` - Contains get_mac_bundle_id
- `src/tools/launch.ts` - Contains launch_mac_app, stop_mac_app
- `src/tools/clean.ts` - Contains clean_ws
- `src/tools/common.ts` or `build_settings.ts` - Contains list_schems_ws, show_build_set_ws

**Current Test Locations**: `tests-vitest/plugins/macos-project/`, `tests-vitest/plugins/macos-workspace/`

### iOS Device Tools (Sub-Agent 6)
**Assigned Tools**: build_dev_ws, build_dev_proj, test_device_ws, test_device_proj, get_device_app_path_ws, get_device_app_path_proj, list_devices, install_app_device, launch_app_device, stop_app_device, start_device_log_cap, stop_device_log_cap

**Canonical Locations**:
- `src/tools/build_ios_device.ts` - Contains build_dev_* tools
- `src/tools/test_ios_device.ts` - Contains test_device_* tools
- `src/tools/app_path.ts` - Contains get_device_app_path_* tools
- `src/tools/device.ts` - Contains list_devices, install_app_device, launch_app_device, stop_app_device
- `src/tools/device_log.ts` - Contains start_device_log_cap, stop_device_log_cap

**Current Test Locations**: `tests-vitest/plugins/ios-device-project/`, `tests-vitest/plugins/ios-device-workspace/`

### iOS Simulator Project Tools (Sub-Agent 7)
**Assigned Tools**: build_sim_id_proj, build_sim_name_proj, build_run_sim_id_proj, build_run_sim_name_proj, test_sim_id_proj, test_sim_name_proj, get_sim_app_path_id_proj, get_sim_app_path_name_proj, clean_proj, list_schems_proj, show_build_set_proj

**Canonical Locations**:
- `src/tools/build_ios_simulator.ts` - Contains build_sim_* and build_run_sim_* tools
- `src/tools/test_ios_simulator.ts` - Contains test_sim_* tools
- `src/tools/app_path.ts` - Contains get_sim_app_path_* tools
- `src/tools/clean.ts` - Contains clean_proj
- `src/tools/common.ts` or `build_settings.ts` - Contains list_schems_proj, show_build_set_proj

**Current Test Location**: `tests-vitest/plugins/ios-simulator-project/`

### iOS Simulator Workspace Tools (Sub-Agent 8)
**Assigned Tools**: build_sim_id_ws, build_sim_name_ws, build_run_sim_id_ws, build_run_sim_name_ws, test_sim_id_ws, test_sim_name_ws, get_sim_app_path_id_ws, get_sim_app_path_name_ws, boot_sim, list_sims, open_sim, install_app_sim, launch_app_sim, launch_app_logs_sim, stop_app_sim, start_sim_log_cap, stop_sim_log_cap, get_app_bundle_id, screenshot

**Canonical Locations**:
- `src/tools/build_ios_simulator.ts` - Contains build_sim_* and build_run_sim_* workspace tools
- `src/tools/test_ios_simulator.ts` - Contains test_sim_* workspace tools
- `src/tools/app_path.ts` - Contains get_sim_app_path_* tools
- `src/tools/simulator.ts` - Contains boot_sim, list_sims, open_sim, install_app_sim, launch_app_sim, stop_app_sim
- `src/tools/log.ts` - Contains start_sim_log_cap, stop_sim_log_cap, launch_app_logs_sim
- `src/tools/bundleId.ts` - Contains get_app_bundle_id
- `src/tools/screenshot.ts` - Contains screenshot

**Current Test Location**: `tests-vitest/plugins/ios-simulator-workspace/`

### UI Testing & Utilities (Sub-Agent 9)
**Assigned Tools**: describe_ui, tap, long_press, swipe, type_text, key_press, button, key_sequence, touch, gesture, set_sim_appearance, set_simulator_location, reset_simulator_location, set_network_condition, reset_network_condition

**Canonical Locations**:
- `src/tools/axe.ts` - Contains all UI testing tools (describe_ui, tap, long_press, swipe, type_text, key_press, button, key_sequence, touch, gesture)
- `src/tools/simulator.ts` - May contain simulator utility tools

**Current Test Locations**: `tests-vitest/plugins/ui-testing/`, `tests-vitest/plugins/simulator-utilities/`

**Special Notes**: UI testing tools require AXE integration and coordinate handling.

### Diagnostic & Logging Tools (Sub-Agent 10)  
**Assigned Tools**: diagnostic

**Canonical Locations**:
- `src/tools/diagnostic.ts` - Contains diagnostic tool

**Current Test Location**: `tests-vitest/plugins/diagnostics/`

## Common Migration Patterns for Sub-Agents

### Import Pattern Investigation
Each sub-agent must:
1. **Examine canonical tool files** to understand export patterns
2. **Update test imports** from plugin paths to canonical paths
3. **Handle named vs default exports** correctly

### Response Format Alignment
Each sub-agent must:
1. **Run one test** to see actual canonical response format
2. **Compare with current test expectations**
3. **Update test expectations** to match canonical while maintaining quality
4. **Preserve deterministic validation** (no .toContain(), use .toEqual())

### Tool Handler Updates
Each sub-agent must:
1. **Update callToolHandler** in vitest-tool-helpers.ts if needed
2. **Ensure compatibility** with canonical tool patterns
3. **Maintain mock patterns** for Node.js APIs

## Sub-Agent Success Validation

Each sub-agent must verify:
- [ ] All assigned tests pass when run individually: `npm test -- tests-vitest/path/to/your/tests`
- [ ] No import errors or module not found errors
- [ ] Response format matches canonical tool behavior
- [ ] Test quality maintained (deterministic validation)
- [ ] No TODOs or FIXME comments left behind

## CRITICAL: Hallucinated Tools and Test Gap Identification

### Hallucinated Tools That Must Be Removed

**CANONICAL IS ALWAYS SOURCE OF TRUTH - NO EXCEPTIONS**

The following tools exist in the current plugin implementation but **NEVER EXISTED** in the canonical implementation and must be completely removed:

#### Confirmed Hallucinated Tools:
1. **`swift_package_build_direct`** - Found in swift-package plugin, no canonical equivalent
   - **Action**: Delete tool implementation and all associated tests
   - **Impact**: This is an extra tool that should never have been created

2. **`swift_package_deps`** - Test files exist marked .REMOVE  
   - **Action**: Delete all test files for this non-existent tool
   - **Impact**: Tests for a tool that was never implemented

3. **`swift_package_init`** - Test files exist marked .REMOVE
   - **Action**: Delete all test files for this non-existent tool  
   - **Impact**: Tests for a tool that was never implemented

#### Sub-Agent Instructions for Hallucinated Tools:
Each sub-agent must:
1. **Identify any tools in their assigned category** that don't exist in canonical
2. **Delete tool implementations** completely (don't migrate them)
3. **Delete all associated tests** for hallucinated tools
4. **Document removed tools** in their completion report
5. **Verify tool count matches canonical exactly** after cleanup

### Test Gap Identification

#### Tests That Will NOT Have Counterparts:
- Any tests for the 3 hallucinated tools above must be **DELETED**, not migrated
- These tests validate tools that should never have existed
- **No migration needed** - complete removal required

#### Tests That WILL Need Creation:
After removing hallucinated tools, identify canonical tools that lack tests:

**Sub-Agent Responsibilities**:
1. **Compare canonical tool list** with existing tests in their category
2. **Identify missing test coverage** for canonical tools
3. **Create new tests** for canonical tools that lack coverage
4. **Report test gaps** in completion summary

#### Test Gap Analysis Process:
For each sub-agent category:
1. **List all canonical tools** in their assigned category
2. **List all current tests** (excluding hallucinated tool tests)
3. **Identify gaps** where canonical tools have no test coverage
4. **Create comprehensive tests** for gap tools using existing patterns
5. **Verify 100% canonical tool coverage** in their category

### Test Format Documentation Migration

#### Current Implementation Has Comprehensive Test Documentation:
The current `/Volumes/Developer/XcodeBuildMCP/CLAUDE.md` contains detailed test format documentation that must be ported to canonical:

**Required Migration**:
1. **Test Infrastructure Architecture** section (lines 104-190 in current CLAUDE.md)
2. **Test Patterns and Quality Standards** (lines 140-260 in current CLAUDE.md)  
3. **Adding Tests for New Tools** patterns (lines 191-252 in current CLAUDE.md)
4. **Mock Patterns** and helper function documentation
5. **Deterministic Response Validation** standards

**Sub-Agent 12 (Documentation & CI) Responsibility**:
- **Port complete test documentation** from current CLAUDE.md to canonical CLAUDE.md
- **Update paths and references** to match canonical structure
- **Preserve all test quality standards** and patterns
- **Add hallucinated tool removal guidelines** for future development

### Quality Assurance: No Hallucinated Tools in Final Implementation

#### Final Validation Checklist:
- [ ] Exactly 81 tools in canonical implementation (no more, no less)
- [ ] Zero tools with "direct", "deps", or "init" suffixes in Swift package category
- [ ] No test files for removed hallucinated tools
- [ ] 100% test coverage for all 81 canonical tools
- [ ] Complete test format documentation in canonical CLAUDE.md

#### Sub-Agent Success Criteria Update:
Each sub-agent must verify:
- [ ] **Tool count matches canonical exactly** in their category
- [ ] **No hallucinated tools** remain in their implementation
- [ ] **No tests for hallucinated tools** remain in their test files
- [ ] **All canonical tools have tests** in their category
- [ ] **Test gaps documented and filled** for any missing canonical tool coverage

## Final Notes

This is a **critical migration** that preserves significant test infrastructure investment while returning to a stable foundation. Each sub-agent must work autonomously to understand their assigned canonical tools and migrate tests accordingly, maintaining the excellent test quality that was achieved in the plugin implementation.

**CANONICAL IS THE SINGLE SOURCE OF TRUTH** - any tools or tests that don't match canonical must be removed completely.

The goal is to end up with a fully tested canonical implementation that provides a solid foundation for properly re-architecting the plugin system in the future with workflow-based organization and end-to-end completeness.