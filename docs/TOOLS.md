# XcodeBuildMCP Reference

This document provides a comprehensive list of all MCP tools and resources available in XcodeBuildMCP.

## Overview

XcodeBuildMCP uses a **workflow-based architecture** with tools organized into  groups based on specific developer workflows. Each workflow represents a complete end-to-end development process (e.g., iOS simulator development, macOS development, UI testing).

## Tools

### Workflow Groups

#### 1. Dynamic Tool Discovery (`discovery`)
**Purpose**: Intelligent workflow enablement based on natural language task descriptions
- `discover_tools` - Analyzes a natural language task description to enable a relevant set of Xcode and Apple development tools for the current session

#### 2. Project Discovery (`project-discovery`)
**Purpose**: Project analysis and information gathering (7 tools)
- `discover_projs` - Scans a directory (defaults to workspace root) to find Xcode project (.xcodeproj) and workspace (.xcworkspace) files
- `get_app_bundle_id` - Extracts the bundle identifier from an app bundle (.app) for any Apple platform
- `get_mac_bundle_id` - Extracts the bundle identifier from a macOS app bundle (.app)
- `list_schems_proj` - Lists available schemes in the project file
- `list_schems_ws` - Lists available schemes in the workspace file
- `show_build_set_proj` - Shows build settings from a project file using xcodebuild
- `show_build_set_ws` - Shows build settings from a workspace using xcodebuild

#### 3. iOS Simulator Project Development (`simulator-project`)
**Purpose**: Complete iOS development workflow for .xcodeproj files (23 tools)
- `boot_sim` - Boots an iOS simulator using its UUID
- `build_run_sim_id_proj` - Builds and runs an app from a project file on a simulator specified by UUID
- `build_run_sim_name_proj` - Builds and runs an app from a project file on a simulator specified by name
- `build_sim_id_proj` - Builds an app from a project file for a specific simulator by UUID
- `build_sim_name_proj` - Builds an app from a project file for a specific simulator by name
- `clean_proj` - Cleans build products for a specific project file using xcodebuild
- `describe_ui` - Gets entire view hierarchy with precise frame coordinates for all visible elements
- `discover_projs` - Scans a directory to find Xcode project and workspace files
- `get_app_bundle_id` - Extracts the bundle identifier from an app bundle for any Apple platform
- `get_sim_app_path_id_proj` - Gets the app bundle path for a simulator by UUID using a project file
- `get_sim_app_path_name_proj` - Gets the app bundle path for a simulator by name using a project file
- `install_app_sim` - Installs an app in an iOS simulator
- `launch_app_logs_sim` - Launches an app in an iOS simulator and captures its logs
- `launch_app_sim` - Launches an app in an iOS simulator
- `list_schems_proj` - Lists available schemes in the project file
- `list_sims` - Lists available iOS simulators with their UUIDs
- `open_sim` - Opens the iOS Simulator app
- `screenshot` - Captures screenshot for visual verification
- `show_build_set_proj` - Shows build settings from a project file using xcodebuild
- `stop_app_sim` - Stops an app running in an iOS simulator
- `test_sim_id_proj` - Runs tests for a project on a simulator by UUID using xcodebuild test
- `test_sim_name_proj` - Runs tests for a project on a simulator by name using xcodebuild test

#### 4. iOS Simulator Workspace Development (`simulator-workspace`)  
**Purpose**: Complete iOS development workflow for .xcworkspace files (25 tools)
- `boot_sim` - Boots an iOS simulator using its UUID
- `build_run_sim_id_ws` - Builds and runs an app from a workspace on a simulator specified by UUID
- `build_run_sim_name_ws` - Builds and runs an app from a workspace on a simulator specified by name
- `build_sim_id_ws` - Builds an app from a workspace for a specific simulator by UUID
- `build_sim_name_ws` - Builds an app from a workspace for a specific simulator by name
- `clean_ws` - Cleans build products for a specific workspace using xcodebuild
- `describe_ui` - Gets entire view hierarchy with precise frame coordinates for all visible elements
- `discover_projs` - Scans a directory to find Xcode project and workspace files
- `get_app_bundle_id` - Extracts the bundle identifier from an app bundle for any Apple platform
- `get_sim_app_path_id_ws` - Gets the app bundle path for a simulator by UUID using a workspace
- `get_sim_app_path_name_ws` - Gets the app bundle path for a simulator by name using a workspace
- `install_app_sim` - Installs an app in an iOS simulator
- `launch_app_logs_sim` - Launches an app in an iOS simulator and captures its logs
- `launch_app_sim` - Launches an app in an iOS simulator
- `launch_app_sim_name_ws` - Launches an app in an iOS simulator by simulator name
- `list_schems_ws` - Lists available schemes in the workspace file
- `list_sims` - Lists available iOS simulators with their UUIDs
- `open_sim` - Opens the iOS Simulator app
- `screenshot` - Captures screenshot for visual verification
- `show_build_set_ws` - Shows build settings from a workspace using xcodebuild
- `stop_app_sim` - Stops an app running in an iOS simulator
- `stop_app_sim_name_ws` - Stops an app running in an iOS simulator by simulator name
- `test_sim_id_ws` - Runs tests for a workspace on a simulator by UUID using xcodebuild test
- `test_sim_name_ws` - Runs tests for a workspace on a simulator by name using xcodebuild test

