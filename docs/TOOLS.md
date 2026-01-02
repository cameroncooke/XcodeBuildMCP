# XcodeBuildMCP Tools Reference

XcodeBuildMCP provides 70 tools organized into 13 workflow groups for comprehensive Apple development workflows.

## Workflow Groups

### iOS Device Development (`device`)
**Purpose**: Complete iOS development workflow for both .xcodeproj and .xcworkspace files targeting physical devices (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). Build, test, deploy, and debug apps on real hardware. (7 tools)

- `build_device` - Builds an app for a connected device.
- `get_device_app_path` - Retrieves the built app path for a connected device.
- `install_app_device` - Installs an app on a connected device.
- `launch_app_device` - Launches an app on a connected device.
- `list_devices` - Lists connected physical Apple devices (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro) with their UUIDs, names, and connection status. Use this to discover physical devices for testing.
- `stop_app_device` - Stops a running app on a connected device.
- `test_device` - Runs tests on a physical Apple device.
### iOS Simulator Development (`simulator`)
**Purpose**: Complete iOS development workflow for both .xcodeproj and .xcworkspace files targeting simulators. Build, test, deploy, and interact with iOS apps on simulators. (12 tools)

- `boot_sim` - Boots an iOS simulator.
- `build_run_sim` - Builds and runs an app on an iOS simulator.
- `build_sim` - Builds an app for an iOS simulator.
- `get_sim_app_path` - Retrieves the built app path for an iOS simulator.
- `install_app_sim` - Installs an app in an iOS simulator.
- `launch_app_logs_sim` - Launches an app in an iOS simulator and captures its logs.
- `launch_app_sim` - Launches an app in an iOS simulator.
- `list_sims` - Lists available iOS simulators with their UUIDs.
- `open_sim` - Opens the iOS Simulator app.
- `record_sim_video` - Starts or stops video capture for an iOS simulator.
- `stop_app_sim` - Stops an app running in an iOS simulator.
- `test_sim` - Runs tests on an iOS simulator.
### Log Capture & Management (`logging`)
**Purpose**: Log capture and management tools for iOS simulators and physical devices. Start, stop, and analyze application and system logs during development and testing. (4 tools)

- `start_device_log_cap` - Starts log capture on a connected device.
- `start_sim_log_cap` - Starts capturing logs from a specified simulator. Returns a session ID. By default, captures only structured logs.
- `stop_device_log_cap` - Stops an active Apple device log capture session and returns the captured logs.
- `stop_sim_log_cap` - Stops an active simulator log capture session and returns the captured logs.
### macOS Development (`macos`)
**Purpose**: Complete macOS development workflow for both .xcodeproj and .xcworkspace files. Build, test, deploy, and manage macOS applications. (6 tools)

- `build_macos` - Builds a macOS app.
- `build_run_macos` - Builds and runs a macOS app.
- `get_mac_app_path` - Retrieves the built macOS app bundle path.
- `launch_mac_app` - Launches a macOS application. Note: In some environments, this tool may be prefixed as mcp0_launch_macos_app.
- `stop_mac_app` - Stops a running macOS application. Can stop by app name or process ID.
- `test_macos` - Runs tests for a macOS target.
### Project Discovery (`project-discovery`)
**Purpose**: Discover and examine Xcode projects, workspaces, and Swift packages. Analyze project structure, schemes, build settings, and bundle information. (5 tools)

- `discover_projs` - Scans a directory (defaults to workspace root) to find Xcode project (.xcodeproj) and workspace (.xcworkspace) files.
- `get_app_bundle_id` - Extracts the bundle identifier from an app bundle (.app) for any Apple platform (iOS, iPadOS, watchOS, tvOS, visionOS).
- `get_mac_bundle_id` - Extracts the bundle identifier from a macOS app bundle (.app). Note: In some environments, this tool may be prefixed as mcp0_get_macos_bundle_id.
- `list_schemes` - Lists schemes for a project or workspace.
- `show_build_settings` - Shows xcodebuild build settings.
### Project Scaffolding (`project-scaffolding`)
**Purpose**: Tools for creating new iOS and macOS projects from templates. Bootstrap new applications with best practices, standard configurations, and modern project structures. (2 tools)

- `scaffold_ios_project` - Scaffold a new iOS project from templates. Creates a modern Xcode project with workspace structure, SPM package for features, and proper iOS configuration.
- `scaffold_macos_project` - Scaffold a new macOS project from templates. Creates a modern Xcode project with workspace structure, SPM package for features, and proper macOS configuration.
### Project Utilities (`utilities`)
**Purpose**: Essential project maintenance utilities for cleaning and managing existing projects. Provides clean operations for both .xcodeproj and .xcworkspace files. (1 tools)

- `clean` - Cleans build products with xcodebuild.
### session-management (`session-management`)
**Purpose**: Manage session defaults for projectPath/workspacePath, scheme, configuration, simulatorName/simulatorId, deviceId, useLatestOS and arch. These defaults are required by many tools and must be set before attempting to call tools that would depend on these values. (3 tools)

