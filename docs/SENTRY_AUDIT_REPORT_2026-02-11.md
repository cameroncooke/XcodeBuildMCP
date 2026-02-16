# Investigation: Sentry Telemetry Scope and Privacy Audit (#204)

## Summary
The current implementation captured too much data by default (including broad MCP instrumentation and PII-heavy tagging). The fix narrows telemetry to internal runtime failures only, keeps tracing enabled for observability, disables MCP input/output capture, and adds payload scrubbing/redaction.

## Symptoms
- Sentry was initialized with `sendDefaultPii: true` and `tracesSampleRate: 1.0`.
- MCP server was wrapped with `wrapMcpServerWithSentry`, enabling broad per-call instrumentation.
- Logger default sent all `error` logs to Sentry, including user-domain failures.
- Sentry tags included sensitive environment/system values (HOME, USER, PATH, Xcode paths).
- Privacy docs understated actual collection scope.

## Investigation Log

### Phase 1 - Issue and baseline audit
**Hypothesis:** Telemetry defaults and wrapper behavior were broader than documented.
**Findings:** Issue #204 correctly identified mismatch between docs and implementation.
**Evidence:**
- GitHub issue: https://github.com/getsentry/XcodeBuildMCP/issues/204
- `/Users/cameroncooke/.codex/worktrees/a59a/XcodeBuildMCP/src/utils/sentry.ts`
- `/Users/cameroncooke/.codex/worktrees/a59a/XcodeBuildMCP/src/server/server.ts`
- `/Users/cameroncooke/.codex/worktrees/a59a/XcodeBuildMCP/src/utils/logger.ts`
**Conclusion:** Confirmed.

### Phase 2 - Runtime path tracing
**Hypothesis:** User-domain tool failures were reaching Sentry through logger defaults.
**Findings:** `log('error', ...)` implicitly captured to Sentry unless overridden; many tool/runtime paths emit user-domain errors at error level.
**Evidence:**
- `/Users/cameroncooke/.codex/worktrees/a59a/XcodeBuildMCP/src/utils/logger.ts`
- `/Users/cameroncooke/.codex/worktrees/a59a/XcodeBuildMCP/src/utils/build-utils.ts`
- `/Users/cameroncooke/.codex/worktrees/a59a/XcodeBuildMCP/src/runtime/tool-invoker.ts`
**Conclusion:** Confirmed.

### Phase 3 - Version and docs alignment
**Hypothesis:** Sentry SDK was not at latest patch and docs were not aligned with behavior.
**Findings:** `@sentry/node` moved from `^10.37.0` to latest `10.38.0` and docs were updated to match internal-only policy.
**Evidence:**
- Command: `npm view @sentry/node version` returned `10.38.0`
- `/Users/cameroncooke/.codex/worktrees/a59a/XcodeBuildMCP/package.json`
- `/Users/cameroncooke/.codex/worktrees/a59a/XcodeBuildMCP/docs/PRIVACY.md`
- `/Users/cameroncooke/.codex/worktrees/a59a/XcodeBuildMCP/docs/CONFIGURATION.md`
- `/Users/cameroncooke/.codex/worktrees/a59a/XcodeBuildMCP/README.md`
**Conclusion:** Confirmed.

## Root Cause
Three defaults combined to over-collect telemetry:
1. `sendDefaultPii: true` and tracing at 100% in Sentry init.
2. `wrapMcpServerWithSentry` around the MCP server.
3. Logger behavior that captured every `error` log to Sentry by default.

This effectively blurred boundaries between internal platform failures and user-domain build/config/runtime failures, and increased risk of sensitive metadata leakage.

## Changes Implemented
1. Sentry initialization hardened (`sendDefaultPii: false`, `tracesSampleRate: 1.0`, breadcrumbs disabled, `beforeSend` scrubbing/redaction).
2. Sensitive tags/context removed (no env dumps, no HOME/USER/PATH/Xcode path tagging).
3. Restored MCP wrapper with explicit safe options (`recordInputs: false`, `recordOutputs: false`) to keep tool-level observability without payload capture.
4. Logger changed to explicit opt-in capture only (`context.sentry === true`).
5. Internal boundary capture retained only where appropriate (startup/shutdown/fatal daemon internal errors).
6. Added tests for explicit capture policy and path redaction.
7. Updated privacy/config/README/architecture docs and changelog.

## Eliminated Hypotheses
- "Only MCP-level faults are captured today": Eliminated (not true before this patch due to logger defaults and wrapper).
- "Docs accurately reflected telemetry scope": Eliminated.

## Recommendations
1. Keep Sentry capture explicit and centralized to internal runtime boundaries.
2. Avoid adding environment or filesystem metadata to telemetry tags.
3. Preserve redaction tests to prevent regressions.
4. Continue documenting telemetry scope in user-facing docs whenever behavior changes.

## Preventive Measures
- CI should keep redaction and logger policy tests running by default.
- Any future telemetry additions should require explicit privacy review with docs update in same PR.

## Validation
All relevant quality checks were executed after changes:

