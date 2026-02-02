# Investigation: spawn sh ENOENT in build_sim/build_run_sim

## Summary
Root cause is the command executor’s shell mode: it rewrites every command to `['sh','-c', ...]` and spawns `sh` by name, so any runtime with missing/empty PATH fails before xcodebuild runs. build_sim and build_run_sim both force or default to shell mode, so they fail immediately with `spawn sh ENOENT`.

## Symptoms
- `build_run_sim` and `build_sim` fail immediately with `spawn sh ENOENT`.
- `doctor` reports PATH looks normal, but this likely reflects the CLI environment, not necessarily the daemon/runtime used for tool execution.
- Issue manifests on this branch; main reportedly unaffected.

## Investigation Log

### 2026-02-02 12:26:59 GMT - Phase 1/2 - Executor and build paths
**Hypothesis:** The failure is triggered by shell spawning inside the command executor.
**Findings:**
- `defaultExecutor` defaults `useShell = true` and rewrites commands to `['sh','-c', commandString]`, then `spawn`s the executable (`sh`).
- `executeXcodeBuildCommand` always passes `useShell = true` for xcodebuild, even though the command is already argv-style.
- `build_run_sim` executes `xcodebuild -showBuildSettings` with `useShell = true`, and most other commands omit `useShell`, inheriting the default `true`.
**Evidence:**
- `src/utils/command.ts:27-84` (default `useShell = true`, rewrites to `['sh','-c', ...]`, spawns executable)
- `src/utils/build-utils.ts:214-238` (xcodebuild executed with `useShell = true`)
- `src/mcp/tools/simulator/build_run_sim.ts:124-192` and `src/mcp/tools/simulator/build_run_sim.ts:244-303` (explicit `useShell = true` and default executor usage)
**Conclusion:** Confirmed. The error can be produced if PATH is missing/empty where executor runs.

### 2026-02-02 12:26:59 GMT - Phase 3 - Env/daemon plumbing
**Hypothesis:** CLI/daemon code drops PATH or replaces env.
**Findings:**
- Daemon startup merges `process.env` with overrides; no PATH removal observed.
- Tool invoker only adds a few overrides (workflows/log level) and does not touch PATH.
**Evidence:**
- `src/cli/daemon-control.ts:23-114` (env merge preserves `process.env`)
- `src/runtime/tool-invoker.ts:64-142` (only XCODEBUILDMCP_* overrides)
**Conclusion:** Eliminated as direct cause. If PATH is missing, it originates in the host process environment.

### 2026-02-02 12:26:59 GMT - Phase 4 - Other shell-dependent paths
**Hypothesis:** Incremental build path also requires shell.
**Findings:**
- xcodemake uses `getDefaultCommandExecutor()` without explicit `useShell` and runs `['which','xcodemake']`.
- `executeMakeCommand` uses `['cd', projectDir, '&&', 'make']`, which requires shell execution.
**Evidence:**
- `src/utils/xcodemake.ts:111-134` (which xcodemake uses default executor)
- `src/utils/xcodemake.ts:218-225` (`cd && make`)
**Conclusion:** Confirmed. This is a secondary path that would also fail under the same conditions.

## Root Cause
The command execution layer always defaults to shell mode and shells are invoked by name (`sh`) via PATH lookup. This makes tool execution dependent on PATH-based resolution of `sh`. In the provided log, `spawn('sh', ...)` fails with `ENOENT` even though `process.env.PATH` includes `/bin`, so the failure is on resolving `sh` via PATH at spawn time. This implicates the `useShell = true` + `spawn('sh', ...)` design directly; the failure disappears if shell usage is removed or `/bin/sh` is used explicitly.

## Recommendations
1. Use an absolute shell path when shelling out: replace `['sh','-c', ...]` with `['/bin/sh','-c', ...]` in `src/utils/command.ts`. This directly prevents `spawn sh ENOENT` and is the minimal hotfix.
2. Default to direct spawn (`useShell = false`) and only opt-in to shell when needed. Update call sites in:
   - `src/utils/build-utils.ts` (xcodebuild execution)
   - `src/mcp/tools/simulator/build_run_sim.ts` (xcodebuild, xcrun, plutil, defaults, open)
3. Remove shell operators and use `cwd` instead:
   - `src/utils/xcodemake.ts` change `['cd', dir, '&&', 'make']` to `['make']` and pass `{ cwd: dir }`.
4. Optional defensive fallback: if `process.env.PATH` is empty, set it to `/usr/bin:/bin:/usr/sbin:/sbin` at runtime bootstrap.

## Preventive Measures
- Add a targeted unit/integration test that executes a simple tool with `PATH` cleared and verifies the executor still runs (or fails with a clearer error).
- Avoid defaulting to shell execution for argv-form commands; add lint/test to enforce `useShell` usage only where shell operators are needed.
