# Tool Registry Refactor: Manifest-Driven Workflows & Tools (No Codegen)

Status: Proposed (canonical target design)
Last updated: 2026-02-04

## Executive summary

XcodeBuildMCP currently discovers workflows/tools using build-time filesystem scanning and code generation (`generated-plugins.ts`) and separately generates a static `tools-manifest.json` for CLI listing. This has created drift:

- CLI `xcodebuildmcp tools` is sourced from a JSON manifest and can disagree with what the runtime CLI actually exposes (runtime visibility filtering differs).
- Tool identity can drift between filename-based naming (analysis scripts) and `export default { name: ... }` naming at runtime.

This refactor replaces the “clever” discovery system with a **human-managed YAML manifest registry** as the **single source of truth** for:

- Workflows and their metadata (title, description)
- Tools and their metadata (names for MCP and CLI, descriptions, routing)
- Per-runtime availability (MCP vs CLI vs daemon)
- Runtime visibility rules via **named predicates** selected in YAML

The runtime uses the manifest to:
- Load tool implementations via dynamic import from the package `build/**` tree
- Build the CLI command tree and the `xcodebuildmcp tools` listing from the same catalog
- Register MCP tools consistently with the same filtering rules
- Support dynamic Xcode IDE tool proxying (mcpbridge) and hide conflicting XcodeBuildMCP tools when running under Xcode agent mode, per `XCODE_IDE_TOOL_CONFLICTS.md`

Key design constraints:
- **No build-time plugin discovery/codegen**
- **Multiple YAML manifests** to avoid monolith file size
- **Predicate registry only** (YAML references predicate names; logic is coded in TS)
- Safe for `npm`/`npx` installs by resolving everything from **package root** (not `cwd`)
- Tool module metadata moves out of tool modules as part of this plan

---

## Goals

1. **Single source of truth**: one canonical registry for workflow/tool metadata and exposure rules.
2. **Consistency**: CLI `tools` output, CLI subcommands, and MCP server tool list use the same data and filtering logic.
3. **Explicit MCP vs CLI naming**:
   - MCP tool name is stable and explicit.
   - CLI tool name is explicit or derived from MCP name.
4. **Explicit per-runtime availability**:
   - Workflows/tools can be enabled/disabled independently for MCP, CLI, and daemon.
5. **Runtime visibility is configurable and auditable**:
   - Predicates are named, versioned functions in code and referenced in YAML.
6. **Dynamic Xcode IDE tools supported**:
   - Proxied `xcode_tools_*` tools remain dynamic.
   - When running under Xcode and Xcode Tools are active, hide conflicting XcodeBuildMCP tools as documented.

---

## Non-goals

- Rewriting tool implementations.
- Creating an expression language in YAML (predicates are registry-only).
- Supporting bundling that eliminates individual tool modules on disk. (We require that tool modules exist in the shipped package.)

---

## Why a manifest registry?

### Problems with the current approach
- Build-time codegen (`plugin-discovery.ts`) produces `generated-plugins.ts`. Runtime behavior depends on generated code correctness and build pipeline ordering.
- CLI `xcodebuildmcp tools` uses `tools-manifest.json` which bypasses runtime filtering and naming rules.
- Static analysis uses filenames for tool identity, while runtime uses exported `name`, causing mismatches.

### Manifest registry benefits
- Human-managed, easy to reason about, explicit.
- One place to edit availability and names.
- Eliminates codegen and AST parsing complexity.
- Enables data-driven conflict filtering with Xcode IDE tools.

---

## Repository layout (new)

The registry is stored in multiple small YAML files:

```
manifests/
  workflows/
    simulator.yaml
    device.yaml
    doctor.yaml
    ...
  tools/
    build_sim.yaml
    discover_projs.yaml
    clean.yaml
    ...
```

Rules:
- Each YAML file defines exactly one object with a unique `id`.
- Duplicate `id`s are an error.
- Workflows reference tools by tool `id`.
- Tools are defined once (no “re-export” duplication); multiple workflows can reference the same tool.

---

## Canonical data model

### Tool manifest entry

A tool manifest entry describes:
- Where the implementation lives (module path)
- Names for MCP and CLI
- Description(s)
- Availability by runtime
- Predicates for visibility filtering
- Routing hints for daemon affinity

Example: `manifests/tools/discover_projs.yaml`

