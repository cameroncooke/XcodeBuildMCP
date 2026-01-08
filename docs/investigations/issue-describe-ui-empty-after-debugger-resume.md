# RCA: describe_ui returns empty tree after debugger resume

## Summary
When the app is stopped under LLDB (breakpoints hit), the `describe_ui` tool frequently returns an empty accessibility tree (0x0 frame, no children). This is not because of a short timing gap after resume. The root cause is that the process is still stopped (or immediately re-stopped) due to active breakpoints, so AX snapshotting cannot retrieve a live hierarchy.

## Impact
- UI automation appears "broken" after resuming from breakpoints.
- Simulator UI may visually update only after detaching or clearing breakpoints because the process is repeatedly stopped.
- `describe_ui` can return misleading empty trees even though the app is running in the simulator.

## Environment
- App: Calculator (example project)
- Simulator: iPhone 16 (2FCB5689-88F1-4CDF-9E7F-8E310CD41D72)
- Debug backend: LLDB CLI

## Repro Steps
1. Attach debugger to the simulator app (`debug_attach_sim`).
2. Set breakpoint at `CalculatorButton.swift:18` and `CalculatorInputHandler.swift:12`.
3. `debug_lldb_command` -> `continue`.
4. Tap a button (e.g., "7") so breakpoints fire.
5. `debug_lldb_command` -> `continue`.
6. Call `describe_ui` immediately after resume.

## Observations
- `debug_stack` immediately after resume shows stop reason `breakpoint 1.2` or `breakpoint 2.1`.
- Multiple `continue` calls quickly re-stop the process due to breakpoints in SwiftUI button handling and input processing.
- While stopped, `describe_ui` often returns:
  - Application frame: `{{0,0},{0,0}}`
  - `AXLabel` null
  - No children
- Waiting does not help. We tested 1s, 2s, 3s, 5s, 8s, and 10s delays; the tree remained empty in a stopped state.
- Once breakpoints are removed and the process is running, `describe_ui` returns the full tree immediately.
- Detaching the debugger also restores `describe_ui` output.

## Root Cause
The process is stopped due to breakpoints, or repeatedly re-stopped after resume. AX snapshots cannot read a paused process, so `describe_ui` returns an empty hierarchy.

## Confirming Evidence
- `debug_stack` after `continue` shows:
  - `stop reason = breakpoint 1.2` at `CalculatorButton.swift:18`
  - `stop reason = breakpoint 2.1` at `CalculatorInputHandler.swift:12`
- After removing breakpoints and `continue`, `describe_ui` returns a full hierarchy (buttons + display values).

## Current Workarounds
- Clear or remove breakpoints before calling `describe_ui`.
- Detach the debugger to allow the app to run normally.

## Recommendations
- Document that `describe_ui` requires the target process to be running (not stopped under LLDB).
- Provide guidance to:
  - Remove or disable breakpoints before UI automation.
  - Avoid calling `describe_ui` immediately after breakpoints unless resumed and confirmed running.
- Optional future enhancement: add a tool-level warning when the debugger session is stopped, or add a helper command that validates "running" state before UI inspection.
