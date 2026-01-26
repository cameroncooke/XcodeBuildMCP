# Tools Schema Session-Default Audit

This document tracks session-default migrations that remove per-tool arguments from schemas when they are typically set once per session.

## Session defaults to add or reinforce

- [x] derivedDataPath: Added to session defaults; removed from build/test/clean tool schemas.
- [x] preferXcodebuild: Added to session defaults; removed from build/test/clean tool schemas.
- [x] configuration (SwiftPM + Xcode): Session default described as applying to SwiftPM and Xcode tools.
- [x] platform: Added to session defaults; applies to device-only tools (get_device_app_path, test_device).
- [x] bundleId: Added to session defaults; applies to launch/stop/log tools for single-app workflows.

## Removal checklist by tool

### Build and test (Xcode)

Remove derivedDataPath, preferXcodebuild from:

- [x] build_device
- [x] build_sim
- [x] build_run_sim
- [x] build_macos
- [x] build_run_macos
- [x] test_device
- [x] test_sim
- [x] test_macos
- [x] clean

Remove platform from:

- [x] get_device_app_path
- [x] test_device

### Swift Package Manager

Remove configuration from:

- [x] swift_package_build
- [x] swift_package_run
- [x] swift_package_test

### Launch/stop/log (bundleId default)

Remove bundleId from:

- [x] launch_app_device
- [x] launch_app_sim
- [x] launch_app_logs_sim
- [x] stop_app_sim
- [x] start_device_log_cap
- [x] start_sim_log_cap

## Non-candidates (keep in schemas)

- extraArgs: Single-use per invocation; keep per tool.
- appPath: Depends on build output or target app; varies between calls.
- args (launch_app_*): Varies per launch.
- UI interaction coordinates and durations (tap/swipe/gesture): Always call-specific.

## Description updates

- [x] session-set-defaults configuration description clarifies SwiftPM + Xcode usage.
- [x] session-set-defaults platform description clarifies device-only usage.
