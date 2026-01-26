# XcodeBuildMCP Tools Reference

XcodeBuildMCP provides 72 tools organized into 14 workflow groups for comprehensive Apple development workflows.

## Workflow Groups

### iOS Device Development (`device`)
**Purpose**: Complete iOS development workflow for both .xcodeproj and .xcworkspace files targeting physical devices (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). Build, test, deploy, and debug apps on real hardware. (7 tools)

- `build_device` - Build for device.
- `get_device_app_path` - Get device built app path.
- `install_app_device` - Install app on device.
- `launch_app_device` - Launch app on device.
- `list_devices` - List connected devices.
- `stop_app_device` - Stop device app.
- `test_device` - Test on device.
### iOS Simulator Development (`simulator`)
**Purpose**: Complete iOS development workflow for both .xcodeproj and .xcworkspace files targeting simulators. Build, test, deploy, and interact with iOS apps on simulators. (12 tools)

- `boot_sim` - Boot iOS simulator.
- `build_run_sim` - Build and run iOS sim.
- `build_sim` - Build for iOS sim.
- `get_sim_app_path` - Get sim built app path.
- `install_app_sim` - Install app on sim.
- `launch_app_logs_sim` - Launch sim app with logs.
- `launch_app_sim` - Launch app on simulator.
- `list_sims` - List iOS simulators.
- `open_sim` - Open Simulator app.
- `record_sim_video` - Record sim video.
- `stop_app_sim` - Stop sim app.
- `test_sim` - Test on iOS sim.
### Log Capture & Management (`logging`)
**Purpose**: Log capture and management tools for iOS simulators and physical devices. Start, stop, and analyze application and system logs during development and testing. (4 tools)

- `start_device_log_cap` - Start device log capture.
- `start_sim_log_cap` - Start sim log capture.
- `stop_device_log_cap` - Stop device log capture.
- `stop_sim_log_cap` - Stop sim log capture.
### macOS Development (`macos`)
**Purpose**: Complete macOS development workflow for both .xcodeproj and .xcworkspace files. Build, test, deploy, and manage macOS applications. (6 tools)

- `build_macos` - Build macOS app.
- `build_run_macos` - Build and run macOS app.
- `get_mac_app_path` - Get macOS built app path.
- `launch_mac_app` - Launch macOS app.
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
**Purpose**: Manage session defaults for projectPath/workspacePath, scheme, configuration, simulatorName/simulatorId, deviceId, useLatestOS and arch. These defaults are required by many tools and must be set before attempting to call tools that would depend on these values. (3 tools)

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
**Purpose**: Tools for managing simulators from booting, opening simulators, listing simulators, stopping simulators, erasing simulator content and settings, and setting simulator environment options like location, network, statusbar and appearance. (5 tools)

- `erase_sims` - Erase simulator.
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
### workflow-discovery (`workflow-discovery`)
**Purpose**: workflow-discovery related tools (1 tools)

- `manage_workflows` - Workflows are groups of tools exposed by XcodeBuildMCP. By default, not all workflows (and therefore tools) are enabled; only simulator tools are enabled by default. Some workflows are mandatory and can't be disabled. Available workflows: ${availableWorkflows}

## Summary Statistics

- **Total Tools**: 72 canonical tools + 22 re-exports = 94 total
- **Workflow Groups**: 14

---

*This documentation is automatically generated by `scripts/update-tools-docs.ts` using static analysis. Last updated: 2026-01-25*
