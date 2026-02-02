# Investigation: launch-app-logs-sim keeps CLI running

## Summary
The CLI remains alive because `launch_app_logs_sim` starts long-running log capture processes and keeps open streams in the same Node process, and the tool is not marked `cli.stateful` so it does not route through the daemon.

## Symptoms
- `node build/index.js simulator launch-app-logs-sim --simulator-id B38FE93D-578B-454B-BE9A-C6FA0CE5F096 --bundle-id com.example.calculatorapp` keeps the CLI process running while the app is running.

## Investigation Log

### 2026-02-01 21:54 UTC - Initial context build
**Hypothesis:** The tool runs long-lived log streaming in the CLI process, preventing exit.
**Findings:** `launch_app_logs_sim` delegates to `startLogCapture`, which spawns long-running log processes and keeps a writable stream open. The tool is not marked `cli.stateful`, so it runs in-process.
**Evidence:** `src/mcp/tools/simulator/launch_app_logs_sim.ts`, `src/utils/log_capture.ts`, `src/utils/command.ts`, `src/runtime/tool-invoker.ts`, `src/runtime/tool-catalog.ts`.
**Conclusion:** Confirmed.

### 2026-02-01 21:54 UTC - Git history review
**Hypothesis:** Recent changes introduced or reinforced CLI in-process routing for this tool.
**Findings:** Recent commit history shows the CLI was introduced on 2026-01-31 (“Make CLI”) and tool refactors/command executor changes occurred in late January. No commit message indicates lifecycle changes for log capture sessions.
**Evidence:** `git log -n 5 -- src/utils/log_capture.ts src/mcp/tools/simulator/launch_app_logs_sim.ts src/runtime/tool-invoker.ts`.
**Conclusion:** Inconclusive for intent; indicates the CLI implementation is recent and likely inherited default in-process routing.

### 2026-02-01 21:54 UTC - Docs/tests intent check
**Hypothesis:** The tool is expected to return immediately, not block.
**Findings:** `launch_app_logs_sim` returns text instructing the user to interact, then stop capture later, and includes `nextSteps` for `stop_sim_log_cap`. The docs list the tool but do not state lifecycle behavior.
**Evidence:** `src/mcp/tools/simulator/launch_app_logs_sim.ts`, `src/mcp/tools/simulator/__tests__/launch_app_logs_sim.test.ts`, `docs/TOOLS.md`.
**Conclusion:** Weak but supportive signal for a non-blocking start/stop flow; docs are ambiguous.

## Root Cause
`launch_app_logs_sim` starts log capture sessions that keep active event-loop handles (child process pipes and a log file stream). Because the tool lacks `cli.stateful: true`, the CLI invokes it in-process rather than routing through the daemon. The “detached” flag in `CommandExecutor` does not detach/unref the child, so the CLI cannot exit while capture is active.

## Recommendations
1. Mark `launch_app_logs_sim`, `start_sim_log_cap`, and `stop_sim_log_cap` as `cli.stateful: true` so they run through the daemon and return promptly.
2. Clarify the `detached` flag semantics in `CommandExecutor` (rename or document) to avoid assuming it detaches the child process.
3. Document the lifecycle expectation for log-capture tools (start returns immediately; stop ends capture).

## Preventive Measures
- Add explicit doc wording for stateful tools indicating daemon ownership and non-blocking behavior.
- Add tests or assertions that stateful tools are routed via daemon when invoked from CLI.