- `npm run format:check` ✅
- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run build` ✅
- `npm test` ✅ (117 test files passed; 1274 tests passed, 15 skipped)

Notes:
- Test output includes expected stderr from negative-path parser tests in `src/utils/__tests__/nskeyedarchiver-parser.test.ts`; test run still passed.

## Addendum: MCP Wrapper Capture Semantics (verified against SDK 10.38.0)
- `wrapMcpServerWithSentry` resolves options as:
  - `recordInputs: options?.recordInputs ?? sendDefaultPii`
  - `recordOutputs: options?.recordOutputs ?? sendDefaultPii`
- For MCP request spans, `tools/call` and `prompts/get` arguments are added as `mcp.request.argument.*` attributes when `recordInputs=true`.
- Tool/prompt results are added as `mcp.tool.result*` / `mcp.prompt.result*` attributes when `recordOutputs=true`.
- Built-in MCP PII filtering in the SDK only strips network-level fields (`client.address`, `client.port`, `mcp.resource.uri`) when `sendDefaultPii=false`; it does not by itself scrub arbitrary tool argument/output payloads.

Evidence (source-inspected package build):
- `@sentry/core@10.38.0` `build/cjs/integrations/mcp-server/index.js`
- `@sentry/core@10.38.0` `build/cjs/integrations/mcp-server/methodConfig.js`
- `@sentry/core@10.38.0` `build/cjs/integrations/mcp-server/resultExtraction.js`
- `@sentry/core@10.38.0` `build/cjs/integrations/mcp-server/piiFiltering.js`

## Addendum: Live Validation (2026-02-12)

### Findings
- Runtime config/dependency tags are being attached to issues when events are captured after bootstrap context is set.
- Example: issue `XCODEBUILDMCP-6` includes `runtime.mode`, `xcode.version`, `xcode.xcodebuild_path`, `axe.source`, and config tags.
- Startup-phase config parse warnings can occur before full runtime context is attached, so those earlier events may not show the full tag set.
- MCP wrapper instrumentation is active in-process:
  - Local debug output shows sampled MCP spans for `initialize`, `notifications/initialized`, and `tools/call session_show_defaults`.
  - Local exporter reports spans exported.
- Despite local span export, Sentry project query for spans currently returns `count() = 0` in the tested time window.

### Evidence
- Local MCP call validation:
  - `session_show_defaults` invoked over stdio client; server started successfully.
- Local in-memory instrumentation validation:
  - Debug logs show:
    - `Starting sampled root span op: mcp.server`
    - `Finishing ... tools/call session_show_defaults`
    - `SpanExporter exported 3 spans`
- Sentry MCP queries:
  - Spans in last hour: `count() = 0`
  - Transactions in last hour: `count() = 0`
  - Trace for issue `XCODEBUILDMCP-6`: `Total Spans: 0, Errors: 1`

## Addendum: MCP View + Logs Explorer Deep Dive (2026-02-12)

### Scope
Investigated two active symptoms:
- MCP tools are not visible in Sentry MCP view.
- Logs are not visible in Sentry Logs Explorer.

### Key Findings
- Error events are ingesting correctly in the target project.
  - Sentry query: errors in last 24h = `11`.
- Logs and spans datasets remain empty in the same project/time windows.
  - Sentry query: logs in last 24h/7d = `0`.
  - Sentry query: spans in last 24h/14d = `0`.
  - Sentry query: transactions in last 14d/15m = `0`.
- SDK-side emission is working for both logs and transactions.
  - Direct probe emitted:
    - `Sentry.logger.info('envelope logger probe ...')`
    - `Sentry.startSpan({ forceTransaction: true, ... })`
  - Runtime instrumentation confirmed envelope item types sent:
    - `ENVELOPE_ITEM_TYPES log`
    - `ENVELOPE_ITEM_TYPES transaction`
    - plus expected `event`/`session` items.
- Despite emitted envelopes, Sentry queries still return zero logs/spans/transactions.
  - Strongly indicates an ingestion/storage/configuration issue outside current app code path.

### Code-Path Validation
- MCP wrapper is enabled with safe options:
  - `src/server/server.ts:72` uses `wrapMcpServerWithSentry(..., { recordInputs: false, recordOutputs: false })`.
- Sentry logs pipeline is enabled:
  - `src/utils/sentry.ts:282` sets `enableLogs: true`.
  - `src/utils/sentry.ts:286` sets `beforeSendLog: redactLog`.
- Logger forwards only explicit opt-in internal logs:
  - `src/utils/logger.ts:56` (`context?.sentry === true`).
  - `src/utils/logger.ts:236` fallback uses `captureMessage` only if logger method is unavailable.
- Runtime split is real:
  - Daemon handles `tool.invoke` requests (`src/daemon/daemon-server.ts:117`), including `runtime: 'daemon'` (`src/daemon/daemon-server.ts:128`).
  - CLI paths route many invocations through daemon (`src/runtime/tool-invoker.ts:192`).
  - MCP wrapper only covers stdio MCP server runtime (`src/server/server.ts:72`).

### Root Cause Assessment (Current Confidence)
- Most likely primary blocker: Sentry-side configuration/entitlement/pipeline for traces and logs in this project/org (not client emission).
- Secondary (not primary) code risk:
  - `process.exit(...)` without explicit `Sentry.flush/close` in shutdown paths can still drop buffered telemetry in some paths:
    - `src/server/start-mcp-server.ts:68`
    - `src/server/start-mcp-server.ts:83`
    - `src/daemon.ts:303`
    - `src/daemon.ts:310`
    - `src/daemon.ts:402`

### Eliminated Hypotheses
- "MCP wrapper is removed or disabled." Eliminated.
- "Logs are not being captured by SDK at all." Eliminated (capture hooks + envelope inspection confirm capture/send).
- "Transactions are not being created by SDK at all." Eliminated (manual forced transaction emitted and sent).

### Recommended Next Steps
1. Verify project-level traces/logs ingestion settings in Sentry (`sentry/xcodebuildmcp`) and any org-level sampling/filtering rules dropping transactions/logs.
2. Verify account/product entitlement for Logs and Performance on this project.
3. Add explicit shutdown drain in app code (`Sentry.flush`/`Sentry.close`) before `process.exit(...)` to reduce telemetry loss on fast shutdown.
4. Keep MCP-view expectation scoped to MCP stdio runtime; add daemon-specific spans if daemon tool-call observability is required in traces.
