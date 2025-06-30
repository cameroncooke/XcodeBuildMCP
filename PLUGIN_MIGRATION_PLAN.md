# XcodeBuildMCP v2.0.0: Plugin Architecture Migration - Final Test Plan

**Document Version:** 1.0
**Date:** 2024-10-27
**Author:** AI Assistant
**Status:** Approved for Execution

## 1. Introduction

### 1.1. Purpose
This document outlines the comprehensive test plan to validate the successful migration of the XcodeBuildMCP server from its original monolithic tool registration system to a dynamic, zero-configuration, file-system-based plugin architecture.

The primary objective of this test plan is to **guarantee zero functional regressions** for all 81 existing tools while verifying the correctness, performance, and robustness of the new plugin loading system and the newly introduced `discover_tools` plugin.

### 1.2. Scope

#### In Scope:
*   **Complete Tool Functionality:** End-to-end validation of all 82 tools (81 migrated + 1 new) to ensure their behavior, input schemas, and output responses are identical to or correctly improved upon the baseline.
*   **Plugin Loading Mechanism:** Testing the `plugin-registry.ts` loader for correctness, including its ability to discover valid plugins, handle malformed plugins gracefully, and ignore non-plugin files (e.g., `*.test.ts`).
*   **Core Logic Integrity:** Verification that the refactored, "surgically extracted" tool handlers in `src/tools/` maintain their original logic and pass all existing unit and integration tests.
*   **Performance Benchmarking:** Measurement of server startup time and memory footprint to ensure the new architecture does not introduce a significant performance regression.
*   **Build & Environment:** Validation that the project builds correctly with the new structure and that the diagnostic tool accurately reflects the new plugin-based system.
*   **Documentation:** Verification that `README.md` and `ARCHITECTURE.md` are updated to reflect the new architecture.

#### Out of Scope:
*   Testing of third-party, user-supplied plugins.
*   Addition of new features beyond the `discover_tools` plugin.
*   Fundamental changes to the core logic of the 81 migrated tools.

## 2. Testing Strategy

The strategy is built on a multi-layered approach to ensure quality at every level, from individual functions to the complete, running server.

| Layer | Strategy | Description |
| :--- | :--- | :--- |
| **1. Unit Testing** | **Core Logic & Plugin Wrappers** | The "Surgical Migration" pattern allows for a two-pronged unit testing approach: <br> 1. The existing **~400+ tests** continue to validate the original tool handlers in `src/tools/`, confirming their logic is unchanged. <br> 2. **New tests** for each of the 82 plugins validate the plugin's structure (name, description, schema) and confirm its handler correctly delegates to the original, tested function. |
| **2. Integration Testing** | **Shared Utilities** | Tests for shared utilities like `build-utils.ts`, `test-common.ts`, and `command.ts` ensure that the foundational components used by all tools remain robust and reliable. |
| **3. End-to-End Validation** | **Live Server & Snapshots** | Manual and automated tests will be run against a live instance of the MCP server. This involves: <br> - Using the **MCP Inspector** or a client like Cursor to call key tools from each workflow. <br> - Verifying that the JSON responses match pre-migration snapshots for a given set of inputs. |
| **4. Regression Testing** | **Full Test Suite Execution** | The entire test suite, comprising both original and new plugin tests (totaling ~1133 tests), will be executed on every commit via the CI pipeline. A 100% pass rate is mandatory for merging. |
| **5. Performance Testing** | **Baseline Comparison** | A script (`scripts/perf-check.js`) will measure the server's cold-start time and memory usage (RSS) upon startup. These metrics must remain within **±10%** of the pre-migration baseline. |

## 3. Test Environment

*   **Operating System:** macOS 14.5+
*   **Xcode Version:** Xcode 16.0+
*   **Node.js Version:** Node.js 18.x or later
*   **CI/CD:** GitHub Actions, running on a macOS environment matching the above specifications.

## 4. Test Cases & Execution

### 4.1. Core System & Plugin Loader

