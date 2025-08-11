## Simulator Name/ID Consolidation Plan (Phase 2, Single Unified Interfaces)

### Purpose
Expose a single unified tool interface per simulator operation to minimize tool count and MCP context usage. Accept both `simulatorId` and `simulatorName` in the same schema, with forgiving validation that prefers specificity and returns warnings (not hard errors) when possible.

### Current State (as of this branch)
- build: ID and Name tools share `executeXcodeBuildCommand` which already supports id or name via `constructDestinationString`.
- build & run: ID and Name tools are nearly identical and already support both id/name in logic (destination + optional name→UUID resolution for simctl steps).
- get app path: Name tool supports both id/name in logic; ID tool requires id. Both can share a single destination helper.
- launch/stop: Today name wrappers forward to shared logic, but the target state is UUID-only for standalone simctl tools.
- tests: Comprehensive coverage exists per pair.

### Guiding Principles
- Single canonical tool per operation. No separate `_id`/`_name` interfaces in the canonical set.
- Schema accepts both `simulatorId?` and `simulatorName?` but enforces XOR: exactly one must be provided.
- If neither or both are provided: validation error (not forgiving) with a clear message.
- Ignore `useLatestOS` when an id is provided; return a warning (since UUID implies an exact device/OS).
- Keep project/workspace XOR validation in schemas.
- Sensible defaults: configuration=Debug, useLatestOS=true when using name (xcodebuild destination), preferXcodebuild=false.

### Xcodebuild vs simctl Responsibilities
- Interface: xcodebuild-based tools (build, test, showBuildSettings) accept either `simulatorId` or `simulatorName` (XOR). Standalone simctl tools (launch, terminate, install) require `simulatorUuid` only.
- Implementation detail:
  - xcodebuild-based steps use `-destination` and work with either id or name directly via `constructDestinationString`. No name→UUID lookup for xcodebuild.
  - simctl-based steps operate on UUIDs. Unified tools that combine xcodebuild and simctl (e.g., build_run_simulator) may accept name and internally determine the UUID for the simctl phase. Standalone simctl tools require a UUID and do not accept name.

### Standardized Validation Semantics
- simulatorId vs simulatorName: XOR enforced in schema (error when neither or both).
- `useLatestOS` with id: ignore; return a warning (id implies exact target OS).
- Project/workspace: enforce XOR via schema with empty-string preprocessing.
- Name destinations: include `,OS=latest` unless `useLatestOS === false`.

### Canonical Tool Interfaces (one per operation)
- build: `build_simulator` (accepts id OR name; XOR)
- build & run: `build_run_simulator` (accepts id OR name; XOR; resolves UUID internally for simctl phases)
- get app path: `get_simulator_app_path` (accepts id OR name; XOR)
- test: `test_simulator` (accepts id OR name; XOR)
- launch app: `launch_app_sim` (UUID only) + `launch_app_sim_name` (name wrapper, resolves to UUID)
- stop app: `stop_app_sim` (UUID only) + `stop_app_sim_name` (name wrapper, resolves to UUID)
- install app: `install_app_sim` (UUID only) - no name variant exists yet

Each canonical xcodebuild-based tool schema includes: `projectPath?`, `workspacePath?`, `scheme`, `simulatorId?`, `simulatorName?` (XOR), `configuration?`, `derivedDataPath?`, `extraArgs?`, `useLatestOS?`, `preferXcodebuild?` (where applicable), and any operation-specific fields (e.g., `bundleId`). Standalone simctl tool schemas include UUID-only fields (e.g., `simulatorUuid` plus operation-specific params like `bundleId`).

### Implementation Plan by Tool (single interface via git mv + surgical edits)

- build:
  1) git mv the more complete file to canonical: e.g. `build_simulator_id.ts` → `build_simulator.ts` (or pick `build_simulator_name.ts` if it’s the better base).
  2) Commit the move. Then edit the moved file to expose a unified schema with XOR `simulatorId`/`simulatorName`, keep project/workspace XOR, and pass id or name to `executeXcodeBuildCommand`.
  3) git rm the other legacy file.

- build & run:
  1) git mv the better base (`build_run_simulator_id.ts` or `build_run_simulator_name.ts`) → `build_run_simulator.ts`; commit.
  2) Edit to keep a single schema with XOR `simulatorId`/`simulatorName`, ensure simctl steps resolve UUID when name is given (once), reuse across install/launch.
  3) git rm the other legacy file.

- get app path:
  1) git mv the more complete file (likely `get_simulator_app_path_name.ts`) → `get_simulator_app_path.ts`; commit.
  2) Edit to accept XOR id/name and construct destination using `constructDestinationString`. If using simctl later, resolve UUID transparently.
  3) git rm the other legacy file.