```yaml
id: discover_projs

# Module identifier (extensionless). Resolved to build/<module>.js at runtime.
# Must be package-root relative (not cwd-relative).
module: mcp/tools/project-discovery/discover_projs

names:
  # MCP name is required and must be globally unique.
  mcp: discover_projs

  # CLI name optional. If omitted, derived as kebab-case of MCP name
  # (e.g. discover_projs -> discover-projs)
  cli: discover-projs

description: "Discover Xcode projects/workspaces in a directory."

availability:
  mcp: true
  cli: true
  daemon: true

# Visibility rules: predicate names, all must pass to expose tool.
predicates:
  - hideWhenXcodeAgentMode

routing:
  stateful: false
  daemonAffinity: preferred  # preferred | required
```

### Workflow manifest entry

Example: `manifests/workflows/simulator.yaml`

```yaml
id: simulator
title: "iOS Simulator Development"
description: "Complete iOS development workflow targeting simulators."

availability:
  mcp: true
  cli: true
  daemon: true

# Optional workflow selection rules, primarily for MCP selection defaults.
selection:
  mcp:
    # Mandatory workflows are always included in MCP selection.
    mandatory: false

    # defaultEnabled is used when config.enabledWorkflows is empty.
    defaultEnabled: true

    # autoInclude means “include when predicates pass even if not requested”.
    autoInclude: false

# Workflow-level predicates: if any fail, workflow is hidden for that runtime.
predicates: []

tools:
  - boot_sim
  - build_sim
  - build_run_sim
  - test_sim
  - discover_projs
  - clean
  - list_sims
```

### Mandatory workflow example (session-management)

`manifests/workflows/session-management.yaml`

```yaml
id: session-management
title: "Session Management"
description: "Manage session defaults for project/workspace paths, scheme, simulator/device defaults."

availability:
  mcp: true
  cli: false
  daemon: false

selection:
  mcp:
    mandatory: true
    defaultEnabled: true
    autoInclude: true

tools:
  - session_show_defaults
  - session_set_defaults
  - session_clear_defaults
```

### Workflow auto-inclusion example (doctor, workflow-discovery)

`manifests/workflows/doctor.yaml`

```yaml
id: doctor
title: "System Doctor"
description: "Diagnostics and environment checks."

availability: { mcp: true, cli: true, daemon: true }

selection:
  mcp:
    mandatory: false
    defaultEnabled: false
    autoInclude: true

predicates:
  - debugEnabled

tools:
  - doctor
```

`manifests/workflows/workflow-discovery.yaml`

```yaml
id: workflow-discovery
title: "Workflow Discovery"
description: "Manage enabled workflows at runtime."

availability: { mcp: true, cli: false, daemon: false }

selection:
  mcp:
    mandatory: false
    defaultEnabled: false
    autoInclude: true

predicates:
  - experimentalWorkflowDiscoveryEnabled

tools:
  - manage_workflows
```

---

## Names and uniqueness rules

### MCP name
- `names.mcp` is required and is the canonical identity for MCP registration.
- Must be unique across all tools.

### CLI name
- `names.cli` optional; if omitted it is derived from MCP name:
  - `_` → `-`
  - camelCase → kebab-case
- Must be unique across all tools after derivation.
- If a collision occurs, the registry must explicitly set `names.cli` for one of the tools (we fail fast instead of auto-disambiguating).

### Why this design?
- Avoids runtime ambiguity and “clever” automatic disambiguation.
- Encourages stable CLI UX.

---

## Availability rules (CLI vs MCP vs daemon)

Availability can be set at both workflow and tool level:
- Workflow availability gate applies first.
- Tool availability gate applies second.

A tool is exposed only if:
- workflow availability for runtime is true
- tool availability for runtime is true
- all predicates (workflow + tool) pass for the current runtime context

---

## Predicate registry (registry-only; YAML references predicate names)

Predicates are named functions in code. YAML includes predicate names; there is no expression language.

### Context passed to predicates

```ts
type PredicateContext = {
  runtime: 'cli' | 'mcp' | 'daemon';
  config: ResolvedRuntimeConfig;

  // environment-derived
  runningUnderXcode: boolean;

  // dynamic bridge-derived (MCP only; false otherwise)
  xcodeToolsActive: boolean;
};
```

### Built-in predicates (initial set)

