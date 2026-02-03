# XcodeBuildMCP MCP Tools Reference

This document lists MCP tool names as exposed to MCP clients. XcodeBuildMCP provides 72 canonical tools organized into 14 workflow groups for comprehensive Apple development workflows.

## Workflow Groups

### iOS Device Development (`device`)
**Purpose**: Complete iOS development workflow for both .xcodeproj and .xcworkspace files targeting physical devices (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). Build, test, deploy, and debug apps on real hardware. (14 tools)

- `build_device` - Build for device.
- `clean` - Defined in Project Utilities workflow.
- `discover_projs` - Defined in Project Discovery workflow.
- `get_app_bundle_id` - Defined in Project Discovery workflow.
- `get_device_app_path` - Get device built app path.
- `install_app_device` - Install app on device.
- `launch_app_device` - Launch app on device.
- `list_devices` - List connected devices.
- `list_schemes` - Defined in Project Discovery workflow.
- `show_build_settings` - Defined in Project Discovery workflow.
- `start_device_log_cap` - Defined in Log Capture & Management workflow.
- `stop_app_device` - Stop device app.
- `stop_device_log_cap` - Defined in Log Capture & Management workflow.
- `test_device` - Test on device.



### iOS Simulator Development (`simulator`)
**Purpose**: Complete iOS development workflow for both .xcodeproj and .xcworkspace files targeting simulators. Build, test, deploy, and interact with iOS apps on simulators. (20 tools)

- `boot_sim` - Boot iOS simulator.
- `build_run_sim` - Build and run iOS sim.
- `build_sim` - Build for iOS sim.
- `clean` - Defined in Project Utilities workflow.
- `discover_projs` - Defined in Project Discovery workflow.
- `get_app_bundle_id` - Defined in Project Discovery workflow.
- `get_sim_app_path` - Get sim built app path.
- `install_app_sim` - Install app on sim.
- `launch_app_logs_sim` - Launch sim app with logs.
- `launch_app_sim` - Launch app on simulator.
- `list_schemes` - Defined in Project Discovery workflow.
- `list_sims` - List iOS simulators.
- `open_sim` - Open Simulator app.
- `record_sim_video` - Record sim video.
- `screenshot` - Defined in UI Automation workflow.
- `show_build_settings` - Defined in Project Discovery workflow.
- `snapshot_ui` - Defined in UI Automation workflow.
- `stop_app_sim` - Stop sim app.
- `stop_sim_log_cap` - Defined in Log Capture & Management workflow.
- `test_sim` - Test on iOS sim.



### Log Capture & Management (`logging`)
**Purpose**: Log capture and management tools for iOS simulators and physical devices. Start, stop, and analyze application and system logs during development and testing. (4 tools)

- `start_device_log_cap` - Start device log capture.
- `start_sim_log_cap` - Start sim log capture.
- `stop_device_log_cap` - Stop device app and return logs.
- `stop_sim_log_cap` - Stop sim app and return logs.



### macOS Development (`macos`)
**Purpose**: Complete macOS development workflow for both .xcodeproj and .xcworkspace files. Build, test, deploy, and manage macOS applications. (11 tools)

- `build_macos` - Build macOS app.
- `build_run_macos` - Build and run macOS app.
- `clean` - Defined in Project Utilities workflow.
- `discover_projs` - Defined in Project Discovery workflow.
- `get_mac_app_path` - Get macOS built app path.
- `get_mac_bundle_id` - Defined in Project Discovery workflow.
- `launch_mac_app` - Launch macOS app.
- `list_schemes` - Defined in Project Discovery workflow.
- `show_build_settings` - Defined in Project Discovery workflow.
- `stop_mac_app` - Stop macOS app.
- `test_macos` - Test macOS target.



### Project Discovery (`project-discovery`)
**Purpose**: Discover and examine Xcode projects, workspaces, and Swift packages. Analyze project structure, schemes, build settings, and bundle information. (5 tools)

- `discover_projs` - Scans a directory (defaults to workspace root) to find Xcode project (.xcodeproj) and workspace (.xcworkspace) files.
- `get_app_bundle_id` - Extract bundle id from .app.
- `get_mac_bundle_id` - Extract bundle id from macOS .app.
- `list_schemes` - List Xcode schemes.
- `show_build_settings` - Show build settings.



