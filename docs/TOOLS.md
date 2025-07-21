# XcodeBuildMCP Tools Reference

This document provides a comprehensive list of all 89 tools available in XcodeBuildMCP, organized by functionality.

## Tool Categories

### Project Discovery and Information

Tools for discovering and analyzing Xcode projects, workspaces, and build settings.

| Tool Name | Description |
|-----------|-------------|
| `discover_projs` | Scans a directory (defaults to workspace root) to find Xcode project (.xcodeproj) and workspace (.xcworkspace) files. |
| `list_schems_ws` | Lists available schemes in the workspace. IMPORTANT: Requires workspacePath. |
| `list_schems_proj` | Lists available schemes in the project file. IMPORTANT: Requires projectPath. |
| `list_sims` | Lists available iOS simulators with their UUIDs. |
| `list_devices` | Lists connected physical Apple devices (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro) with their UUIDs, names, and connection status. |
| `show_build_set_ws` | Shows build settings from a workspace using xcodebuild. IMPORTANT: Requires workspacePath and scheme. |
| `show_build_set_proj` | Shows build settings from a project file using xcodebuild. IMPORTANT: Requires projectPath and scheme. |

### Clean Tools

Tools for cleaning build products and derived data.

| Tool Name | Description |
|-----------|-------------|
| `clean_ws` | Cleans build products for a specific workspace using xcodebuild. IMPORTANT: Requires workspacePath. |
| `clean_proj` | Cleans build products for a specific project file using xcodebuild. IMPORTANT: Requires projectPath. |

### Swift Package Tools

Tools for building, testing, and running Swift Package Manager projects.

| Tool Name | Description |
|-----------|-------------|
| `swift_package_build` | Builds a Swift Package with swift build |
| `swift_package_test` | Runs tests for a Swift Package with swift test |
| `swift_package_run` | Runs an executable target from a Swift Package with swift run |
| `swift_package_stop` | Stops a running Swift Package executable started with swift_package_run |
| `swift_package_list` | Lists currently running Swift Package processes |
| `swift_package_clean` | Cleans Swift Package build artifacts and derived data |

### macOS Build Tools

Tools for building and running macOS applications.

| Tool Name | Description |
|-----------|-------------|
| `build_mac_ws` | Builds a macOS app using xcodebuild from a workspace. |
| `build_mac_proj` | Builds a macOS app using xcodebuild from a project file. |
| `build_run_mac_ws` | Builds and runs a macOS app from a workspace in one step. |
| `build_run_mac_proj` | Builds and runs a macOS app from a project file in one step. |

### iOS Simulator Build Tools

Tools for building and running iOS applications on simulators.

| Tool Name | Description |
|-----------|-------------|
| `build_sim_name_ws` | Builds an app from a workspace for a specific simulator by name. IMPORTANT: Requires workspacePath, scheme, and simulatorName. |
| `build_sim_name_proj` | Builds an app from a project file for a specific simulator by name. IMPORTANT: Requires projectPath, scheme, and simulatorName. |
| `build_sim_id_ws` | Builds an app from a workspace for a specific simulator by UUID. IMPORTANT: Requires workspacePath, scheme, and simulatorId. |
| `build_sim_id_proj` | Builds an app from a project file for a specific simulator by UUID. IMPORTANT: Requires projectPath, scheme, and simulatorId. |
| `build_run_sim_name_ws` | Builds and runs an app from a workspace on a simulator specified by name. IMPORTANT: Requires workspacePath, scheme, and simulatorName. |
| `build_run_sim_name_proj` | Builds and runs an app from a project file on a simulator specified by name. IMPORTANT: Requires projectPath, scheme, and simulatorName. |
| `build_run_sim_id_ws` | Builds and runs an app from a workspace on a simulator specified by UUID. IMPORTANT: Requires workspacePath, scheme, and simulatorId. |
| `build_run_sim_id_proj` | Builds and runs an app from a project file on a simulator specified by UUID. IMPORTANT: Requires projectPath, scheme, and simulatorId. |

### iOS Device Build Tools

Tools for building applications for physical iOS devices.

| Tool Name | Description |
|-----------|-------------|
| `build_dev_ws` | Builds an app from a workspace for a physical Apple device. IMPORTANT: Requires workspacePath and scheme. |
| `build_dev_proj` | Builds an app from a project file for a physical Apple device. IMPORTANT: Requires projectPath and scheme. |

### Test Tools

Tools for running unit tests and UI tests on various platforms.