- `debugEnabled`: true if config debug mode is enabled
- `experimentalWorkflowDiscoveryEnabled`: true if experimental workflow discovery is enabled
- `hideWhenXcodeAgentMode`: hides tool/workflow when:
  - running under Xcode agent, AND
  - Xcode Tools bridge is active (proxied tools are available)

This predicate powers the policy described in `XCODE_IDE_TOOL_CONFLICTS.md`.

### Applying Xcode IDE conflict policy

Tools that conflict with Xcode IDE tools are tagged in YAML with:

```yaml
predicates:
  - hideWhenXcodeAgentMode
```

This keeps the conflict policy:
- human-managed
- auditable
- easy to update without code changes

---

## Dynamic Xcode IDE tools (mcpbridge)

### What is dynamic?
When `xcode-ide` is enabled, XcodeBuildMCP proxies Xcode tools via `xcrun mcpbridge` and registers tools dynamically with names:
- `xcode_tools_<RemoteToolName>`

These tools:
- are not listed in the YAML registry (their set changes at runtime)
- are always registered under the `xcode_tools_` prefix to avoid collisions
- can trigger `tools/listChanged` updates

### How dynamic tools influence static tool visibility
When dynamic tools are active (`xcodeToolsActive`), conflict-tagged XcodeBuildMCP tools are hidden via `hideWhenXcodeAgentMode`.

This behavior is:
- scoped to MCP runtime
- driven by bridge status
- re-applied whenever bridge status changes

---

## Runtime logic flows

### CLI runtime
1. Load manifest registry from package root.
2. Build CLI exposure context:
   - runtime: `cli`
   - `runningUnderXcode: false` (CLI does not use Xcode IDE bridge)
   - `xcodeToolsActive: false`
3. Build `ToolCatalog` from manifest (no codegen, no AST).
4. Register yargs commands from catalog.
5. `xcodebuildmcp tools` lists from the same catalog.

### MCP runtime
1. Load manifest registry from package root.
2. Load runtime config.
3. Build exposure context:
   - runtime: `mcp`
   - `runningUnderXcode` from environment detection
4. Select workflows:
   - include mandatory workflows
   - include requested workflows
   - if none requested: include defaultEnabled workflows
   - include autoInclude workflows whose predicates pass
5. Initialize Xcode bridge if `xcode-ide` workflow is enabled.
6. Compute `xcodeToolsActive` from bridge status.
7. Register static tools from manifest applying availability + predicates.
8. Register dynamic `xcode_tools_*` tools from bridge.
9. On bridge status changes, recompute `xcodeToolsActive` and re-apply static tool registration.

### Daemon runtime
1. Load manifest registry.
2. Build daemon exposure context:
   - runtime: `daemon`
   - runningUnderXcode=false
   - xcodeToolsActive=false
3. Build daemon `ToolCatalog` from manifest and expose over daemon protocol.

---

## Build and packaging requirements (npm/npx safe)

This refactor requires that tool modules exist on disk at runtime for dynamic imports.

### Key requirements
1. Keep a single entrypoint for users:
   - CLI bin remains `build/cli.js` (or equivalent)
   - MCP starts from a single JS entrypoint
2. Emit an **unbundled** build tree:
   - `build/**` contains tool modules and their dependencies
3. Ship manifests:
   - `manifests/**` must be included in published package
4. Resolve everything from **package root**, not `process.cwd()`:
   - npx installs packages into a temporary directory; cwd can be arbitrary
   - dynamic imports must use absolute paths derived from package root

### Module resolution convention
Manifest uses extensionless module IDs:
- `module: mcp/tools/simulator/boot_sim`

At runtime the loader imports:
- `${packageRoot}/build/${module}.js` (packaged)
- optionally `${packageRoot}/src/${module}.ts` (dev fallback)

---

## Implementation plan (phased migration)

### Phase 1: introduce manifest system + predicate registry
- Add `manifests/workflows/*.yaml` and `manifests/tools/*.yaml`
- Add manifest loader, schemas, predicate registry, exposure evaluator
- Add package-root resolver utilities
- Add tool module importer with backward-compatible adapter

### Phase 2: fix CLI `tools` drift immediately
- Change `xcodebuildmcp tools` to list from the runtime `ToolCatalog` (manifest-based)
- Remove dependence on `tools-manifest.json`

### Phase 3: migrate CLI catalog build to manifest-driven
- Build CLI ToolCatalog from manifest + imported tool implementations
- Enforce unique CLI names in manifest (fail fast)

