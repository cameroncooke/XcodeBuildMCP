# Investigation: Daemon Log File Missing Entries

## Summary
Daemon log files only contained the init line because daemon start used the global CLI `--log-level` default (`none`), which was unintentionally passed through to the daemon. That set `clientLogLevel` to `none`, suppressing file writes in `log()`.

## Symptoms
- Daemon log file existed but only contained “Log file initialized”.
- Foreground daemon printed logs to console, but file didn’t show them.

## Investigation Log

### 2026-02-02 - CLI Argument Collision
**Hypothesis:** Daemon log level was being set to `none` inadvertently.
**Findings:** `src/cli/yargs-app.ts` defines global `--log-level` default `none`. `src/cli/commands/daemon.ts` read the same flag and forwarded it to `XCODEBUILDMCP_DAEMON_LOG_LEVEL`, so daemon started with log level `none` unless explicitly overridden.
**Evidence:** `src/cli/yargs-app.ts`, `src/cli/commands/daemon.ts`
**Conclusion:** Confirmed. This explains “init line only” behavior.

### 2026-02-02 - Logger File Guard
**Hypothesis:** File logging is suppressed when `clientLogLevel === 'none'`.
**Findings:** `log()` writes to file only when `logFileStream` exists and `clientLogLevel !== 'none'`, while `setLogFile()` writes the init line unconditionally.
**Evidence:** `src/utils/logger.ts`
**Conclusion:** Confirmed. This is why the file has only the init line.

## Root Cause
Daemon CLI reused the global `--log-level` option (default `none`) for daemon log level, which set `XCODEBUILDMCP_DAEMON_LOG_LEVEL=none` during daemon start. The logger then skipped all file writes after initialization.

## Recommendations
1. Use distinct daemon flags (`--daemon-log-level`, `--daemon-log-path`) to avoid collision.
2. Log daemon startup errors via `log()` so they appear in the daemon log file.
3. Keep daemon startup logs after log file setup to ensure they are captured.

## Preventive Measures
- Avoid reusing global CLI flags for subsystem-specific settings.
- Treat `none` as “stderr only” for CLI but keep file logging explicitly controlled to avoid accidental suppression.