#### 5. iOS Device Project Development (`device-project`)
**Purpose**: Physical device development workflow for .xcodeproj files (14 tools)
- `build_dev_proj` - Builds an app from a project file for a physical Apple device
- `clean_proj` - Cleans build products for a specific project file using xcodebuild
- `discover_projs` - Scans a directory to find Xcode project and workspace files
- `get_app_bundle_id` - Extracts the bundle identifier from an app bundle for any Apple platform
- `get_device_app_path_proj` - Gets the app bundle path for a physical device application using a project file
- `install_app_device` - Installs an app on a physical Apple device
- `launch_app_device` - Launches an app on a physical Apple device
- `list_devices` - Lists connected physical Apple devices with their UUIDs, names, and connection status
- `list_schems_proj` - Lists available schemes in the project file
- `show_build_set_proj` - Shows build settings from a project file using xcodebuild
- `start_device_log_cap` - Starts capturing logs from a specified Apple device
- `stop_app_device` - Stops an app running on a physical Apple device
- `stop_device_log_cap` - Stops an active Apple device log capture session and returns the captured logs
- `test_device_proj` - Runs tests for an Apple project on a physical device using xcodebuild test

#### 6. iOS Device Workspace Development (`device-workspace`)
**Purpose**: Physical device development workflow for .xcworkspace files (14 tools)
- `build_dev_ws` - Builds an app from a workspace for a physical Apple device
- `clean_ws` - Cleans build products for a specific workspace using xcodebuild
- `discover_projs` - Scans a directory to find Xcode project and workspace files
- `get_app_bundle_id` - Extracts the bundle identifier from an app bundle for any Apple platform
- `get_device_app_path_ws` - Gets the app bundle path for a physical device application using a workspace
- `install_app_device` - Installs an app on a physical Apple device
- `launch_app_device` - Launches an app on a physical Apple device
- `list_devices` - Lists connected physical Apple devices with their UUIDs, names, and connection status
- `list_schems_ws` - Lists available schemes in the workspace file
- `show_build_set_ws` - Shows build settings from a workspace using xcodebuild
- `start_device_log_cap` - Starts capturing logs from a specified Apple device
- `stop_app_device` - Stops an app running on a physical Apple device
- `stop_device_log_cap` - Stops an active Apple device log capture session and returns the captured logs
- `test_device_ws` - Runs tests for an Apple workspace on a physical device using xcodebuild test

#### 7. macOS Project Development (`macos-project`)
**Purpose**: macOS application development for .xcodeproj files (11 tools)
- `build_mac_proj` - Builds a macOS app using xcodebuild from a project file
- `build_run_mac_proj` - Builds and runs a macOS app from a project file in one step
- `clean_proj` - Cleans build products for a specific project file using xcodebuild
- `discover_projs` - Scans a directory to find Xcode project and workspace files
- `get_mac_app_path_proj` - Gets the app bundle path for a macOS application using a project file
- `get_mac_bundle_id` - Extracts the bundle identifier from a macOS app bundle (.app)
- `launch_mac_app` - Launches a macOS application
- `list_schems_proj` - Lists available schemes in the project file
- `show_build_set_proj` - Shows build settings from a project file using xcodebuild
- `stop_mac_app` - Stops a running macOS application
- `test_macos_proj` - Runs tests for a macOS project using xcodebuild test

#### 8. macOS Workspace Development (`macos-workspace`)  
**Purpose**: macOS application development for .xcworkspace files (11 tools)
- `build_mac_ws` - Builds a macOS app using xcodebuild from a workspace
- `build_run_mac_ws` - Builds and runs a macOS app from a workspace in one step
- `clean_ws` - Cleans build products for a specific workspace using xcodebuild
- `discover_projs` - Scans a directory to find Xcode project and workspace files
- `get_mac_app_path_ws` - Gets the app bundle path for a macOS application using a workspace
- `get_mac_bundle_id` - Extracts the bundle identifier from a macOS app bundle (.app)
- `launch_mac_app` - Launches a macOS application
- `list_schems_ws` - Lists available schemes in the workspace file
- `show_build_set_ws` - Shows build settings from a workspace using xcodebuild
- `stop_mac_app` - Stops a running macOS application
- `test_macos_ws` - Runs tests for a macOS workspace using xcodebuild test