### Phase 4: migrate MCP registration to manifest-driven
- Replace generated loader usage with manifest selection + import-based registration
- Wire in Xcode bridge status → `xcodeToolsActive` updates
- Apply conflict filtering via `hideWhenXcodeAgentMode`

### Phase 5: migrate daemon to manifest-driven
- Daemon builds catalog from manifest
- CLI invocation routing unchanged, but tool list and names now consistent everywhere

### Phase 6: move tool metadata out of tool modules
- Update tools to export only implementation (schema, handler, annotations)
- Manifest becomes authoritative for names, descriptions, routing, availability, predicates
- Remove legacy `PluginMeta`-style defaults once all tools migrated

### Phase 7: delete legacy code paths
- Remove build-time plugin discovery + generated loaders
- Remove static AST tools analysis scripts
- Remove old manifest JSON generator
- Update docs generation to read YAML registry

---

## Worked example: tagging conflict tools (Xcode agent mode)

Per `XCODE_IDE_TOOL_CONFLICTS.md`, hide `build_sim` inside Xcode agent mode when Xcode Tools are active:

`manifests/tools/build_sim.yaml`

```yaml
id: build_sim
module: mcp/tools/simulator/build_sim
names:
  mcp: build_sim
  cli: build-sim
description: "Build an iOS app for a simulator target."
availability: { mcp: true, cli: true, daemon: true }
predicates:
  - hideWhenXcodeAgentMode
routing:
  stateful: false
  daemonAffinity: preferred
```

When:
- runningUnderXcode=true AND xcodeToolsActive=true
then `hideWhenXcodeAgentMode` fails and tool is not registered/listed in MCP (but remains in CLI outside Xcode).

---

## FAQ

### Why not keep codegen?
Because it is a second “source of truth” and forces build pipeline coupling. The manifest removes that complexity and makes the system human-managed and predictable.

### Will unbundled output break npx?
No, as long as:
- you ship the emitted modules and manifests
- your loader resolves from package root using `import.meta.url` and file URLs
- you do not depend on `cwd` relative paths

### How do we prevent runtime failures due to missing modules?
Manifest loader performs startup validation:
- verifies each `module` path exists as `build/<module>.js` in packaged mode
- fails fast with a clear error indicating which manifest entry is broken

---

## Appendix: current modules to be deprecated

- build-plugins/plugin-discovery.ts
- src/core/generated-plugins.ts
- scripts/analysis/tools-analysis.ts
- scripts/generate-tools-manifest.ts
- CLI tools listing dependence on tools-manifest.json

These are removed once the manifest registry is the only path.

# Plan

<chatName="Unify tool/workflow metadata via human-managed YAML manifests + predicate registry"/>

## Proposed direction: **Yes — replace codegen + AST manifest with human-managed YAML manifests**

Your goals map cleanly to a **data-driven manifest** architecture:

- **One source of truth** for workflow/tool metadata: YAML.
- **No build-time plugin discovery**, no generated loaders, no AST scanning.
- **Separate MCP vs CLI names** (with sane defaults `_ ↔ -` when one is omitted).
- **Per-runtime availability** (`mcp`, `cli`, `daemon`) at both workflow and tool level.
- **Runtime visibility rules are coded predicates** from a registry and **opted-in** via manifest flags.
- **Dynamic Xcode Tools (mcpbridge) stay dynamic**, but their presence drives predicates (per `XCODE_IDE_TOOL_CONFLICTS.md`).

---

## 1) Manifest system design (supports multiple manifests)

### 1.1 Layout: many small YAML files (avoids a giant 70+ tool file)

Use a directory with two subdirectories; each workflow/tool can be edited independently.

```
manifests/
  workflows/
    simulator.yaml
    device.yaml
    xcode-ide.yaml
    ...
  tools/
    build_sim.yaml
    discover_projs.yaml
    clean.yaml
    ...
```

**Merge rule (simple, not clever):**
- Each file defines exactly **one object** with a unique `id`.
- Duplicate IDs across files are a **hard error** at startup / docs generation.
- No implicit overrides (keeps it easy to reason about).

### 1.2 Canonical model: tools are defined once, workflows reference them
This avoids duplication for “re-exported” tools (e.g. `discover_projs` appearing in multiple workflows today).

