# Investigation + Plan: Simulator Selector Normalization, CLI Determinism, and Platform Inference

## Purpose

This document separates three related but distinct problem domains and defines a concrete implementation plan for each.

## Problem Domains

1. Inconsistent handling of `simulatorId` and `simulatorName` across logic paths.
2. CLI hydrates session defaults, which makes CLI behavior non-deterministic.
3. Non-iOS simulator targets (watchOS/tvOS/visionOS) can use incorrect platform names and fail builds.

## Scope

1. Keep existing CLI argument UX and command surface.
2. Keep existing runtime validation behavior (`oneOf`/`allOf`/XOR checks).
3. Change only session-default hydration behavior, selector normalization behavior, and platform inference behavior.
4. Stateful CLI behavior (daemon, logs, debug sessions) remains by design and is out of scope.

## Decision Snapshot

1. Platform inference must support non-iOS simulators using simulator runtime metadata, with build-settings only as fallback.
2. Session defaults must be MCP-only runtime behavior (no CLI/daemon hydration into `sessionStore`).
3. Store both `simulatorId` and `simulatorName` in session defaults/config and disambiguate at tool boundary via shared helper logic.
4. Persist only `simulatorPlatform` as platform cache; do not persist `simulatorRuntime` or timestamp fields.

---

## Domain 1: `simulatorId` / `simulatorName` Normalization

## Current State (verified)

1. `session_set_defaults` can keep both `simulatorId` and `simulatorName`.
2. Config normalization drops `simulatorName` when both are present.
3. Session-aware factory prunes exclusive pairs at merge-time and prefers first key when both come from defaults.
4. Some tools still enforce schema-level XOR, creating layered/duplicated enforcement.

Net effect: behavior is usually correct, but inconsistent and hard to reason about.

## Decision

Use a single normalized model everywhere:

1. Store both values in session defaults/config.
2. `simulatorId` is authoritative for tools that require UUID.
3. `simulatorName` is preserved for portability and tools that can use name.
4. Explicit user args that provide both remain invalid.
5. Each tool receives exactly one effective selector value at execution boundary.

## Why this model

1. `simulatorName` survives simulator resets better than UUIDs.
2. Some operations fundamentally require UUID; others can run with name.
3. Keeping both in storage avoids repeated lossy conversion and supports both execution modes.

## Required Invariants

1. Storage layer may contain both selector fields.
2. Explicit invocation args may not contain both selector fields.
3. Tool execution input must be disambiguated to one selector by a shared helper.
4. Disambiguation precedence must be deterministic and test-covered.

## Implementation Plan

1. Add `inferSimulatorSelectorForTool(...)` helper (or equivalent) used by simulator tools.
2. Normalize config/session behavior to stop dropping `simulatorName` when both exist.
3. Keep factory-level explicit XOR validation.
4. Keep per-tool requirement checks (`oneOf`/`allOf`) unchanged.
5. Reduce duplicated tool-local selector branching by centralizing selector choice.

## Validation Plan

1. Unit tests for helper precedence across explicit args, stored defaults, and missing values.
2. Regression tests for config-load behavior preserving both fields.
3. Integration tests for tools that require UUID vs tools that accept name.
4. Real-world MCP run validating both selector paths.

---

## Domain 2: CLI Determinism and Session Defaults

## Current State (verified)

1. `session-management` workflow is not exposed in CLI.
2. CLI runtime still bootstraps config and hydrates `config.sessionDefaults` into `sessionStore`.
3. Result: CLI can pick up hidden persisted defaults that the user cannot inspect/mutate via CLI commands.

Net effect: CLI behavior can vary based on hidden config state.

## Decision

Make session-default hydration MCP-only.

1. MCP runtime hydrates `config.sessionDefaults` into `sessionStore`.
2. CLI and daemon runtimes do not hydrate `sessionDefaults` into `sessionStore`.
3. CLI/daemon still read non-session config (workflow filters, debug flags, timeouts, etc.).
4. No CLI command/flag redesign is required.

## Required Invariants

1. CLI tool behavior must not depend on persisted `sessionDefaults`.
2. CLI behavior remains explicit-argument driven.
3. Existing runtime validation for required parameters remains intact.
4. `disableSessionDefaults=true` behavior for MCP tools remains consistent with current expectations.

## Implementation Plan

1. Gate session-default hydration by runtime in `bootstrapRuntime`.
2. Ensure daemon startup path also does not hydrate selector defaults.
3. Add tests that verify:
   - MCP hydrates session defaults.
   - CLI and daemon do not.