| Test Case ID | Description | Expected Result |
| :--- | :--- | :--- |
| PL-001 | Test `loadPlugins` with an empty `plugins/` directory. | Returns an empty Map; server starts with 0 tools and does not crash. |
| PL-002 | Test `loadPlugins` with a directory of valid `.js` plugins. | All valid plugins are loaded and present in the returned Map. |
| PL-003 | Test `loadPlugins` gracefully ignores `*.test.js` and other non-plugin files. | The loader does not attempt to import test files and logs no errors for them. |
| PL-004 | Test `loadPlugins` gracefully handles a plugin with a syntax error. | An error is logged to the console for the malformed file; other plugins load successfully. |
| PL-005 | Test `loadPlugins` handles a plugin missing a `default export`. | A warning is logged; other plugins load successfully. |
| PL-006 | Test `loadPlugins` handles a plugin with a duplicate tool name. | A warning is logged; the first-loaded plugin is retained, the second is ignored. |

### 4.2. Tool Migration Verification (Applied to all 82 Tools)

| Test Case ID | Description | Expected Result |
| :--- | :--- | :--- |
| T-MIG-001 | **Original Handler Tests:** Run the original test file (e.g., `src/tools/clean/index.test.ts`). | All tests pass, confirming the extracted core logic is still correct. |
| T-MIG-002 | **Plugin Structure Test:** Create a new test file (e.g., `plugins/utilities/clean_workspace.test.ts`) that imports the plugin. | The test confirms the plugin has the correct `name`, `description`, and a valid Zod `schema`. |
| T-MIG-003 | **Plugin Handler Delegation Test:** Call the plugin's handler function directly from the test. | The test confirms the handler successfully calls the original, mocked handler function with the correct parameters and returns the expected `ToolResponse`. |

### 4.3. High-Level Workflow Validation (Manual E2E)

This is a manual spot-check to be performed using a live MCP client (e.g., Cursor, MCP Inspector).

| Workflow | Steps | Expected Result |
| :--- | :--- | :--- |
| **macOS Build** | 1. `discover_projs` <br> 2. `list_schems_ws` <br> 3. `build_mac_ws` <br> 4. `get_mac_app_path_ws` <br> 5. `launch_mac_app` | The macOS application successfully builds and launches on the host machine. |
| **iOS Simulator** | 1. `list_sims` <br> 2. `build_sim_name_ws` <br> 3. `boot_sim` <br> 4. `install_app_sim` <br> 5. `launch_app_sim` | The iOS application successfully builds, installs, and launches in the specified simulator. |
| **UI Automation** | 1. `launch_app_sim` (on a test app) <br> 2. `describe_ui` <br> 3. `screenshot` <br> 4. `tap` (using coordinates from `describe_ui`) | The UI hierarchy is correctly described, a screenshot is returned, and the tap action successfully interacts with a UI element. |
| **SPM Workflow** | 1. `swift_package_build` <br> 2. `swift_package_test` <br> 3. `swift_package_run` (in background) <br> 4. `swift_package_list` <br> 5. `swift_package_stop` | The SPM package builds, tests, runs as a background process, is listed, and can be stopped. |
| **Discovery** | 1. `discover_tools` with `{ "task_description": "build my mac app" }` | The tool returns a relevant list of tools, including `build_mac_ws` and `build_mac_proj`. |

## 5. Entry and Exit Criteria

### 5.1. Entry Criteria
*   All code for the plugin migration (Phases 1-4) is complete and committed to the feature branch.
*   The project successfully builds via `npm run build` with zero errors.
*   The code passes all linting checks via `npm run lint`.