- test:
  1) git mv the better base (`test_simulator_id.ts` or `test_simulator_name.ts`) → `test_simulator.ts`; commit.
  2) Edit to accept XOR id/name and forward to `handleTestLogic` with appropriate platform.
  3) git rm the other legacy file.

### Shared Helper (recommended)
Create a small internal helper to standardize simctl name→UUID resolution. Suggested location: `src/utils/xcode.ts` or `src/utils/build-utils.ts`.
Note: This helper is ONLY for simctl flows. xcodebuild flows must pass id/name straight to `constructDestinationString` without lookup.

```ts
// determineSimulatorUuid.ts (example API shape)
// Behavior:
// - If simulatorUuid provided: return it directly
// - Else if simulatorName looks like a UUID (regex): treat it as UUID and return it
// - Else: resolve name → UUID via simctl and return the match (isAvailable === true)
export async function determineSimulatorUuid(
  params: { simulatorUuid?: string; simulatorName?: string },
  executor: CommandExecutor,
): Promise<{ uuid?: string; warning?: string; error?: ToolResponse }>
```

Usage: launch/stop/build_run installations should call this when a UUID is required. xcodebuild-only paths do not need this lookup. If `simulatorName` is actually a UUID string, the helper will favor the UUID without lookup.

### Tests
- Preserve coverage by migrating existing pair tests to the unified tool files (commit moves first, then adapt).
- Add XOR tests for simulatorId/simulatorName (neither → error, both → error).
- Add warning tests for `useLatestOS` ignored when id present.
- Retain XOR tests for project/workspace with empty-string preprocessing.
- For simctl flows, verify name→UUID resolution is used once and reused when name path is chosen.
- Add a test where `simulatorName` contains a UUID string; expect the helper to treat it as a UUID (no simctl lookup) and proceed successfully.

### Removal of Legacy Interfaces
- Remove all legacy `_id` and `_name` tool files. Only canonical tools remain.
- Update tests by moving the more comprehensive test to the canonical tool filename first (commit the move), then adapt assertions for unified schema and forgiving validation. Remove the other duplicate test file.
- Update any internal references to point to the canonical tools.

### Edge Cases and Behavior Details
- Duplicate simulator names across runtimes: choose the first available exact-name match reported by simctl; document limitation and recommend using UUID to disambiguate.
- Unavailable devices: require `isAvailable === true` during resolution.
- `useLatestOS` only applies to name-based xcodebuild destinations; when using UUID, OS version is implicitly determined by the device.
- Architecture (`arch`) only applies to macOS destinations.
- Logging: log at info for normal steps, warning when both id and name are provided but id is preferred, error for failures.

### Concrete File Map and Targets
- Tools (git mv, then edit, then delete the other):
  - build: mv `build_simulator_id.ts` → `build_simulator.ts` (or choose name variant if better), then rm the other
  - build & run: mv `build_run_simulator_id.ts` → `build_run_simulator.ts` (or choose name variant), then rm the other
  - get app path: mv `get_simulator_app_path_name.ts` → `get_simulator_app_path.ts`, then rm the id variant
  - test: mv `test_simulator_id.ts` → `test_simulator.ts` (or choose name variant), then rm the other
- Name wrappers for launch/stop: KEEP `launch_app_sim_name.ts` and `stop_app_sim_name.ts` (these provide useful name→UUID resolution for the UUID-only simctl commands)
- Helpers: prefer reusing existing helpers; adding a small `determineSimulatorUuid` helper under `src/utils/` is acceptable for unified tools that need a UUID after an xcodebuild phase.

### Success Criteria
- Only canonical simulator tools exist and are exposed.
- Unified schemas accept id or name; forgiving validation with warnings where safe.
- xcodebuild flows accept id or name without UUID lookup; simctl flows resolve name→UUID.
- Tests cover id-only, name-only, both (with warnings), neither (error), and XOR project/workspace.

### Examples
- Build by name (workspace):
  - `build_simulator({ workspacePath: "/path/App.xcworkspace", scheme: "App", simulatorName: "iPhone 16" })`
- Build & run by id (project):
  - `build_run_simulator({ projectPath: "/path/App.xcodeproj", scheme: "App", simulatorId: "ABCD-1234" })`
- Get app path by name (workspace, iOS Simulator):
  - `get_simulator_app_path({ workspacePath: "/path/App.xcworkspace", scheme: "App", platform: "iOS Simulator", simulatorName: "iPhone 16" })`
- Launch by UUID:
  - `launch_app_sim({ simulatorUuid: "ABCD-1234", bundleId: "com.example.App" })`

This plan reflects the current code and clarifies where logic is already consolidated versus where small, targeted changes will align all tools under the same behavior and helper set.