#### 9. Swift Package Manager (`swift-package`)
**Purpose**: Swift Package development workflow (6 tools)
- `swift_package_build` - Builds a Swift Package with swift build
- `swift_package_clean` - Cleans Swift Package build artifacts and derived data
- `swift_package_list` - Lists currently running Swift Package processes
- `swift_package_run` - Runs an executable target from a Swift Package with swift run
- `swift_package_stop` - Stops a running Swift Package executable started with swift_package_run
- `swift_package_test` - Runs tests for a Swift Package with swift test

#### 10. UI Testing & Automation (`ui-testing`)
**Purpose**: UI automation and testing tools (11 tools)
- `button` - Press a hardware button on the simulator
- `describe_ui` - Gets entire view hierarchy with precise frame coordinates for all visible elements
- `gesture` - Perform preset gesture patterns on the simulator
- `key_press` - Press a single key by keycode on the simulator
- `key_sequence` - Press a sequence of keys by their keycodes on the simulator
- `long_press` - Long press at specific coordinates for given duration
- `screenshot` - Captures screenshot for visual verification
- `swipe` - Swipe from one point to another
- `tap` - Tap at specific coordinates
- `touch` - Perform touch down/up events at specific coordinates
- `type_text` - Type text (supports US keyboard characters)

#### 11. Simulator Management (`simulator-management`)
**Purpose**: Manage simulators and their environment (7 tools)
- `boot_sim` - Boots an iOS simulator using its UUID
- `list_sims` - Lists available iOS simulators with their UUIDs
- `open_sim` - Opens the iOS Simulator app
- `reset_simulator_location` - Resets the simulator's location to default
- `set_sim_appearance` - Sets the appearance mode (dark/light) of an iOS simulator
- `set_simulator_location` - Sets a custom GPS location for the simulator
- `sim_statusbar` - Sets the data network indicator and status bar overrides in the iOS simulator

#### 12. Logging & Monitoring (`logging`)
**Purpose**: Log capture and monitoring across platforms (4 tools)
- `start_device_log_cap` - Starts capturing logs from a specified Apple device
- `start_sim_log_cap` - Starts capturing logs from a specified simulator
- `stop_device_log_cap` - Stops an active Apple device log capture session and returns the captured logs
- `stop_sim_log_cap` - Stops an active simulator log capture session and returns the captured logs

#### 13. Project Scaffolding (`project-scaffolding`)
**Purpose**: Create new projects from templates (2 tools)
- `scaffold_ios_project` - Scaffold a new iOS project from templates with modern Xcode project structure
- `scaffold_macos_project` - Scaffold a new macOS project from templates with modern Xcode project structure

#### 14. Utilities (`utilities`)
**Purpose**: General utility tools (2 tools)
- `clean_proj` - Cleans build products for a specific project file using xcodebuild
- `clean_ws` - Cleans build products for a specific workspace using xcodebuild

#### 15. System Doctor (`doctor`)
**Purpose**: System health checks and environment validation (1 tool)
- `doctor` - Provides comprehensive information about the MCP server environment, available dependencies, and configuration status


### Operating Modes

XcodeBuildMCP supports two operating modes:

#### Static Mode (Default)
All tools are loaded and available immediately at startup. Provides complete access to the full toolset without restrictions. Set `XCODEBUILDMCP_DYNAMIC_TOOLS=false` or leave unset.

#### Dynamic Mode (Experimental)
Only the `discover_tools` and `discover_projs` tools are available initially. AI agents can use `discover_tools` tool to provide a task description that the server will analyze and intelligently enable relevant workflow based tool-groups on-demand. Set `XCODEBUILDMCP_DYNAMIC_TOOLS=true` to enable.

## MCP Resources

For clients that support MCP resources, XcodeBuildMCP provides efficient URI-based data access:

| Resource URI | Description | Mirrors Tool |
|--------------|-------------|---------------|
| `xcodebuildmcp://simulators` | Available iOS simulators with UUIDs and states | `list_sims` |
| `xcodebuildmcp://devices` | Available physical Apple devices with UUIDs, names, and connection status | `list_devices` |
| `xcodebuildmcp://doctor` | System health checks and environment validation | `doctor` |