- `session_clear_defaults` - Clear selected or all session defaults.
- `session_set_defaults` - Set the session defaults needed by many tools. Most tools require one or more session defaults to be set before they can be used. Agents should set all relevant defaults up front in a single call (e.g., project/workspace, scheme, simulator or device ID, useLatestOS) to avoid iterative prompts; only set the keys your workflow needs.
- `session_show_defaults` - Show current session defaults.
### Simulator Debugging (`debugging`)
**Purpose**: Interactive iOS Simulator debugging tools: attach LLDB, manage breakpoints, inspect stack/variables, and run LLDB commands. (7 tools)

- `debug_attach_sim` - Attach LLDB to a running iOS simulator app. Provide bundleId or pid, plus simulator defaults.
- `debug_breakpoint_add` - Add a breakpoint by file/line or function name for the active debug session.
- `debug_breakpoint_remove` - Remove a breakpoint by id for the active debug session.
- `debug_detach` - Detach the current debugger session or a specific debugSessionId.
- `debug_lldb_command` - Run an arbitrary LLDB command within the active debug session.
- `debug_stack` - Return a thread backtrace from the active debug session.
- `debug_variables` - Return variables for a selected frame in the active debug session.
### Simulator Management (`simulator-management`)
**Purpose**: Tools for managing simulators from booting, opening simulators, listing simulators, stopping simulators, erasing simulator content and settings, and setting simulator environment options like location, network, statusbar and appearance. (5 tools)

- `erase_sims` - Erases a simulator by UDID.
- `reset_sim_location` - Resets the simulator's location to default.
- `set_sim_appearance` - Sets the appearance mode (dark/light) of an iOS simulator.
- `set_sim_location` - Sets a custom GPS location for the simulator.
- `sim_statusbar` - Sets the data network indicator in the iOS simulator status bar. Use "clear" to reset all overrides, or specify a network type (hide, wifi, 3g, 4g, lte, lte-a, lte+, 5g, 5g+, 5g-uwb, 5g-uc).
### Swift Package Manager (`swift-package`)
**Purpose**: Swift Package Manager operations for building, testing, running, and managing Swift packages and dependencies. Complete SPM workflow support. (6 tools)

- `swift_package_build` - Builds a Swift Package with swift build
- `swift_package_clean` - Cleans Swift Package build artifacts and derived data
- `swift_package_list` - Lists currently running Swift Package processes
- `swift_package_run` - Runs an executable target from a Swift Package with swift run
- `swift_package_stop` - Stops a running Swift Package executable started with swift_package_run
- `swift_package_test` - Runs tests for a Swift Package with swift test
### System Doctor (`doctor`)
**Purpose**: Debug tools and system doctor for troubleshooting XcodeBuildMCP server, development environment, and tool availability. (1 tools)

- `doctor` - Provides comprehensive information about the MCP server environment, available dependencies, and configuration status.
### UI Testing & Automation (`ui-testing`)
**Purpose**: UI automation and accessibility testing tools for iOS simulators. Perform gestures, interactions, screenshots, and UI analysis for automated testing workflows. (11 tools)

- `button` - Press hardware button on iOS simulator. Supported buttons: apple-pay, home, lock, side-button, siri
- `describe_ui` - Gets entire view hierarchy with precise frame coordinates (x, y, width, height) for all visible elements. Use this before UI interactions or after layout changes - do NOT guess coordinates from screenshots. Returns JSON tree with frame data for accurate automation. Requires the target process to be running; paused debugger/breakpoints can yield an empty tree.
- `gesture` - Perform gesture on iOS simulator using preset gestures: scroll-up, scroll-down, scroll-left, scroll-right, swipe-from-left-edge, swipe-from-right-edge, swipe-from-top-edge, swipe-from-bottom-edge
- `key_press` - Press a single key by keycode on the simulator. Common keycodes: 40=Return, 42=Backspace, 43=Tab, 44=Space, 58-67=F1-F10.
- `key_sequence` - Press key sequence using HID keycodes on iOS simulator with configurable delay
- `long_press` - Long press at specific coordinates for given duration (ms). Use describe_ui for precise coordinates (don't guess from screenshots).
- `screenshot` - Captures screenshot for visual verification. For UI coordinates, use describe_ui instead (don't determine coordinates from screenshots).
- `swipe` - Swipe from one point to another. Use describe_ui for precise coordinates (don't guess from screenshots). Supports configurable timing.
- `tap` - Tap at specific coordinates or target elements by accessibility id or label. Use describe_ui to get precise element coordinates prior to using x/y parameters (don't guess from screenshots). Supports optional timing delays.
- `touch` - Perform touch down/up events at specific coordinates. Use describe_ui for precise coordinates (don't guess from screenshots).
- `type_text` - Type text (supports US keyboard characters). Use describe_ui to find text field, tap to focus, then type.

## Summary Statistics

- **Total Tools**: 70 canonical tools + 22 re-exports = 92 total
- **Workflow Groups**: 13

---

*This documentation is automatically generated by `scripts/update-tools-docs.ts` using static analysis. Last updated: 2026-01-02*
