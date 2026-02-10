# Project Config + Runtime Config Store Plan

## Goal
Add a project-level config file at `.xcodebuildmcp/config.yaml` and a global runtime config store that:
1. Seeds session defaults at server startup (no client call required).
2. Supports **all** configuration options in config.yaml (not just session defaults).
3. Uses environment variables as defaults for any unset config fields.
4. Exposes a single source of truth for configuration reads and persistence.

Scope is limited to **cwd-only** resolution, **patch-only persistence** (provided keys only), and **warn+ignore** on invalid config.

## Decisions (Confirmed)
- Config location: **only** `process.cwd()/.xcodebuildmcp/config.yaml` (no find-up).
- Persistence: **only** keys provided in the `session-set-defaults` call (plus necessary deletions for mutual exclusivity).
- Invalid config: **warn and ignore**, continue startup.
- Config format: **flat** keys for everything except `sessionDefaults`.
- Workflow selection: `enabledWorkflows` is optional; when resolved, an empty array means "load all workflows".
- Config store pre-init: **safe defaults** (env + hardcoded) until initialized.

## Config Format

Proposed YAML (flat except `sessionDefaults`):

```yaml
schemaVersion: 1
enabledWorkflows: ["simulator"]
debug: false
experimentalWorkflowDiscovery: false
disableSessionDefaults: false
uiDebuggerGuardMode: "warn"
incrementalBuildsEnabled: false
dapRequestTimeoutMs: 30000
dapLogEvents: false
launchJsonWaitMs: 8000
axePath: "/opt/axe/bin/axe"
iosTemplatePath: "/path/to/ios/templates"
iosTemplateVersion: "v1.2.3"
macosTemplatePath: "/path/to/macos/templates"
macosTemplateVersion: "v1.2.3"
debuggerBackend: "dap"
sessionDefaults:
  projectPath: "./MyApp.xcodeproj"
  workspacePath: "./MyApp.xcworkspace"
  scheme: "MyApp"
  configuration: "Debug"
  simulatorName: "iPhone 16"
  simulatorId: "<UUID>"
  deviceId: "<UUID>"
  useLatestOS: true
  arch: "arm64"
  suppressWarnings: false
  derivedDataPath: "./.derivedData"
  preferXcodebuild: false
  platform: "iOS"
  bundleId: "com.example.myapp"
```

Notes:
- `schemaVersion` supports future evolution.
- The config file is **not** exclusive to session defaults; more flat keys can be added as needed.
- Relative paths resolve against the workspace root (cwd).

## Precedence (Operational)
Runtime config precedence for all non-session defaults:
1. Programmatic overrides
2. Config file (`.xcodebuildmcp/config.yaml`)
3. Environment variables
4. Hardcoded defaults

Session defaults precedence during tool calls remains:
1. Tool call args (existing behavior in `createSessionAwareTool`)
2. In-memory session defaults (seeded from config, mutable via `session-set-defaults`)

## Implementation Plan

### 1) Unified config schema (flat + sessionDefaults)
**File:** `src/utils/runtime-config-schema.ts` (new)
- Define Zod schema for all supported config keys.
- Keep `sessionDefaults` shape from `session-defaults-schema.ts`.
- Allow unknown top-level keys via `.passthrough()`.

### 2) Expand project config loader/writer
**File:** `src/utils/project-config.ts`
Responsibilities:
- Resolve config path: `path.join(cwd, '.xcodebuildmcp', 'config.yaml')`.
- Read YAML via `FileSystemExecutor`.
- Parse and validate with unified schema.
- Normalize mutual exclusivity in `sessionDefaults`.
- Normalize `enabledWorkflows` into a string[]; preserve "unset" at the config file level.
- Resolve relative paths for `projectPath`, `workspacePath`, and `derivedDataPath`.
- Persist changes when requested:
  - Deep-merge patch keys into existing config.
  - Remove keys explicitly cleared (e.g., exclusivity deletions).
  - Preserve unknown keys.

### 3) Global config store (single source of truth)
**File:** `src/utils/config-store.ts` (new)
- Build resolved runtime config with precedence:
  - overrides > config.yaml > env vars > defaults
- Provide `initConfigStore(...)` and `getConfig()` APIs.
- Provide a persistence helper for session defaults patches that updates config.yaml and the in-memory store.

### 4) Startup initialization
**File:** `src/server/bootstrap.ts`
- Initialize config store early with `cwd` + `fs`.
- Seed `sessionStore` from `config.sessionDefaults`.
- Use `config.enabledWorkflows`; empty array means "load all".

### 5) Replace env reads with config store lookups
**Files:** `workflow-selection.ts`, `environment.ts`, `xcodemake.ts`,
`template-manager.ts`, `axe-helpers.ts`, `debugger-manager.ts`
- Keep existing behaviors, but route through config store.
- Env vars remain as defaults through the store.

### 6) Persist via config store
**File:** `src/mcp/tools/session-management/session_set_defaults.ts`
- Persist session defaults through config store API.
- Keep `deleteKeys` for mutual exclusivity.

### 7) Runtime overrides
**File:** runtime entrypoints
- Pass overrides into bootstrap/config store, so explicit runtime overrides have the highest precedence.

### 8) Documentation updates
- Update `docs/CONFIGURATION.md`, `docs/GETTING_STARTED.md`, `docs/SESSION_DEFAULTS.md`.

## Tests
This change **must** be built TDD (red → green): write failing tests first, then implement code until tests pass.

Red tests to add before implementation:
- `project-config` loader: flat keys + env fallback + enabledWorkflows normalization.
- `project-config` persistence: deep-merge patch + delete keys + preserve unknown keys.
- `config-store` resolution order: env vs config.yaml vs overrides.
- `session_set_defaults` persistence via config store.

## Risks / Notes
- Overwriting YAML drops comments and custom formatting.
- Explicitly **cwd-only** prevents automatic discovery from subdirectories.
- Warn+ignore avoids startup failures but can hide misconfigurations; add clear log messaging.
