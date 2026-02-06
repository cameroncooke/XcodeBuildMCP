# Investigation: Workflow/Tool Discovery, Registration, and Visibility (CLI vs MCP)

## Summary
Discovery is build-time (filesystem -> generated loaders), with runtime selection/visibility filtering applied in CLI/MCP/daemon catalogs. CLI `tools` listing diverges because it reads a static manifest that bypasses runtime visibility and naming rules.

## Symptoms
- CLI `tools` output can list tools that runtime CLI commands do not expose (debug-gated tools).
- Tool names in the manifest can differ from actual MCP tool names when export `name` differs from filename.

## Investigation Log

### 2026-02-04 - Build-time discovery and codegen
**Hypothesis:** Tools/workflows are discovered at build-time from filesystem and compiled into generated loaders.
**Findings:** Discovery scans `src/mcp/tools/*` and generates loaders/metadata in `src/core/generated-plugins.ts`, which runtime uses for plugin loading.
**Evidence:** `build-plugins/plugin-discovery.ts`, `src/core/generated-plugins.ts`, `src/core/plugin-registry.ts`.
**Conclusion:** Confirmed. Runtime does not live-scan the filesystem; it depends on generated loaders.

### 2026-02-04 - Runtime catalog and visibility filtering
**Hypothesis:** Runtime catalogs apply workflow selection and tool visibility filters.
**Findings:** `buildToolCatalog()` filters tools through `shouldExposeTool()` and resolves workflow selection, then CLI registers tool commands from the catalog.
**Evidence:** `src/runtime/tool-catalog.ts`, `src/utils/tool-visibility.ts`, `src/utils/workflow-selection.ts`, `src/cli/cli-tool-catalog.ts`, `src/cli/register-tool-commands.ts`.
**Conclusion:** Confirmed. Runtime catalog is the source for actual CLI commands, not the manifest.

### 2026-02-04 - CLI `tools` list divergence
**Hypothesis:** `xcodebuildmcp tools` uses a static manifest and ignores runtime visibility gates.
**Findings:** `tools` command loads `tools-manifest.json` and filters only by workflow exclusion/CLI flags; it does not call `buildToolCatalog()` or `shouldExposeTool()`.
**Evidence:** `src/cli/commands/tools.ts`, `scripts/generate-tools-manifest.ts`, `scripts/analysis/tools-analysis.ts`.
**Conclusion:** Confirmed. CLI `tools` can disagree with runtime command availability, especially for debug-gated tools.

### 2026-02-04 - Tool name mismatch (manifest vs runtime)
**Hypothesis:** Manifest uses filename as tool name while runtime uses export `name`, causing mismatches.
**Findings:** Manifest derives `ToolInfo.name` from file basename and writes `mcpName` from that; runtime uses `export default { name: ... }` as tool identity.
**Evidence:** `scripts/analysis/tools-analysis.ts`, `scripts/generate-tools-manifest.ts`, `src/core/plugin-registry.ts`, `src/mcp/tools/workflow-discovery/manage_workflows.ts`.
**Conclusion:** Confirmed. Example mismatch: `manage_workflows.ts` exports `name: 'manage-workflows'` but manifest reports `manage_workflows`.

### 2026-02-04 - Recent history review
**Hypothesis:** Recent commits may have introduced or modified these discovery/visibility flows.
**Findings:** Recent commits include MCP tool support and tool analysis updates around 2026-02-04.
**Evidence:** `git log -n 20` (commit `df690484` and `f4604d65`).
**Conclusion:** The MCP additions and tool analysis updates are recent; they likely interact with the manifest/runtime divergence.

## Root Cause
1) **CLI `tools` listing bypasses runtime catalog and visibility gates.** It reads a static manifest file and does not consult `shouldExposeTool()` or disambiguated CLI names, so it can show tools not available at runtime.
2) **Manifest naming uses filename as canonical tool identity.** Runtime identity is the exported `name` field, so any filename/name mismatch causes the manifest (and CLI listing/docs) to diverge from actual MCP tool names.

## Recommendations
1. Align `xcodebuildmcp tools` with the runtime catalog output (or apply the same visibility gates and naming rules in manifest generation).
2. Decide on a single source-of-truth for tool names:
   - Enforce `filename === export name`, or
   - Parse `name` from the default export during manifest generation.

## Preventive Measures
- Add a build-time validation step that fails when tool filenames and exported names diverge.
- Add a test that compares manifest output with runtime catalog to catch visibility/name drift.
