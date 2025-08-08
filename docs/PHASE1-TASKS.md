## Phase 1: Unify project/workspace tools (Clean)

This checklist tracks the Phase 1 consolidation work for the Clean tool. Goal: a single canonical `clean` tool (XOR `projectPath` | `workspacePath`) re-exported into all existing workflows, without changing business logic.

### Scope
- Keep all workflow groups unchanged (e.g., `simulator-project`, `simulator-workspace`, `macos-*`, `device-*`).
- Reduce duplicate tools by creating a single canonical tool and re-export it into each workflow group.
- No changes to logic functions; only the tool interface is unified.

### Tasks

- [x] Canonical tool
  - [x] Create `src/mcp/tools/utilities/clean.ts` (unified tool)
  - [x] Schema: Mutually exclusive `projectPath` or `workspacePath`
  - [x] Implement single logic function (no separate proj/ws logic files)

- [x] Logic files
  - [x] Remove `src/mcp/tools/utilities/clean_proj.ts`
  - [x] Remove `src/mcp/tools/utilities/clean_ws.ts`

- [x] Re-export unified tool in all relevant workflow groups as `clean.ts`
  - [x] `src/mcp/tools/simulator-project/clean.ts`
  - [x] `src/mcp/tools/simulator-workspace/clean.ts`
  - [x] `src/mcp/tools/macos-project/clean.ts`
  - [x] `src/mcp/tools/macos-workspace/clean.ts`
  - [x] `src/mcp/tools/device-project/clean.ts`
  - [x] `src/mcp/tools/device-workspace/clean.ts`

- [x] Remove obsolete per-variant re-exports (do not leave empty files)
  - [x] Delete `clean_proj.ts` and `clean_ws.ts` from the six workflow groups above

- [x] Tests
  - [x] Add `src/mcp/tools/utilities/__tests__/clean.test.ts` for unified tool
  - [x] Remove `utilities/__tests__/clean_proj.test.ts`
  - [x] Remove `utilities/__tests__/clean_ws.test.ts`
  - [x] Validate XOR behavior in handler (errors for none/both, success for single variant)

- [x] Documentation
  - [x] Update `docs/TOOLS.md` to replace `clean_proj`/`clean_ws` with `clean`
  - [x] Note that `clean` is available across project/workspace workflows via re-exports
  - [x] Generalize developer guidance in `docs/TOOLS.md`, `docs/CONTRIBUTING.md`, and `docs/PLUGIN_DEVELOPMENT.md` (XOR modeling, root-level empty-string normalization, conditional requirements, command/message hygiene)

- [x] Build, lint, tests
  - [x] `npm run build`
  - [x] `npm run format` (Prettier) and `npm run lint` (ESLint) — zero errors after format
  - [x] `npm run test`

- [x] Tool inventory validation
  - [x] `node scripts/tools-cli.js count --runtime --static --workflows`
  - [x] Confirm `clean` appears once canonically and via workflow re-exports

- [ ] Commit & PR
  - [ ] Commit on branch `feat/unify-project-workspace-tools`
  - [ ] Prepare PR with summary, docs updates, and test results

### Quality & Validation
- Lint/Format:
  - Ran `npm run format` to apply Prettier; then `npm run lint` → no errors.
  - No linter-disable comments added.
- Unit tests:
  - `utilities/__tests__/clean.test.ts` covers XOR validation:
    - Error when neither `projectPath` nor `workspacePath` is provided.
    - Error when both are provided.
    - Success for single variant (project-only and workspace-only).
- Integration tests (Reloaderoo):
  - macOS project build → clean with derived data path:
    - Build: `example_projects/macOS/MCPTest.xcodeproj` (scheme `MCPTest`) → success.
    - DerivedData files before clean: 2239; after clean: 2146.
  - iOS workspace build → clean with derived data path:
    - Build: `example_projects/iOS_Calculator/CalculatorApp.xcworkspace` (scheme `CalculatorApp`, simulator `iPhone 16`) → success.
    - DerivedData files before clean: 2036; after clean: 1879.
  - Validation permutations:
    - Project without selector succeeds (no scheme flag emitted)
    - Workspace without selector fails validation (selector required), empty-string treated as missing

### Notes
- Phase 2 will consolidate workflow groups (e.g., merge `simulator-project` and `simulator-workspace`), after Phase 1 is validated.