### Project Scaffolding (`project-scaffolding`)
**Purpose**: Tools for creating new iOS and macOS projects from templates. Bootstrap new applications with best practices, standard configurations, and modern project structures. (2 tools)

- `scaffold_ios_project` - Scaffold iOS project.
- `scaffold_macos_project` - Scaffold macOS project.



### Project Utilities (`utilities`)
**Purpose**: Essential project maintenance utilities for cleaning and managing existing projects. Provides clean operations for both .xcodeproj and .xcworkspace files. (1 tools)

- `clean` - Clean build products.



### session-management (`session-management`)
**Purpose**: Manage session defaults for project/workspace paths, scheme, configuration, simulatorName/simulatorId, deviceId, useLatestOS, arch, suppressWarnings, derivedDataPath, preferXcodebuild, platform, and bundleId. Defaults can be seeded from .xcodebuildmcp/config.yaml at startup. (3 tools)

- `session_clear_defaults` - Clear session defaults.
- `session_set_defaults` - Set the session defaults, should be called at least once to set tool defaults.
- `session_show_defaults` - Show session defaults.



### Simulator Debugging (`debugging`)
**Purpose**: Interactive iOS Simulator debugging tools: attach LLDB, manage breakpoints, inspect stack/variables, and run LLDB commands. (8 tools)

- `debug_attach_sim` - Attach LLDB to sim app.
- `debug_breakpoint_add` - Add breakpoint.
- `debug_breakpoint_remove` - Remove breakpoint.
- `debug_continue` - Continue debug session.
- `debug_detach` - Detach debugger.
- `debug_lldb_command` - Run LLDB command.
- `debug_stack` - Get backtrace.
- `debug_variables` - Get frame variables.



### Simulator Management (`simulator-management`)
**Purpose**: Tools for managing simulators from booting, opening simulators, listing simulators, stopping simulators, erasing simulator content and settings, and setting simulator environment options like location, network, statusbar and appearance. (8 tools)

- `boot_sim` - Defined in iOS Simulator Development workflow.
- `erase_sims` - Erase simulator.
- `list_sims` - Defined in iOS Simulator Development workflow.
- `open_sim` - Defined in iOS Simulator Development workflow.
- `reset_sim_location` - Reset sim location.
- `set_sim_appearance` - Set sim appearance.
- `set_sim_location` - Set sim location.
- `sim_statusbar` - Set sim status bar network.



### Swift Package Manager (`swift-package`)
**Purpose**: Swift Package Manager operations for building, testing, running, and managing Swift packages and dependencies. Complete SPM workflow support. (6 tools)

- `swift_package_build` - swift package target build.
- `swift_package_clean` - swift package clean.
- `swift_package_list` - List SwiftPM processes.
- `swift_package_run` - swift package target run.
- `swift_package_stop` - Stop SwiftPM run.
- `swift_package_test` - Run swift package target tests.



### System Doctor (`doctor`)
**Purpose**: Debug tools and system doctor for troubleshooting XcodeBuildMCP server, development environment, and tool availability. (1 tools)

- `doctor` - MCP environment info.



### UI Automation (`ui-automation`)
**Purpose**: UI automation and accessibility testing tools for iOS simulators. Perform gestures, interactions, screenshots, and UI analysis for automated testing workflows. (11 tools)

- `button` - Press simulator hardware button.
- `gesture` - Simulator gesture preset.
- `key_press` - Press key by keycode.
- `key_sequence` - Press a sequence of keys by their keycodes.
- `long_press` - Long press at coords.
- `screenshot` - Capture screenshot.
- `snapshot_ui` - Print view hierarchy with precise view coordinates (x, y, width, height) for visible elements.
- `swipe` - Swipe between points.
- `tap` - Tap coordinate or element.
- `touch` - Touch down/up at coords.
- `type_text` - Type text.



### Workflow Discovery (`workflow-discovery`)
**Purpose**: Manage the workflows that are enabled and disabled. (1 tools)

- `manage_workflows` - Workflows are groups of tools exposed by XcodeBuildMCP. By default, not all workflows (and therefore tools) are enabled; only simulator tools are enabled by default. Some workflows are mandatory and can't be disabled. Available workflows: ${availableWorkflows}



## Summary Statistics

- **Canonical Tools**: 72
- **Total Tools**: 95
- **Workflow Groups**: 14

---

*This documentation is automatically generated by `scripts/update-tools-docs.ts` from the tools manifest. Last updated: 2026-02-03T12:43:04.479Z UTC*
