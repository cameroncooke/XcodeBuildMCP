# Xcode IDE Dynamic Tools in CLI: Plan and Architecture

## Problem statement

Today, `xcode-ide` dynamic tools can work in MCP mode, but CLI mode has sharp edges:

- Each CLI invocation is a new process, so bridge connections are short-lived and repeated.
- Repeated bridge connects trigger repeated Xcode allow prompts.
- `--help` and exploratory commands can create extra connection churn.
- Static bridge tools and dynamic bridge-derived tools have different gating rules, but this is easy to misinterpret.

The immediate user-visible outcome is: CLI appears inconsistent even when Xcode and bridge are available.

## Goals

- Keep MCP mode unchanged: no daemon requirement for MCP server flow.
- Make CLI dynamic xcode-ide tools reliable and predictable.
- Minimize repeated Xcode allow prompts in CLI workflows.
- Separate concerns so transport/client logic is reused across runtimes.
- Keep manifest-driven visibility semantics explicit and testable.

## Non-goals

- Replacing `xcrun mcpbridge`.
- Rewriting tool manifests or predicate system.
- Forcing daemon usage for all CLI tools.
- Reintroducing generic daemon affinity knobs for CLI routing.

## Current behavior to preserve

- Workflow/tool visibility remains manifest-driven.
- `availability.mcp: true, availability.cli: false` means MCP-only exposure.
- `availability.mcp: true, availability.cli: true` means exposed in both MCP and CLI.
- `xcode-ide` has:
  - Static bridge tools (debug-gated).
  - Dynamic tools resolved from `mcpbridge` `tools/list` (not debug-gated).

## Why CLI currently behaves differently

CLI is a process-per-command model. If each command independently connects to `mcpbridge`, then:

- the bridge handshake repeats,
- Xcode trust prompts can repeat,
- command latency increases,
- and help/discovery flows can feel flaky.

MCP mode avoids this by being long-running.

## Clean architecture (least repetition)

Use two layers plus runtime adapters:

### Layer 1: Bridge client core (shared, runtime-agnostic)

Responsibilities:

- Discover bridge availability (`xcrun --find mcpbridge`).
- Open/close MCP client transport to `mcpbridge`.
- Call `tools/list`, `tools/call`.
- Surface normalized errors and bridge state events.

Output:

- `BridgeCapabilities` (available, connected, tool count).
- `BridgeToolCatalog` (dynamic tool metadata).
- `BridgeInvoker` (`invoke(name, args)`).

This layer contains no CLI command wiring and no MCP server registration logic.

### Layer 2: Xcode IDE tool service (shared domain layer)

Responsibilities:

- Build runtime-facing tool catalog from:
  - static manifest-defined bridge tools,
  - dynamic bridge-derived tools.
- Apply visibility and predicate checks.
- Expose `listTools(runtimeContext)` and `invokeTool(toolName, args)`.

This is the single source of truth for xcode-ide tool behavior.

### Adapters

- MCP adapter:
  - Binds service into long-running server lifecycle.
  - Connect once at startup (if enabled), resync on bridge events.
  - No daemon required.

- CLI adapter:
  - Uses same service API.
  - Default path should be daemon-backed for xcode-ide dynamic tools.

## CLI daemon strategy for xcode-ide only

To remove repeated prompts, CLI should reuse one bridge session across commands.

Recommended approach:

- Introduce an xcode-ide bridge session in existing daemon runtime.
- Keep this as an explicit xcode-ide special-case bridge path (not generic affinity routing).
- CLI xcode-ide commands route to daemon when dynamic bridge tools are involved.
- Keep non-xcode-ide CLI commands unchanged.

Lifecycle:

1. CLI command asks daemon for xcode-ide tool catalog.
2. Daemon ensures single bridge session exists.
3. Daemon returns catalog or executes tool call over the same session.
4. Session remains warm for subsequent CLI commands.
5. Daemon exits automatically after idle timeout when no active stateful sessions remain.

This preserves MCP independence while making CLI behavior consistent.

## Visibility and registration rules

Apply these rules explicitly:

- Workflow appears in MCP/CLI when `workflow.availability[runtime]` is true.
- Daemon execution backend is not controlled by `availability` flags.
- Static tools appear only when:
  - tool availability passes for MCP/CLI runtime,
  - predicates pass,
  - debug gate passes (for debug-only static tools).
- Dynamic tools appear only when:
  - workflow is enabled for runtime,
  - bridge is available and connected,
  - `tools/list` returns entries.
- Dynamic tools are never controlled by static debug gates.

## CLI UX behavior

Expected behavior for `node build/cli.js xcode-ide ...`:

- If workflow disabled for CLI:
  - show actionable message explaining manifest controls this.
- If workflow enabled but Xcode bridge unavailable:
  - show actionable setup guidance:
    - open Xcode,
    - enable `Settings > Intelligence > Xcode Tools`,
    - accept allow prompt.
- If daemon session unavailable:
  - auto-start daemon or print exact daemon start command (project decision).
- If bridge connected:
  - dynamic tools are listed and invokable.

## Implementation plan

### Phase 1: Extract shared bridge client core

- Isolate bridge transport/discovery/invocation into a runtime-agnostic module.
- Add typed status model and normalized error mapping.

### Phase 2: Build shared xcode-ide tool service

- Centralize static + dynamic catalog assembly.
- Centralize runtime visibility checks.
- Centralize invocation dispatch.

### Phase 3: Rewire MCP adapter

- Use shared service for registration and calls.
- Keep current long-running behavior.
- Ensure no daemon dependency in MCP code path.

### Phase 4: Add CLI daemon-backed bridge path

- Route xcode-ide dynamic tool list/call through daemon session.

### Phase 5: Harden messages and observability

- Standardize actionable operator messages for disabled/unavailable/not-authorized states.
- Log bridge session reuse metrics and reconnect causes.

### Phase 6: Validate with manual tests

Run manual tests across these scenarios:

- MCP mode, workflow enabled, Xcode available.
- MCP mode, workflow enabled, Xcode unavailable.
- CLI mode, workflow disabled.
- CLI mode, workflow enabled, first-time allow prompt.
- CLI mode, workflow enabled, repeated commands without extra prompts.
- CLI mode, `--help` usage does not force repeated authorization churn.

## Risks

- Daemon session ownership bugs can create reconnect loops and prompt spam.
- Stale bridge session state can hide tools unexpectedly.
- Mixed one-shot/daemon modes can drift without a single service contract.

Mitigations:

- Single authoritative service interface for list/call.
- Explicit reconnect backoff and no tight retry loops.
- Structured logs with correlation IDs for CLI command -> daemon request -> bridge call.

## Acceptance criteria

- MCP mode unchanged and independent from daemon.
- CLI xcode-ide dynamic tools work when workflow `cli: true`.
- Repeated CLI xcode-ide commands do not trigger repeated allow prompts under normal operation.
- Static debug-gated tools remain debug-gated only.
- Dynamic tools appear based on bridge health, not debug gating.

## Decision summary

The cleanest architecture is to separate:

- bridge transport/client core,
- xcode-ide tool service,
- runtime adapters (MCP and CLI).

Then route CLI xcode-ide dynamic tools through a persistent daemon-held bridge session while keeping MCP flow long-running and daemon-free.