| Tool Name | Description |
|-----------|-------------|
| `test_sim_name_ws` | Runs tests for a workspace on a simulator by name using xcodebuild test and parses xcresult output. |
| `test_sim_name_proj` | Runs tests for a project on a simulator by name using xcodebuild test and parses xcresult output. |
| `test_sim_id_ws` | Runs tests for a workspace on a simulator by UUID using xcodebuild test and parses xcresult output. |
| `test_sim_id_proj` | Runs tests for a project on a simulator by UUID using xcodebuild test and parses xcresult output. |
| `test_device_ws` | Runs tests for an Apple workspace on a physical device using xcodebuild test and parses xcresult output. IMPORTANT: Requires workspacePath, scheme, and deviceId. |
| `test_device_proj` | Runs tests for an Apple project on a physical device using xcodebuild test and parses xcresult output. IMPORTANT: Requires projectPath, scheme, and deviceId. |
| `test_macos_ws` | Runs tests for a macOS workspace using xcodebuild test and parses xcresult output. |
| `test_macos_proj` | Runs tests for a macOS project using xcodebuild test and parses xcresult output. |

### App Path Tools

Tools for retrieving the path to built application bundles.

| Tool Name | Description |
|-----------|-------------|
| `get_mac_app_path_ws` | Gets the app bundle path for a macOS application using a workspace. IMPORTANT: Requires workspacePath and scheme. |
| `get_mac_app_path_proj` | Gets the app bundle path for a macOS application using a project file. IMPORTANT: Requires projectPath and scheme. |
| `get_device_app_path_ws` | Gets the app bundle path for a physical device application using a workspace. IMPORTANT: Requires workspacePath and scheme. |
| `get_device_app_path_proj` | Gets the app bundle path for a physical device application using a project file. IMPORTANT: Requires projectPath and scheme. |
| `get_sim_app_path_name_ws` | Gets the app bundle path for a simulator by name using a workspace. IMPORTANT: Requires workspacePath, scheme, platform, and simulatorName. |
| `get_sim_app_path_name_proj` | Gets the app bundle path for a simulator by name using a project file. IMPORTANT: Requires projectPath, scheme, platform, and simulatorName. |
| `get_sim_app_path_id_ws` | Gets the app bundle path for a simulator by UUID using a workspace. IMPORTANT: Requires workspacePath, scheme, platform, and simulatorId. |
| `get_sim_app_path_id_proj` | Gets the app bundle path for a simulator by UUID using a project file. IMPORTANT: Requires projectPath, scheme, platform, and simulatorId. |

### Simulator Management Tools

Tools for managing iOS simulators and their settings.

| Tool Name | Description |
|-----------|-------------|
| `boot_sim` | Boots an iOS simulator. IMPORTANT: You MUST provide the simulatorUuid parameter. |
| `open_sim` | Opens the iOS Simulator app. |
| `set_sim_appearance` | Sets the appearance mode (dark/light) of an iOS simulator. |
| `set_simulator_location` | Sets a custom GPS location for the simulator. |
| `reset_simulator_location` | Resets the simulator's location to default. |
| `set_network_condition` | Simulates different network conditions in the simulator. |
| `reset_network_condition` | Resets network conditions to default in the simulator. |

### App Installation and Launch Tools

Tools for installing, launching, and stopping applications on simulators and devices.

| Tool Name | Description |
|-----------|-------------|
| `install_app_sim` | Installs an app in an iOS simulator. IMPORTANT: You MUST provide both the simulatorUuid and appPath parameters. |
| `launch_app_sim` | Launches an app in an iOS simulator. IMPORTANT: You MUST provide both the simulatorUuid and bundleId parameters. |
| `launch_app_logs_sim` | Launches an app in an iOS simulator and captures its logs. |
| `stop_app_sim` | Stops an app running in an iOS simulator. Requires simulatorUuid and bundleId. |
| `install_app_device` | Installs an app on a physical Apple device. Requires deviceId and appPath. |
| `launch_app_device` | Launches an app on a physical Apple device. Requires deviceId and bundleId. |
| `stop_app_device` | Stops an app running on a physical Apple device. Requires deviceId and processId. |

### Bundle ID Tools

Tools for extracting bundle identifiers from application bundles.

| Tool Name | Description |
|-----------|-------------|
| `get_mac_bundle_id` | Extracts the bundle identifier from a macOS app bundle (.app). IMPORTANT: You MUST provide the appPath parameter. |
| `get_app_bundle_id` | Extracts the bundle identifier from an app bundle (.app) for any Apple platform. IMPORTANT: You MUST provide the appPath parameter. |

