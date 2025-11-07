# Session-Aware Migration TODO

_Audit date: October 6, 2025_

Reference: `docs/session_management_plan.md`

## Utilities
- [x] `src/mcp/tools/utilities/clean.ts` — session defaults: `projectPath`, `workspacePath`, `scheme`, `configuration`.

## Project Discovery
- [x] `src/mcp/tools/project-discovery/list_schemes.ts` — session defaults: `projectPath`, `workspacePath`.
- [x] `src/mcp/tools/project-discovery/show_build_settings.ts` — session defaults: `projectPath`, `workspacePath`, `scheme`.

## Device Workflows
- [x] `src/mcp/tools/device/build_device.ts` — session defaults: `projectPath`, `workspacePath`, `scheme`, `configuration`.
- [x] `src/mcp/tools/device/test_device.ts` — session defaults: `projectPath`, `workspacePath`, `scheme`, `deviceId`, `configuration`.
- [x] `src/mcp/tools/device/get_device_app_path.ts` — session defaults: `projectPath`, `workspacePath`, `scheme`, `configuration`.
- [x] `src/mcp/tools/device/install_app_device.ts` — session defaults: `deviceId`.
- [x] `src/mcp/tools/device/launch_app_device.ts` — session defaults: `deviceId`.
- [x] `src/mcp/tools/device/stop_app_device.ts` — session defaults: `deviceId`.

## Device Logging
- [x] `src/mcp/tools/logging/start_device_log_cap.ts` — session defaults: `deviceId`.

## macOS Workflows
- [x] `src/mcp/tools/macos/build_macos.ts` — session defaults: `projectPath`, `workspacePath`, `scheme`, `configuration`, `arch`.
- [x] `src/mcp/tools/macos/build_run_macos.ts` — session defaults: `projectPath`, `workspacePath`, `scheme`, `configuration`, `arch`.
- [x] `src/mcp/tools/macos/test_macos.ts` — session defaults: `projectPath`, `workspacePath`, `scheme`, `configuration`.
- [x] `src/mcp/tools/macos/get_mac_app_path.ts` — session defaults: `projectPath`, `workspacePath`, `scheme`, `configuration`, `arch`.

## Simulator Build/Test/Path
- [x] `src/mcp/tools/simulator/test_sim.ts` — session defaults: `projectPath`, `workspacePath`, `scheme`, `simulatorId`, `simulatorName`, `configuration`, `useLatestOS`.
- [x] `src/mcp/tools/simulator/get_sim_app_path.ts` — session defaults: `projectPath`, `workspacePath`, `scheme`, `simulatorId`, `simulatorName`, `configuration`, `useLatestOS`, `arch`.

## Simulator Runtime Actions
- [x] `src/mcp/tools/simulator/boot_sim.ts` — session defaults: `simulatorId` (hydrate `simulatorUuid`).
- [x] `src/mcp/tools/simulator/install_app_sim.ts` — session defaults: `simulatorId` (hydrate `simulatorUuid`).
- [x] `src/mcp/tools/simulator/launch_app_sim.ts` — session defaults: `simulatorId`, `simulatorName` (hydrate `simulatorUuid`).
- [x] `src/mcp/tools/simulator/launch_app_logs_sim.ts` — session defaults: `simulatorId` (hydrate `simulatorUuid`).
- [x] `src/mcp/tools/simulator/stop_app_sim.ts` — session defaults: `simulatorId`, `simulatorName` (hydrate `simulatorUuid`).
- [x] `src/mcp/tools/simulator/record_sim_video.ts` — session defaults: `simulatorId` (hydrate `simulatorUuid`).

## Simulator Management
- [x] `src/mcp/tools/simulator-management/erase_sims.ts` — session defaults: `simulatorId` (covers `simulatorUdid`).
- [x] `src/mcp/tools/simulator-management/set_sim_location.ts` — session defaults: `simulatorId` (hydrate `simulatorUuid`).
- [x] `src/mcp/tools/simulator-management/reset_sim_location.ts` — session defaults: `simulatorId` (hydrate `simulatorUuid`).
- [x] `src/mcp/tools/simulator-management/set_sim_appearance.ts` — session defaults: `simulatorId` (hydrate `simulatorUuid`).
- [x] `src/mcp/tools/simulator-management/sim_statusbar.ts` — session defaults: `simulatorId` (hydrate `simulatorUuid`).

## Simulator Logging
- [x] `src/mcp/tools/logging/start_sim_log_cap.ts` — session defaults: `simulatorId` (hydrate `simulatorUuid`).

## AXe UI Testing Tools
- [ ] `src/mcp/tools/ui-testing/button.ts` — session defaults: `simulatorId` (hydrate `simulatorUuid`).
- [ ] `src/mcp/tools/ui-testing/describe_ui.ts` — session defaults: `simulatorId` (hydrate `simulatorUuid`).
- [ ] `src/mcp/tools/ui-testing/gesture.ts` — session defaults: `simulatorId` (hydrate `simulatorUuid`).
- [ ] `src/mcp/tools/ui-testing/key_press.ts` — session defaults: `simulatorId` (hydrate `simulatorUuid`).
- [ ] `src/mcp/tools/ui-testing/key_sequence.ts` — session defaults: `simulatorId` (hydrate `simulatorUuid`).
- [ ] `src/mcp/tools/ui-testing/long_press.ts` — session defaults: `simulatorId` (hydrate `simulatorUuid`).
- [ ] `src/mcp/tools/ui-testing/screenshot.ts` — session defaults: `simulatorId` (hydrate `simulatorUuid`).
- [ ] `src/mcp/tools/ui-testing/swipe.ts` — session defaults: `simulatorId` (hydrate `simulatorUuid`).
- [ ] `src/mcp/tools/ui-testing/tap.ts` — session defaults: `simulatorId` (hydrate `simulatorUuid`).
- [ ] `src/mcp/tools/ui-testing/touch.ts` — session defaults: `simulatorId` (hydrate `simulatorUuid`).
- [ ] `src/mcp/tools/ui-testing/type_text.ts` — session defaults: `simulatorId` (hydrate `simulatorUuid`).
