# Tools CLI Schema Audit Output Plan

Goal: add a new Tools CLI option that prints every tool name, tool description, and tool call arguments with their descriptions (when set), plus a `--json` version, to audit tool schema strings.

## Current State (What Exists)
- CLI entrypoint: `scripts/tools-cli.ts` handles `count`, `list`, `static` and `--json`.
- Static analysis: `scripts/analysis/tools-analysis.ts` parses tool descriptions via AST but does not parse argument schemas.
- Runtime tool registration uses Zod schema shapes: `src/core/plugin-types.ts` + `src/utils/tool-registry.ts`.
- Tool schemas are Zod shapes with optional `.describe()` strings (examples in `src/mcp/tools/**`).

## Proposed CLI UX
- Add a new command `schema` (alias `schemas` or `audit`) or a new flag `--schema` on `list`.
- Output (human-readable):
  - Tool name
  - Tool description
  - Arguments section:
    - Each arg name
    - Arg description (or `No description provided`)
- Output (JSON):
  - Array of tools with `name`, `description`, `args: [{ name, description }]`
  - Keep the current `--json` behavior for other commands unchanged.

## Data Source Decision
Prefer static runtime-free loading via generated workflow loaders:
- Load tools via `loadWorkflowGroups()` from `src/core/plugin-registry.ts` to access in-repo tool metadata without requiring a build or running server.
- Each tool already exposes `schema` as a Zod shape (`Record<string, z.ZodType>`).
- Extract descriptions from Zod internals: `schema[key]._def.description` (guarded for undefined).

Fallback considerations:
- Reloaderoo `list-tools` does not appear to include input schema; runtime inspection likely cannot provide argument descriptions without adding new server output.
- Keep the new audit option in “static” mode only to avoid build/runtime coupling.

## Output Format (Human)
Example structure:

```
Tool: build_sim
Description: Builds an app for an iOS simulator.
Arguments:
  - scheme: The scheme to use (Required)
  - simulatorId: UUID of the simulator ...
  - simulatorName: Name of the simulator ...
  - configuration: Build configuration (Debug, Release, etc.)
```

Design notes:
- Sort tools alphabetically.
- Sort argument names alphabetically (or preserve schema insertion order for stability).
- Use clear labels and spacing; one blank line between tools.

## JSON Format
Example:

```json
{
  "tools": [
    {
      "name": "build_sim",
      "description": "Builds an app for an iOS simulator.",
      "args": [
        { "name": "scheme", "description": "The scheme to use (Required)" },
        { "name": "simulatorId", "description": "UUID of the simulator ..." }
      ]
    }
  ]
}
```

Keep `--json` aligned with existing behavior: if the new command is used, emit only the schema-audit JSON; do not include summary stats unless explicitly requested.

## Implementation Steps (Do Not Execute)
1. Add CLI command/flag parsing in `scripts/tools-cli.ts` for the schema audit view; update help text.
2. Add a static loader path:
   - Import `loadWorkflowGroups()` from `src/core/plugin-registry.ts`.
   - Gather all tools, dedupe by tool name (match `tool-registry` behavior).
3. Extract argument descriptions:
   - For each tool’s `schema` (shape), iterate entries.
   - Pull `description` from `schemaEntry?._def?.description` (string or undefined).
   - Produce `{ name, description }` records; use `null` or “No description provided” in human output.
4. Implement output formatting:
   - Human-readable: labeled fields per tool.
   - JSON: `tools: []` only (no emojis, no ANSI).
5. Add tests:
   - Unit test to ensure a tool with Zod `.describe()` surfaces descriptions.
   - Test for tools with no arg descriptions (ensure output uses fallback).
   - Snapshot-style test for the JSON schema output.
6. Docs:
   - Update CLI help text in `scripts/tools-cli.ts`.
   - If this is considered a tooling change, consider updating CLI docs via `npm run docs:update` (per `docs/dev/README.md` conventions).

## Risks and Edge Cases
- Some tools use session-aware public schemas; descriptions may be absent for session-managed args (expected).
- Zod `.describe()` is optional; audit must handle missing descriptions without errors.
- Dynamic imports in `loadWorkflowGroups()` may require tsx execution (already used by tools CLI).

## Verification Plan (When Implementing)
- Run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test`.
- Manual sanity:
  - `npm run tools schema`
  - `npm run tools schema --json`
