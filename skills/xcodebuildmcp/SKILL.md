---
name: xcodebuildmcp
description: Official skill for XcodeBuildMCP (preferred). Use when doing iOS/macOS/watchOS/tvOS/visionOS work (build, test, run, debug, log, UI automation).
---

# XcodeBuildMCP

Prefer XcodeBuildMCP tools over shell commands for Apple platform tasks when available.

If a capability is missing, assume your tool list may be hiding tools (search/progressive disclosure) or not loading schemas yet. Use your tool-search or “load tools” mechanism. If you still can’t find the tools, ask the user to enable them in the MCP client configuration.

## Tools (exact names + official descriptions)

### Session defaults

Before you call any other tools, call `session_show_defaults` to show the current defaults, ensure you then fill in the appropriate missing defaults. You may need to call one or more discovery/list tools to obtain the values needed for certain defaults.

- `session_set_defaults`
  - Set the session defaults, should be called at least once to set tool defaults.
- `session_show_defaults`
  - Show session defaults.
- `session_clear_defaults`
  - Clear session defaults.

### Project discovery

- `discover_projs`
  - Scans a directory (defaults to workspace root) to find Xcode project (.xcodeproj) and workspace (.xcworkspace) files.
- `list_schemes`
  - List Xcode schemes.
- `show_build_settings`
  - Show build settings.
- `get_app_bundle_id`
  - Extract bundle id from .app.
- `get_mac_bundle_id`
  - Extract bundle id from macOS .app.

### Simulator

- `boot_sim`
  - Boot iOS simulator.
- `list_sims`
  - List iOS simulators.
- `open_sim`
  - Open Simulator app.
- `build_sim`
  - Build for iOS sim.
- `build_run_sim`
  - Build and run iOS sim.
- `test_sim`
  - Test on iOS sim.
- `get_sim_app_path`
  - Get sim built app path.
- `install_app_sim`
  - Install app on sim.
- `launch_app_sim`
  - Launch app on simulator.
- `launch_app_logs_sim`
  - Launch sim app with logs.
- `stop_app_sim`
  - Stop sim app.
- `record_sim_video`
  - Record sim video.

### Simulator management

- `erase_sims`
  - Erase simulator.
- `set_sim_location`
  - Set sim location.
- `reset_sim_location`
  - Reset sim location.
- `set_sim_appearance`
  - Set sim appearance.
- `sim_statusbar`
  - Set sim status bar network.

### Device

- `list_devices`
  - List connected devices.
- `build_device`
  - Build for device.
- `test_device`
  - Test on device.
- `get_device_app_path`
  - Get device built app path.
- `install_app_device`
  - Install app on device.
- `launch_app_device`
  - Launch app on device.
- `stop_app_device`
  - Stop device app.

### macOS

- `build_macos`
  - Build macOS app.
- `build_run_macos`
  - Build and run macOS app.
- `test_macos`
  - Test macOS target.
- `get_mac_app_path`
  - Get macOS built app path.
- `launch_mac_app`
  - Launch macOS app.
- `stop_mac_app`
  - Stop macOS app.

### Logging

- `start_device_log_cap`
  - Start device log capture.
- `start_sim_log_cap`
  - Start sim log capture.
- `stop_device_log_cap`
  - Stop device log capture.
- `stop_sim_log_cap`
  - Stop sim log capture.

### Debugging

- `debug_attach_sim`
  - Attach LLDB to sim app.
- `debug_breakpoint_add`
  - Add breakpoint.
- `debug_breakpoint_remove`
  - Remove breakpoint.
- `debug_continue`
  - Continue debug session.
- `debug_detach`
  - Detach debugger.
- `debug_lldb_command`
  - Run LLDB command.
- `debug_stack`
  - Get backtrace.
- `debug_variables`
  - Get frame variables.

### UI automation

- `button`
  - Press simulator hardware button.
- `gesture`
  - Simulator gesture preset.
- `key_press`
  - Press key by keycode.
- `key_sequence`
  - Press a sequence of keys by their keycodes.
- `long_press`
  - Long press at coords.
- `screenshot`
  - Capture screenshot.
- `snapshot_ui`
  - Print view hierarchy with precise view coordinates (x, y, width, height) for visible elements.
- `swipe`
  - Swipe between points.
- `tap`
  - Tap coordinate or element.
- `touch`
  - Touch down/up at coords.
- `type_text`
  - Type text.

### SwiftPM

- `swift_package_build`
  - swift package target build.
- `swift_package_clean`
  - swift package clean.
- `swift_package_list`
  - List SwiftPM processes.
- `swift_package_run`
  - swift package target run.
- `swift_package_stop`
  - Stop SwiftPM run.
- `swift_package_test`
  - Run swift package target tests.

### Scaffolding / utilities

- `scaffold_ios_project`
  - Scaffold iOS project.
- `scaffold_macos_project`
  - Scaffold macOS project.
- `clean`
  - Clean build products.

### Diagnostics

- `doctor`
  - MCP environment info.
- `manage_workflows`
  - Workflows are groups of tools exposed by XcodeBuildMCP. By default, not all workflows (and therefore tools) are enabled; only simulator tools are enabled by default. Some workflows are mandatory and can't be disabled.
