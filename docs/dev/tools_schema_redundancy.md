# Tools Schema Session-Default Audit

This document identifies arguments in `tools.compact.json` that should be removed from individual tool schemas because they are typically set once per session. It also provides a concrete checklist of tool-level removals and default additions.

## Session defaults to add or reinforce

- derivedDataPath: Add to session defaults; remove from build/test/clean tool schemas.
- preferXcodebuild: Add to session defaults; remove from build/test/clean tool schemas.
- configuration (SwiftPM): Add to SwiftPM session defaults; applies to Swift Package build/run/test tools only.
- platform: Add to device session defaults; applies to device-only tools (get_device_app_path, test_device).

## Optional session defaults (sticky per workflow)

- bundleId: Consider as a session default for launch/stop/log tools when working on a single app.

## Removal checklist by tool

### Build and test (Xcode)

Remove derivedDataPath, preferXcodebuild from:

- build_device
- build_sim
- build_run_sim
- build_macos
- build_run_macos
- test_device
- test_sim
- test_macos
- clean

Remove platform from:

- get_device_app_path
- test_device

### Swift Package Manager

Remove configuration (if promoted to session default) from:

- swift_package_build
- swift_package_run
- swift_package_test

### Launch/stop/log (bundleId default)

Remove bundleId (if promoted to session default) from:

- launch_app_device
- launch_app_sim
- launch_app_logs_sim
- stop_app_sim
- start_device_log_cap
- start_sim_log_cap

## Non-candidates (keep in schemas)

- extraArgs: Single-use per invocation; keep per tool.
- appPath: Depends on build output or target app; varies between calls.
- args (launch_app_*): Varies per launch.
- UI interaction coordinates and durations (tap/swipe/gesture): Always call-specific.

## Description updates

When removing arguments from individual schemas, ensure tool descriptions mention:

- The session default that will be used.
- How to override per call (if overrides remain supported).