#### `manifests/tools/discover_projs.yaml`
```yaml
id: discover_projs
module: mcp/tools/project-discovery/discover_projs   # extensionless
names:
  mcp: discover_projs
  cli: discover-projs
description: "Discover Xcode projects/workspaces in a directory."
availability: { mcp: true, cli: true, daemon: true }
predicates:
  - hideWhenXcodeAgentMode   # from predicate registry
routing:
  stateful: false
  daemonAffinity: preferred
```

#### `manifests/workflows/simulator.yaml`
```yaml
id: simulator
title: "iOS Simulator Development"
description: "Complete iOS development workflow targeting simulators."
availability: { mcp: true, cli: true, daemon: true }

selection:
  mcp:
    mandatory: false
    defaultEnabled: true     # replaces hard-coded DEFAULT_WORKFLOW=simulator
    autoInclude: false

predicates: []

tools:
  - boot_sim
  - build_sim
  - build_run_sim
  - test_sim
  - discover_projs
  - clean
```

#### `manifests/workflows/session-management.yaml`
```yaml
id: session-management
title: "Session Management"
description: "Manage session defaults."

availability: { mcp: true, cli: false, daemon: false }
selection:
  mcp:
    mandatory: true          # replaces REQUIRED_WORKFLOW=session-management
    defaultEnabled: true
    autoInclude: true

tools:
  - session_show_defaults
  - session_set_defaults
  - session_clear_defaults
```

### 1.3 Naming rules (simple defaults)
- **MCP name**: required (`names.mcp`), stable, underscore style.
- **CLI name**: optional (`names.cli`)
  - if absent: derive via `toKebabCase(names.mcp)` (underscore → hyphen)
- **Validation**:
  - MCP names must be globally unique
  - CLI names must be globally unique *after derivation*
  - If a collision happens, manifest must specify an explicit CLI name for one of them (no automatic disambiguation).

---

## 2) Predicate registry design (registry-only, referenced by name in YAML)

### 2.1 Context object
Predicates get a runtime context; YAML only references predicate names.

```ts
// src/visibility/predicate-types.ts
export type RuntimeKind = 'cli' | 'mcp' | 'daemon';

export type PredicateContext = {
  runtime: RuntimeKind;
  config: import('../utils/config-store.ts').ResolvedRuntimeConfig;

  // environment-derived
  runningUnderXcode: boolean;

  // dynamic bridge-derived (MCP only; false elsewhere)
  xcodeToolsActive: boolean;
};
```

### 2.2 Registry + evaluator
```ts
// src/visibility/predicate-registry.ts
export type PredicateFn = (ctx: PredicateContext) => boolean;

export const PREDICATES: Record<string, PredicateFn> = {
  debugEnabled: (ctx) => ctx.config.debug,
  experimentalWorkflowDiscoveryEnabled: (ctx) => ctx.config.experimentalWorkflowDiscovery,

  // Key for XCODE_IDE_TOOL_CONFLICTS.md
  hideWhenXcodeAgentMode: (ctx) => !(ctx.runningUnderXcode && ctx.xcodeToolsActive),
};

export function evalPredicates(names: string[] | undefined, ctx: PredicateContext): boolean {
  for (const name of names ?? []) {
    const fn = PREDICATES[name];
    if (!fn) throw new Error(`Unknown predicate '${name}'`);
    if (!fn(ctx)) return false;
  }
  return true;
}
```

### 2.3 Applying `XCODE_IDE_TOOL_CONFLICTS.md`
Instead of hardcoding conflict tool lists in TS, you mark the conflicting tools in YAML with:

```yaml
predicates:
  - hideWhenXcodeAgentMode
```

That is the clean “single source of truth” you’re looking for.

---

## 3) Runtime loaders (no codegen): manifest → tool modules → catalogs/registration

### 3.1 Manifest loader (multi-file)
New module reads all YAML files, validates structure, and produces an in-memory `ResolvedManifest`.

```ts
// src/core/manifest/load-manifest.ts
export type ToolManifestEntry = {
  id: string;
  module: string; // extensionless module path
  names: { mcp: string; cli?: string };
  description?: string;
  availability: { mcp: boolean; cli: boolean; daemon: boolean };
  predicates?: string[];
  routing?: { stateful?: boolean; daemonAffinity?: 'preferred' | 'required' };
};

export type WorkflowManifestEntry = {
  id: string;
  title: string;
  description: string;
  availability: { mcp: boolean; cli: boolean; daemon: boolean };
  selection?: { mcp?: { mandatory?: boolean; defaultEnabled?: boolean; autoInclude?: boolean } };
  predicates?: string[];
  tools: string[]; // tool IDs
};

export type ResolvedManifest = {
  tools: Map<string, ToolManifestEntry>;
  workflows: Map<string, WorkflowManifestEntry>;
};
```