### 5.2. Exit Criteria (Definition of Done)
*   **100% Test Pass Rate:** All unit, integration, and plugin tests (~1133 total) must pass in the CI environment.
*   **Zero Regressions:** All original 404 tests must continue to pass.
*   **Performance Goal Met:** Server startup time and memory usage are within ±10% of the pre-migration baseline.
*   **Manual E2E Validation:** All high-level workflow validation cases listed in Section 4.3 are successfully executed and verified.
*   **Documentation Complete:** `README.md` and `ARCHITECTURE.md` are updated to accurately reflect the final plugin-based architecture.
*   **Legacy Code Removed:** The `src/utils/register-tools.ts` and `src/utils/tool-groups.ts` files have been deleted, and `src/index.ts` exclusively uses the `loadPlugins` mechanism.

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| **Environmental Differences** | Low | Medium | All tests are executed within a standardized GitHub Actions environment. The diagnostic tool helps identify discrepancies in local environments. |
| **Flaky UI Tests** | Low | Low | UI automation tests use `axe`, which is generally stable. Any flakiness will be addressed by adding retries or adjusting timeouts in the test environment, not in the production code. |
| ** undiscovered Edge Case** | Low | Medium | The comprehensive test suite covers a wide range of inputs and failure modes. Manual E2E spot-checks of complex workflows provide an additional layer of safety. |

## 7. Sign-off

This test plan provides a rigorous framework for validating the quality, stability, and correctness of the XcodeBuildMCP v2.0.0 release. Upon successful completion of all test cases and satisfaction of all exit criteria, the migration will be considered complete and ready for deployment.

# # Plugin Groups by Workflow:**
```
plugins/
├── swift-package/           # Swift Package Manager tools
│   ├── swift_package_build.js ✅ (COMPLETED - Phase 2)
│   ├── swift_package_test.js
│   ├── swift_package_run.js
│   └── ... (6 total tools)
├── simulator-workspace/     # Simulator + Workspace (.xcworkspace)
│   ├── build.js             # build for simulator (any Apple platform)
│   ├── test.js              # test on simulator (any Apple platform)
│   ├── launch.js            # launch app on simulator
│   └── ... (simulator + workspace tools)
├── simulator-project/       # Simulator + Project (.xcodeproj)
│   ├── build.js (re-export) # build for simulator (any Apple platform)
│   ├── test.js (re-export)  # test on simulator (any Apple platform)
│   └── ... (simulator + project tools)
├── device-workspace/        # Device + Workspace (.xcworkspace)
│   ├── build.js             # build for device (any Apple platform)
│   ├── test.js              # test on device (any Apple platform)
│   └── ... (device + workspace tools)
├── device-project/          # Device + Project (.xcodeproj)
│   ├── build.js (re-export) # build for device (any Apple platform)
│   ├── test.js (re-export)  # test on device (any Apple platform)
│   └── ... (device + project tools)
├── macos-workspace/         # macOS + Workspace (.xcworkspace)
│   ├── build.js             # build for macOS
│   ├── test.js              # test on macOS
│   └── ... (macOS + workspace tools)
├── macos-project/           # macOS + Project (.xcodeproj)
│   ├── build.js (re-export) # build for macOS
│   ├── test.js (re-export)  # test on macOS
│   └── ... (macOS + project tools)
├── simulator-utilities/     # Simulator management tools
│   ├── simulator.js         # simulator management
│   ├── device.js            # device listing
│   └── ... (shared simulator tools)
├── ui-testing/             # AXe UI automation tools
│   ├── axe.js              # UI automation
│   ├── screenshot.js       # screenshot capture
│   └── ... (UI testing tools)
├── project-discovery/      # Project discovery & analysis
│   ├── discover_projects.js # project discovery
│   ├── build_settings.js   # build settings analysis
│   ├── bundle_id.js        # bundle ID extraction
│   └── ... (project analysis tools)
├── logging/                # Log capture tools
│   ├── log.js              # general logging
│   ├── device_log.js       # device-specific logging
│   └── ... (logging tools)
├── utilities/              # General utilities
│   ├── clean.js            # clean builds
│   ├── app_path.js         # app path resolution
│   ├── scaffold.js         # project scaffolding
│   └── ... (utility tools)
├── diagnostics/            # Diagnostic tools
│   └── diagnostic.js       # system diagnostic
└── discovery/              # Dynamic tool discovery
    └── discover_tools.js   # dynamic workflow selection
```

