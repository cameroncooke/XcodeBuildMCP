# Project Config + Session Defaults Plan

## Goal
Add a project-level config file at `.xcodebuildmcp/config.yaml` that:
1. Seeds session defaults at server startup (no client call required).
2. Allows `session-set-defaults` to persist provided defaults back to that config when a flag is set.

Scope is limited to **cwd-only** resolution, **patch-only persistence** (provided keys only), and **warn+ignore** on invalid config.

## Decisions (Confirmed)
- Config location: **only** `process.cwd()/.xcodebuildmcp/config.yaml` (no find-up).
- Persistence: **only** keys provided in the `session-set-defaults` call (plus necessary deletions for mutual exclusivity).
- Invalid config: **warn and ignore**, continue startup.

## Config Format

Proposed YAML:

```yaml
schemaVersion: 1
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
- The config file is **not** exclusive to session defaults; future sections (e.g., `server`, `logging`, `discovery`) are expected.
- Relative paths resolve against the workspace root (cwd).

## Precedence (Operational)
We seed the in-memory session defaults from config at startup, so after boot it behaves like normal session defaults.
Operationally, the only precedence that matters during tool calls is:
1. Tool call args (existing behavior in `createSessionAwareTool`).
2. In-memory session defaults (initially seeded from config; can be changed by `session-set-defaults`).

## Implementation Plan

### 1) New shared schema for session defaults
**File:** `src/utils/session-defaults-schema.ts`
- Define a Zod schema that mirrors `SessionDefaults`.
- Used by both config loading and `session-set-defaults` to avoid drift.

### 2) New project config loader/writer
**File:** `src/utils/project-config.ts`
Responsibilities:
- Resolve config path: `path.join(cwd, '.xcodebuildmcp', 'config.yaml')`.
- Read YAML via `FileSystemExecutor`.
- Parse and validate with Zod.
- **Allow unknown top-level keys** (use `.passthrough()` in Zod) so non-session sections can exist without failing validation.
- Normalize mutual exclusivity:
  - If both `projectPath` and `workspacePath` are set, keep `workspacePath`.
  - If both `simulatorId` and `simulatorName` are set, keep `simulatorId`.
- Resolve relative paths for: `projectPath`, `workspacePath`, `derivedDataPath`.
- Persist changes when requested:
  - Merge provided keys into `sessionDefaults`.
  - Remove keys that were cleared due to exclusivity.
  - Overwrite YAML file (comments not preserved).

Suggested API:
```ts
export type LoadProjectConfigOptions = {
  fs: FileSystemExecutor;
  cwd: string;
};

export type LoadProjectConfigResult =
  | { found: false }
  | { found: true; path: string; config: ProjectConfig; notices: string[] };

export async function loadProjectConfig(
  options: LoadProjectConfigOptions,
): Promise<LoadProjectConfigResult>;

export type PersistSessionDefaultsOptions = {
  fs: FileSystemExecutor;
  cwd: string;
  patch: Partial<SessionDefaults>;
  deleteKeys?: (keyof SessionDefaults)[];
};

export async function persistSessionDefaultsToProjectConfig(
  options: PersistSessionDefaultsOptions,
): Promise<{ path: string }>;
```

### 3) Startup injection
**File:** `src/server/bootstrap.ts`
- Accept `fileSystemExecutor` and `cwd` in `BootstrapOptions` (default to `getDefaultFileSystemExecutor()` and `process.cwd()`).
- Load project config at the top of `bootstrapServer()`.
- On success: `sessionStore.setDefaults(normalizedDefaults)`.
- On parse/validation error: log warning and continue.

### 4) Persist flag in `session-set-defaults`
**File:** `src/mcp/tools/session-management/session_set_defaults.ts`
- Extend schema with `persist?: boolean`.
- Use `createTypedToolWithContext` to access `{ fs, cwd }`.
- Apply defaults to `sessionStore` as usual.
- If `persist === true`, call `persistSessionDefaultsToProjectConfig()` with:
  - `patch`: only keys provided in the tool call (excluding `persist`).
  - `deleteKeys`: keys removed due to exclusivity rules.
- Add a notice in response: `Persisted defaults to <path>`.

### 5) Clear defaults key parity
**File:** `src/mcp/tools/session-management/session_clear_defaults.ts`
- Expand `keys` list to match full `SessionDefaults` surface.

### 6) Documentation updates
- Update `docs/SESSION_DEFAULTS.md` to mention config auto-load + `persist` flag.
- Update tool description in `src/mcp/tools/session-management/index.ts`.

### 7) Dependency
- Add `yaml` package for parsing/serializing.

## Tests
- This change **must** be built TDD (red → green): write failing tests first, then implement code until tests pass.
- Add unit tests for `project-config` loader and persistence using `createMockFileSystemExecutor`.
- Update `session_set_defaults.test.ts` to cover `persist` path and mutual exclusivity deletions.

## Risks / Notes
- Overwriting YAML drops comments and custom formatting.
- Explicitly **cwd-only** prevents automatic discovery from subdirectories.
- Warn+ignore avoids startup failures but can hide misconfigurations; add clear log messaging.