**Key design choice:** module path is **extensionless** and package-relative (e.g. `mcp/tools/simulator/boot_sim`). Loader resolves `.js` in built output (and optionally `.ts` in dev).

```ts
export async function importToolModule(moduleId: string): Promise<{
  schema: import('../plugin-types.ts').ToolSchemaShape;
  handler: import('../plugin-types.ts').PluginMeta['handler'];
  annotations?: import('@modelcontextprotocol/sdk/types.js').ToolAnnotations;
}> { /* adapter supports default export or named exports */ }
```

---

## 4) Unified filtering/exposure rules (MCP + CLI + daemon)

### 4.1 Single filter function (manifest + predicates + runtime)
```ts
// src/visibility/exposure.ts
export function isWorkflowEnabledForRuntime(
  wf: WorkflowManifestEntry,
  ctx: PredicateContext,
): boolean;

export function isToolExposedForRuntime(
  tool: ToolManifestEntry,
  wf: WorkflowManifestEntry,
  ctx: PredicateContext,
): boolean;
```

Logic:
- availability gate: `wf.availability[ctx.runtime]` and `tool.availability[ctx.runtime]`
- predicate gate: `evalPredicates(wf.predicates, ctx)` and `evalPredicates(tool.predicates, ctx)`

This replaces:
- `src/utils/tool-visibility.ts` (hardcoded xcode-ide debug tools)
- the CLI manifest JSON listing divergence
- the plugin discovery / generated loaders path

---

## 5) MCP workflow selection becomes data-driven

Replace the hard-coded constants in `src/utils/workflow-selection.ts` with manifest `selection.mcp`.

**Selection rule (simple and matches current behavior):**
1. Start with `mandatory: true`
2. Add `autoInclude: true` if its predicates pass (covers `doctor` when debug enabled, `workflow-discovery` when experimental enabled)
3. If user config `enabledWorkflows` is empty:
   - include workflows with `defaultEnabled: true`
4. Else include requested workflows
5. Finally filter by availability + predicates

This gives you the same behavior you currently have, but **declared in YAML**.

---

## 6) Dynamic Xcode Tools (mcpbridge) integration (kept, but influences predicates)

### 6.1 Determine `xcodeToolsActive`
In MCP bootstrap, set `ctx.xcodeToolsActive` based on bridge status:

- `workflowEnabled && bridgeAvailable && connected && proxiedToolCount > 0`

### 6.2 Re-apply static tool registration when bridge becomes active/inactive
When the bridge syncs tools / disconnects, `xcodeToolsActive` can flip. If it flips, you must re-run the static registration pass so `hideWhenXcodeAgentMode` takes effect immediately.

This requires a small wiring change:
- add an event/callback in `XcodeToolsBridgeManager` (or expose status polling after sync)
- call `updateWorkflows(...)` (or a new `applyManifestSelection(...)`) when status changes

---

# Implementation plan (concrete file-by-file changes)

## Phase 1 — Add manifest system + predicate registry (no behavior change yet)

### New files
- `manifests/workflows/*.yaml`
- `manifests/tools/*.yaml`
- `src/core/manifest/schema.ts` (zod schemas for both yaml types)
- `src/core/manifest/load-manifest.ts` (loads and merges files)
- `src/core/manifest/import-tool-module.ts` (extension resolution + adapter)
- `src/visibility/predicate-types.ts`
- `src/visibility/predicate-registry.ts`
- `src/visibility/exposure.ts`

### Build/config update
You’ll need to ensure `manifests/**` is included in the published/built artifact.
- Likely update `package.json` `files` field and/or build copy step.
- If you’re currently bundling, switch to emitting a directory structure (so dynamic imports work).

**Side effects:** none yet; just plumbing.

---

## Phase 2 — Make CLI `tools` list come from runtime catalog (eliminate JSON manifest path)

### Modify
- `src/cli/commands/tools.ts`
  - Change `registerToolsCommand(app)` → `registerToolsCommand(app, catalog)`
  - Remove all `tools-manifest.json` reading logic
  - List from `catalog.tools`