4. Keep all existing CLI validation paths and error messages unless a bug is found.

## Validation Plan

1. Unit/integration tests for runtime hydration boundaries.
2. CLI real-world test with persisted `sessionDefaults` present in config:
   - missing required args should still fail.
   - explicit args should succeed.
3. MCP real-world test confirming session-default convenience still works.

---

## Domain 3: Non-iOS Simulator Platform Inference

## Current State (verified)

1. iOS paths are generally reliable.
2. Non-iOS simulator targets can infer wrong platform and fail destination matching.
3. Build settings lookups are slower and should not be the first-line source for simulator platform inference.

## Decision

Platform inference for simulator tools must use simulator metadata first, then fallback.

1. Primary source: simulator runtime metadata (via `simctl` resolution).
2. Derived output: correct simulator platform string (`iOS/watchOS/tvOS/visionOS Simulator`).
3. Secondary source: build settings only when simulator metadata cannot resolve.
4. Final fallback: explicit warning + `iOS Simulator` only when no better signal exists.

Cache policy:

1. Persist `simulatorPlatform` as the cached output.
2. Recompute `simulatorPlatform` during MCP startup hydration.
3. Recompute `simulatorPlatform` whenever simulator selector (`simulatorId`/`simulatorName`) changes.
4. Do not persist `simulatorRuntime` or timestamp fields.

## Required Invariants

1. If runtime indicates non-iOS simulator, platform must not default to iOS.
2. Platform inference source should be logged for observability.
3. Selector normalization and platform inference should be reusable utilities, not tool-local variants.

## Implementation Plan

1. Introduce/standardize `inferPlatform(...)` utility contract around selector + runtime metadata.
2. Ensure simulator-name and simulator-id paths both resolve runtime/platform deterministically.
3. Add normalized mapping from CoreSimulator runtime to xcodebuild destination platform.
4. Use build-settings only as fallback path.

## Validation Plan

1. Unit tests for runtime-to-platform mapping.
2. Integration tests for iOS + non-iOS simulator selectors.
3. Real-world CLI/MCP checks for watchOS/tvOS/visionOS flows where available.

---

## Cross-Cutting Architecture

## Shared Helpers

1. `inferSimulatorSelectorForTool(...)`
   - Input: explicit params + stored defaults + tool capability (`requiresId` vs `acceptsNameOrId`).
   - Output: exactly one effective selector (or deterministic validation error).
2. `inferPlatform(...)`
   - Input: resolved selector + scheme/path context.
   - Output: `{ platform, source, runtime? }`.

## Data Model

Keep/add simulator metadata fields in session/config:

1. `simulatorId`
2. `simulatorName`
3. `simulatorPlatform` (optional cache)

`simulatorRuntime` can still be used transiently inside resolver/helper logic, but is not persisted.

## Runtime Boundary Rules

1. MCP: may hydrate/use session defaults.
2. CLI: no session-default hydration; explicit invocation only.
3. Daemon (CLI backend): same as CLI for hydration semantics.

---

## Delivery Plan

## Phase 0: Lock Decisions

1. Approve this document’s three-domain decisions.
2. Confirm no CLI UX changes are in scope.

## Phase 1: Runtime Boundary Fix (Domain 2)

1. Implement MCP-only session-default hydration.
2. Add runtime boundary tests.

## Phase 2: Selector Normalization (Domain 1)

1. Implement shared selector helper.
2. Align config/session behavior to preserve both selector fields.
3. Remove path-specific inconsistencies.

## Phase 3: Platform Inference Hardening (Domain 3)

1. Consolidate non-iOS platform inference on simulator metadata.
2. Add mapping tests and fallback tests.

## Phase 4: Regression + Real-World Validation

1. Run project test/lint/typecheck/build pipeline.
2. Run real-world MCP and CLI smoke tests for selector + platform behavior.
3. Document outcomes in PR notes.

---

## Risks and Mitigations

1. Risk: duplicate validation behavior drifts across tools.
   - Mitigation: central helper + contract tests.
2. Risk: config backward-compat surprises.
   - Mitigation: additive fields and migration-safe parsing.
3. Risk: non-iOS paths regress silently.
   - Mitigation: explicit non-iOS test coverage and runtime-source logging.

## Out of Scope

1. Redesigning CLI command structure or argument names.
2. Changing general daemon stateful behavior.
3. Introducing auto-retry heuristics on command failure.