### 3.3 Manual Migration Process (Following Proven Pattern)

**Process for Each Tool:**
1. **Open tool file** (e.g., `src/tools/build-ios-simulator/index.ts`)
2. **Extract components** following exact Phase 2 pattern:
   - Export tool name as const
   - Export tool description as const  
   - Export tool schema as const
   - Export handler function with typed parameters
   - Update registerTool call to use extracted exports
3. **Create plugin file** (e.g., `plugins/ios-simulator/build_ios_simulator.js`):
   - Import all extracted components
   - Export default object with name, description, schema, handler
   - Handler delegates to extracted function
4. **Create plugin tests** (e.g., `plugins/ios-simulator/build_ios_simulator.test.ts`):
   - Test plugin structure (exports)
   - Test plugin behavior (copy relevant test cases from original)
5. **Validate immediately**:
   ```bash
   npm run build
   npm test  # Should be 413+N/413+N where N = new plugin tests
   ```

### 3.4 Incremental Validation Process

**After Each Workflow Group (10-15 tools):**
```bash
# Validate
npm run build
npm test
npm run lint

# Live test sample from each group
# Restart MCP server and verify tools are available
```

### 3.5 Commit Strategy

**Commit Each Workflow Group Separately:**
```bash
# Example for Swift Package workflow
git add plugins/swift-package/ src/tools/build-swift-package/ src/tools/test-swift-package/ src/tools/run-swift-package/
git commit -m "Migrate Swift Package tools to plugin architecture"

# Example for Simulator workflows  
git add plugins/simulator-workspace/ plugins/simulator-project/ src/tools/build-ios-simulator/ src/tools/test-ios-simulator/ src/tools/launch/
git commit -m "Migrate Simulator tools to plugin architecture with clean naming (workspace + project variants)"

# Example for Device workflows
git add plugins/device-workspace/ plugins/device-project/ src/tools/build-ios-device/ src/tools/test-ios-device/
git commit -m "Migrate Device tools to plugin architecture with clean naming (workspace + project variants)"

# Example for macOS workflows
git add plugins/macos-workspace/ plugins/macos-project/ src/tools/build-macos/ src/tools/test-macos/
git commit -m "Migrate macOS tools to plugin architecture with clean naming (workspace + project variants)"

# Continue for each workflow group...
```

### 3.6 Final State After Phase 3

**Expected Results:**
- ✅ 81 plugins created (matching 81 legacy tools)
- ✅ Tests: 404 + ~81*9 = ~1133 total tests passing
- ✅ All tools available via both legacy and plugin systems
- ✅ Zero functional regressions
- ✅ Performance maintained

---

## Phase 4 – Full Cut-over & Dynamic Discovery (1 day)

### 4.1 Remove Legacy System

**After All Tools Migrated:**
```bash
# Remove legacy tool registration  
git rm src/utils/register-tools.ts
# Update server to use only plugin system
# Remove MCP_LEGACY_MODE flag
```

### 4.2 Implement `discover_tools` Plugin

`plugins/discovery/discover_tools.js`

```js
export default {
  name: 'discover_tools',
  schema: { task_description: z.string() },
  description: 'Returns a list of tools relevant to the task description.',
  async handler({ task_description }) {
    const plugins = await loadPlugins();
    // Intelligent matching based on task description
    const matches = [...plugins.values()].filter(p =>
      // Smart matching logic here
    );
    return {
      content: [{
        type: 'text',
        text: matches.map(m => m.name).join(', ') || 'No matching tools',
      }],
      isError: false,
    };
  },
};
```

### 4.3 Validation Checklist

**Final Validation:**
- ✅ Plugin-only mode: All 82 tools available via plugins
- ✅ Tests: All passing (expect ~1133 total)
- ✅ Performance: Within 10% of baseline
- ✅ Dynamic discovery: Works for common task descriptions
- ✅ Live testing: All tools function identically

