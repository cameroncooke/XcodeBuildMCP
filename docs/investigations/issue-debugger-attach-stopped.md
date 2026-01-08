# Investigation: Debugger attaches in stopped state after launch

## Summary
Reproduced: attaching the debugger leaves the simulator app in a stopped state. UI automation is blocked by the guard because the debugger reports `state=stopped`. The attach flow does not issue any resume/continue, so the process remains paused after attach.

## Symptoms
- After attaching debugger to Calculator, UI automation taps fail because the app is paused.
- UI guard blocks with `state=stopped` immediately after attach.

## Investigation Log

### 2025-02-14 - Repro (CalculatorApp on iPhone 17 simulator)
**Hypothesis:** Attach leaves the process stopped, which triggers the UI automation guard.
**Findings:** `debug_attach_sim` attached to a running CalculatorApp (DAP backend), then `tap` was blocked with `state=stopped`.
**Evidence:** `tap` returned "UI automation blocked: app is paused in debugger" with `state=stopped` and the current debug session ID.
**Conclusion:** Confirmed.

### 2025-02-14 - Code Review (attach flow)
**Hypothesis:** The attach implementation does not resume the process.
**Findings:** The attach flow never calls any resume/continue primitive.
- `debug_attach_sim` creates a session and returns without resuming.
- DAP backend attach flow (`initialize -> attach -> configurationDone`) has no `continue`.
- LLDB CLI backend uses `process attach --pid` and never `process continue`.
- UI automation guard blocks when state is `stopped`.
**Evidence:** `src/mcp/tools/debugging/debug_attach_sim.ts`, `src/utils/debugger/backends/dap-backend.ts`, `src/utils/debugger/backends/lldb-cli-backend.ts`, `src/utils/debugger/ui-automation-guard.ts`.
**Conclusion:** Confirmed. Stopped state originates from debugger attach semantics, and the tool never resumes.

## Root Cause
The debugger attach path halts the target process (standard debugger behavior) and there is no subsequent resume/continue step. This leaves the process in `stopped` state, which causes `guardUiAutomationAgainstStoppedDebugger` to block UI tools like `tap`.

## Recommendations
1. Add a first-class `debug_continue` tool backed by a backend-level `continue()` API to resume without relying on LLDB command evaluation.
2. Add an optional `continueOnAttach` (or `stopOnAttach`) parameter to `debug_attach_sim`, with a default suited for UI automation workflows.
3. Update guard messaging to recommend `debug_continue` (not `debug_lldb_command continue`, which is unreliable on DAP).

## Preventive Measures
- Document that UI tools require the target process to be running, and that debugger attach may pause execution by default.
- Add a state check or auto-resume option when attaching in automation contexts.