- `src/cli/yargs-app.ts`
  - `registerToolsCommand(app);` → `registerToolsCommand(app, opts.catalog);`

**Result:** CLI `tools` can no longer drift from actual CLI-exposed tools.

---

## Phase 3 — Replace runtime `ToolCatalog` builder with manifest-driven builder

### Modify / replace
- `src/runtime/tool-catalog.ts`
  - New entrypoint:
    ```ts
    export async function buildToolCatalogFromManifest(opts: {
      runtime: 'cli' | 'daemon';
      manifest: ResolvedManifest;
      ctx: PredicateContext;
      includeWorkflows?: string[];
      excludeWorkflows?: string[];
    }): Promise<ToolCatalog>
    ```
  - Build `ToolDefinition` from manifest tool entries + imported module `{schema, handler, annotations}`
  - Apply exposure via `isToolExposedForRuntime(...)`
  - Validate CLI/MCP name uniqueness at construction time (hard error)

### Modify
- `src/cli/cli-tool-catalog.ts`
  - Replace `listWorkflowDirectoryNames()` + `buildToolCatalog(...)` with:
    - `loadManifest()`
    - build context for CLI (`runningUnderXcode=false`, `xcodeToolsActive=false`)
    - `buildToolCatalogFromManifest({ runtime: 'cli', ... })`

### Modify
- `src/daemon.ts`
  - Build catalog using manifest with `runtime: 'daemon'`

**Side effect:** tool exposure now fully controlled by YAML + predicate registry in CLI/daemon.

---

## Phase 4 — MCP registration becomes manifest-driven

### Modify
- `src/utils/tool-registry.ts`
  - Stop calling `loadWorkflowGroups()` (plugin registry)
  - Instead:
    - load manifest
    - compute selected workflows using new manifest-driven workflow selection
    - for each exposed tool, import module + `server.registerTool(mcpName, ...)`

### Modify
- `src/server/bootstrap.ts`
  - Build `PredicateContext` for MCP:
    - `runningUnderXcode = detectRunningUnderXcode()`
    - `xcodeToolsActive = computed from bridge status`
  - Ensure bridge is initialized *before* final static tool registration if you want conflict hiding to apply on first list.

### Modify
- `src/integrations/xcode-tools-bridge/manager.ts`
  - Add status-change callback/event so bootstrap can re-apply registration when bridge status changes.

---

## Phase 5 — Remove codegen + generated-plugin pipeline

### Remove/stop using
- `build-plugins/plugin-discovery.ts`
- `src/core/generated-plugins.ts`
- `src/core/plugin-registry.ts` (either delete or repurpose to be a manifest registry)
- scripts:
  - `scripts/analysis/tools-analysis.ts`
  - `scripts/generate-tools-manifest.ts`

### Update any imports
- Replace `WORKFLOW_METADATA` uses (CLI help) with manifest workflow titles/descriptions.

---

## Phase 6 — Move tool metadata out of tool modules (part of this plan)

### Target tool module shape
Instead of `export default { name, description, schema, handler, cli... }`, tools should export **only implementation**:

```ts
// src/mcp/tools/simulator/boot_sim.ts
export const schema = baseSchemaObject.shape;
export const annotations = { /* optional */ };
export async function handler(params: Record<string, unknown>) { ... }
```

Your manifest provides:
- names (mcp/cli)
- descriptions (cli/mcp if you want separate)
- routing (stateful/daemonAffinity)
- availability
- predicates

### Adapter during migration
`import-tool-module.ts` should support both forms initially:
- If `default` export exists and looks like old `PluginMeta`, take `schema/handler/annotations`
- Else use named exports

Once migrated, you can delete `PluginMeta`-style exports and simplify types.

**Side effects / important note:** any tool code that emits `nextSteps` referencing tool names must match manifest MCP names. This is easiest if MCP names remain the underscore-stable names you already use (recommended).

---

## Notes

### (1) Multiple manifests?
Yes—designed in. Use `manifests/tools/*.yaml` and `manifests/workflows/*.yaml`. The loader merges them with duplicate-ID errors. This keeps each file small and easy to manage.

### (2) Move meta out of tool modules as part of the plan?
Included as **Phase 6** with a supported migration adapter so you can convert incrementally but still land “manifest is authoritative” early.

### (3) Predicates registry only?
Yes—YAML only contains predicate names. Unknown predicate names are a startup error.