### Launch Tools

Tools for launching and stopping macOS applications.

| Tool Name | Description |
|-----------|-------------|
| `launch_mac_app` | Launches a macOS application. IMPORTANT: You MUST provide the appPath parameter. |
| `stop_mac_app` | Stops a running macOS application. Can stop by app name or process ID. |

### Log Capture Tools

Tools for capturing and retrieving simulator logs.

| Tool Name | Description |
|-----------|-------------|
| `start_sim_log_cap` | Starts capturing logs from a specified simulator. Returns a session ID. |
| `stop_sim_log_cap` | Stops an active simulator log capture session and returns the captured logs. |

### Device Log Capture Tools

Tools for capturing and retrieving device logs from physical Apple devices.

| Tool Name | Description |
|-----------|-------------|
| `start_device_log_cap` | Starts capturing logs from a specified Apple device by launching the app with console output. Returns a session ID. |
| `stop_device_log_cap` | Stops an active Apple device log capture session and returns the captured logs. |

### UI Automation Tools

Tools for automating user interface interactions on iOS simulators.

| Tool Name | Description |
|-----------|-------------|
| `describe_ui` | Gets entire view hierarchy with precise frame coordinates for all visible elements. Use this before UI interactions. |
| `tap` | Tap at specific coordinates. Use describe_ui to get precise element coordinates. |
| `long_press` | Long press at specific coordinates for given duration (ms). Use describe_ui for precise coordinates. |
| `swipe` | Swipe from one point to another. Use describe_ui for precise coordinates. |
| `type_text` | Type text (supports US keyboard characters). Use describe_ui to find text field, tap to focus, then type. |
| `key_press` | Press a single key by keycode on the simulator. Common keycodes: 40=Return, 42=Backspace, 43=Tab, 44=Space. |
| `button` | Press a hardware button on the simulator. Available buttons: apple-pay, home, lock, side-button, siri. |
| `key_sequence` | Press a sequence of keys by their keycodes on the simulator. |
| `touch` | Perform touch down/up events at specific coordinates. Use describe_ui for precise coordinates. |
| `gesture` | Perform preset gesture patterns on the simulator (scroll-up, scroll-down, swipe-from-edge, etc.). |

### Screenshot Tools

Tools for capturing screenshots of simulator screens.

| Tool Name | Description |
|-----------|-------------|
| `screenshot` | Captures screenshot for visual verification. For UI coordinates, use describe_ui instead. |

### Scaffold Tools

Tools for creating new projects from templates.

| Tool Name | Description |
|-----------|-------------|
| `scaffold_ios_project` | Scaffold a new iOS project from templates. Creates a modern Xcode project with workspace structure. |
| `scaffold_macos_project` | Scaffold a new macOS project from templates. Creates a modern Xcode project with workspace structure. |

### Diagnostic Tools

Tools for system diagnostics and environment validation.

| Tool Name | Description |
|-----------|-------------|
| `diagnostic` | Provides comprehensive information about the MCP server environment, available dependencies, and configuration status. |

## Tool Usage Patterns

### Common Workflows

1. **iOS Simulator Development**:
   ```
   discover_projs → list_schems_ws → list_sims → build_sim_name_ws → install_app_sim → launch_app_sim
   ```

2. **macOS Development**:
   ```
   discover_projs → list_schems_ws → build_mac_ws → launch_mac_app
   ```

3. **Testing Workflow**:
   ```
   discover_projs → list_schems_ws → test_sim_name_ws (or test_macos_ws)
   ```

4. **Swift Package Development**:
   ```
   swift_package_build → swift_package_test → swift_package_run
   ```

### Parameter Requirements

Many tools require specific parameters:
- **Workspace tools**: `workspacePath`
- **Project tools**: `projectPath`
- **Scheme-based tools**: `scheme`
- **Simulator tools**: `simulatorName` or `simulatorId`
- **Device tools**: `deviceId`
- **App tools**: `appPath` or `bundleId`

### Environment Variables

Tools can be selectively enabled using environment variables:
- Individual tools: `XCODEBUILDMCP_TOOL_<TOOL_NAME>=true`
- Tool groups: `XCODEBUILDMCP_GROUP_<GROUP_NAME>=true`
- Debug mode: `XCODEBUILDMCP_DEBUG=true`

## Notes

- All tools use Zod schema validation for parameters
- Error handling is standardized across all tools
- Tools requiring write operations are marked with `isWriteTool: true`
- UI automation tools use precise coordinates from `describe_ui`, not screenshots
- Device operations require proper code signing configuration in Xcode