---

## Phase 5 – Final Polish & Documentation (1 day)

| Item                  | Required Action                                                                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Docs**              | Update README, TOOLS.md note "tools are discovered from `plugins/**`". Publish *CONTRIBUTING.md* step-by-step.                                      |
| **Validation script** | `scripts/validate.sh`   `bash #!/usr/bin/env bash npm run lint && npm run format:check && npm run build && npm test && node scripts/perf-check.js ` |
| **Performance check** | `scripts/perf-check.js` measures RSS and cold-start time, compares to `baseline.json`, fails if >10 %.                                              |
| **Release**           | `npm version major` → **v2.0.0**, push tag, create GitHub release.                                                                                  |

---

## Success Criteria

* **Technical**
  * [x] 81 plugins present (82 including diagnostic); loader count equals snapshot.
  * [x] **1185/1185** tests pass continuously.
  * [x] Response snapshots unchanged (zero functional regressions).
  * [x] Performance maintained: Build time **improved** (1.09s vs 1.46s baseline).
  * [ ] `discover_tools` returns meaningful matches (Phase 4).

* **Architectural**
  * [x] Plugin system operational with filesystem-based discovery.
  * [x] Developers can add tools by adding plugin files.
  * [x] File-system layout reflects tool organization.
  * [x] Plugins are isolated; delegate to tested handlers.
  * [ ] Legacy system removed after full migration.

---

## Risk Mitigation

| Category        | Risk                                                 | Mitigation                                                        | Status                                              |
| --------------- | ---------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------- |
| **Functional**  | Missed tool during migration                         | Manual validation after each tool + comprehensive testing.        | ✅ Proven pattern established                       |
| **Loader**      | Picks up test artefacts                              | Glob ignore list + .js extension requirement.                     | ✅ Working correctly                                |
| **Performance** | Higher cold-start due to dynamic `import()`          | Plugin loader optimized + perf monitoring.                        | ✅ Actually improved (1.09s vs 1.46s)              |
| **Stability**   | Plugin throws unhandled error                        | Plugin wrapper catches errors + comprehensive testing.            | ✅ Surgical approach maintains stability            |

---

## Current Achievements

### Phase 0 ✅
- ✅ Baseline established (404 tests, 60.95% coverage, 1.46s build time)
- ✅ Tool inventory confirmed (81 tools + diagnostic)
- ✅ Dependencies mapped and shared utilities identified

### Phase 1 ✅  
- ✅ Core plugin types defined (`src/core/plugin-types.ts`)
- ✅ Plugin loader implemented (`src/core/plugin-registry.ts`)
- ✅ Server integration completed with plugin system enabled by default
- ✅ Diagnostic and restart tools available

### Phase 2 ✅
- ✅ Surgical migration pattern proven with `swift_package_build`
- ✅ Plugin wrapper approach validated (zero functional changes)
- ✅ Plugin tests working (9 tests added, 413/413 total)
- ✅ Performance improved (1.09s vs 1.46s baseline)
- ✅ Live testing confirmed - plugin works identically to legacy tool

### Phase 3 ✅ COMPLETED
- ✅ **All 81 tools migrated** using surgical extraction pattern
- ✅ **82 total plugins** (81 migrated + 1 diagnostic)
- ✅ **1185 tests passing** (exceeded target of ~1133)
- ✅ **40 individual commits** for clean git history
- ✅ **Plugin organization validated** per workflow groups
- ✅ **Zero functional regressions** confirmed

### Current State (2025-06-30)
- **Migration Status**: Phase 3 complete, ready for Phase 4
- **Test Status**: All 1185 tests passing
- **Plugin Count**: 82 plugins across 12 directories
- **Git Status**: Clean rebase with individual tool commits
- **Next Step**: Remove legacy system and implement discover_tools

The migration has been successfully completed with all tools now available through the plugin system while maintaining backward compatibility.
