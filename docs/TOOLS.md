# XcodeBuildMCP Tools Reference

This document provides a comprehensive list of all MCP tools and resources available in XcodeBuildMCP.

## Overview

XcodeBuildMCP provides **61 tools** organized into **12 workflow groups** for comprehensive Apple development support. The unified architecture consolidates project/workspace variants into single tools that accept both input types, reducing context usage and simplifying tool discovery.

## Key Changes in v1.11+

### Unified Tool Architecture
- **Consolidated Tools**: Project and workspace variants merged into single tools with XOR validation
- **Simplified Parameters**: Tools now accept EITHER `projectPath` OR `workspacePath` (not both)
- **Simulator Flexibility**: Tools accept EITHER `simulatorId` OR `simulatorName` (not both)  
- **Reduced Context**: From ~85 tools down to 61 tools (~30% reduction)
- **Improved Hints**: Clear parameter descriptions prevent trial-and-error discovery

## Tools by Workflow

### 1. iOS Device Development (`device`) - 14 tools
**Purpose**: Physical device development, testing, and deployment

- `build_device` - Builds an app from a project or workspace for a physical Apple device
- `clean` - Cleans build products for either a project or a workspace using xcodebuild
- `discover_projs` - Scans a directory to find Xcode project and workspace files
- `get_app_bundle_id` - Extracts the bundle identifier from an app bundle (.app)
- `get_device_app_path` - Gets the app bundle path for a physical device application
- `install_app_device` - Installs an app on a physical Apple device
- `launch_app_device` - Launches an app on a physical Apple device
- `list_devices` - Lists connected physical Apple devices with their UUIDs and status
- `list_schemes` - Lists available schemes for either a project or a workspace
- `show_build_settings` - Shows build settings from either a project or workspace
- `start_device_log_cap` - Starts capturing logs from a specified Apple device
- `stop_app_device` - Stops an app running on a physical Apple device
- `stop_device_log_cap` - Stops an active Apple device log capture session
- `test_device` - Runs tests on a physical device using xcodebuild test

### 2. iOS Simulator Development (`simulator`) - 20 tools
**Purpose**: Simulator-based development, testing, and deployment

- `boot_sim` - Boots an iOS simulator (use open_sim() to make visible)
- `build_run_simulator` - Builds and runs an app on a simulator by UUID or name
- `build_simulator` - Builds an app for a specific simulator by UUID or name
- `clean` - Cleans build products for either a project or a workspace
- `describe_ui` - Gets entire view hierarchy with precise frame coordinates
- `discover_projs` - Scans a directory to find Xcode project and workspace files
- `get_app_bundle_id` - Extracts the bundle identifier from an app bundle
- `get_simulator_app_path` - Gets the app bundle path for a simulator by UUID or name
- `install_app_sim` - Installs an app in an iOS simulator
- `launch_app_logs_sim` - Launches an app in a simulator and captures its logs
- `launch_app_sim` - Launches an app in a simulator by UUID
- `launch_app_sim_name` - Launches an app in a simulator by name
- `list_schemes` - Lists available schemes for either a project or a workspace
- `list_sims` - Lists available iOS simulators with their UUIDs
- `open_sim` - Opens the iOS Simulator app
- `screenshot` - Captures screenshot for visual verification
- `show_build_settings` - Shows build settings from either a project or workspace
- `stop_app_sim` - Stops an app running in a simulator by UUID
- `stop_app_sim_name` - Stops an app running in a simulator by name
- `test_simulator` - Runs tests on a simulator by UUID or name

### 3. macOS Development (`macos`) - 11 tools
**Purpose**: Native macOS application development and testing

- `build_macos` - Builds a macOS app from a project or workspace
- `build_run_macos` - Builds and runs a macOS app in one step
- `clean` - Cleans build products for either a project or a workspace
- `discover_projs` - Scans a directory to find Xcode project and workspace files
- `get_mac_bundle_id` - Extracts the bundle identifier from a macOS app bundle
- `get_macos_app_path` - Gets the app bundle path for a macOS application
- `launch_mac_app` - Launches a macOS application
- `list_schemes` - Lists available schemes for either a project or a workspace
- `show_build_settings` - Shows build settings from either a project or workspace
- `stop_mac_app` - Stops a running macOS application
- `test_macos` - Runs tests for a macOS project or workspace

### 4. UI Testing & Automation (`ui-testing`) - 11 tools
**Purpose**: Automated UI interaction and testing

- `button` - Press hardware button on iOS simulator (home, lock, etc.)
- `describe_ui` - Gets view hierarchy with precise coordinates (use before interactions)
- `gesture` - Perform preset gestures (scroll, swipe-from-edge)
- `key_press` - Press a single key by keycode on the simulator
- `key_sequence` - Press key sequence using HID keycodes
- `long_press` - Long press at specific coordinates for given duration
- `screenshot` - Captures screenshot for visual verification
- `swipe` - Swipe from one point to another with timing control
- `tap` - Tap at specific coordinates with optional delays
- `touch` - Perform touch down/up events at specific coordinates
- `type_text` - Type text (supports US keyboard characters)

### 5. Simulator Management (`simulator-management`) - 7 tools
**Purpose**: Simulator environment and configuration management

- `boot_sim` - Boots an iOS simulator using its UUID
- `list_sims` - Lists available iOS simulators with their UUIDs
- `open_sim` - Opens the iOS Simulator app
- `reset_simulator_location` - Resets the simulator's location to default
- `set_sim_appearance` - Sets the appearance mode (dark/light) of a simulator
- `set_simulator_location` - Sets a custom GPS location for the simulator
- `sim_statusbar` - Sets the data network indicator in the status bar

### 6. Swift Package Manager (`swift-package`) - 6 tools (+1 utility)
**Purpose**: Swift Package development and testing

- `swift_package_build` - Builds a Swift Package with swift build
- `swift_package_clean` - Cleans Swift Package build artifacts
- `swift_package_list` - Lists currently running Swift Package processes
- `swift_package_run` - Runs an executable target from a Swift Package
- `swift_package_stop` - Stops a running Swift Package executable
- `swift_package_test` - Runs tests for a Swift Package

### 7. Project Discovery (`project-discovery`) - 5 tools
**Purpose**: Project analysis and information gathering

- `discover_projs` - Scans directory to find Xcode projects and workspaces
- `get_app_bundle_id` - Extracts bundle identifier from any Apple platform app
- `get_mac_bundle_id` - Extracts bundle identifier from macOS app bundle
- `list_schemes` - Lists available schemes for project or workspace
- `show_build_settings` - Shows build settings using xcodebuild

### 8. Logging & Monitoring (`logging`) - 4 tools
**Purpose**: Log capture and monitoring across platforms

- `start_device_log_cap` - Starts capturing logs from a physical device
- `start_sim_log_cap` - Starts capturing logs from a simulator
- `stop_device_log_cap` - Stops device log capture and returns logs
- `stop_sim_log_cap` - Stops simulator log capture and returns logs

### 9. Project Scaffolding (`project-scaffolding`) - 2 tools
**Purpose**: Create new projects from templates

- `scaffold_ios_project` - Scaffold a new iOS project with modern structure
- `scaffold_macos_project` - Scaffold a new macOS project with modern structure

### 10. Dynamic Tool Discovery (`discovery`) - 1 tool
**Purpose**: Intelligent workflow enablement based on task descriptions

- `discover_tools` - Analyzes natural language task to enable relevant workflows

### 11. System Doctor (`doctor`) - 1 tool
**Purpose**: System health checks and environment validation

- `doctor` - Provides comprehensive information about MCP server environment

### 12. Utilities (`utilities`) - 1 tool
**Purpose**: General utility operations

- `clean` - Cleans build products for either a project or a workspace

## Operating Modes

### Static Mode (Default)
All 61 tools are loaded and available immediately at startup. Provides complete access to the full toolset without restrictions.

**Configuration**: `XCODEBUILDMCP_DYNAMIC_TOOLS=false` or leave unset

### Dynamic Mode 
Only the `discover_tools` tool is available initially. Provide a natural language task description to intelligently enable relevant workflow groups on-demand.

**Configuration**: `XCODEBUILDMCP_DYNAMIC_TOOLS=true`

**Example**:
```javascript
discover_tools({ 
  task_description: "I need to build and test my iOS app on iPhone 16 simulator" 
})
// This enables the simulator workflow group with all related tools
```

## MCP Resources

For clients that support MCP resources, XcodeBuildMCP provides efficient URI-based data access:

| Resource URI | Description | Mirrors Tool |
|--------------|-------------|---------------|
| `xcodebuildmcp://simulators` | Available iOS simulators with UUIDs and states | `list_sims` |
| `xcodebuildmcp://devices` | Connected physical devices with UUIDs and status | `list_devices` |
| `xcodebuildmcp://doctor` | System health checks and environment validation | `doctor` |

## Tool Parameter Patterns

### Project/Workspace XOR Pattern
Tools that work with Xcode projects now accept EITHER parameter:
- `projectPath` - Path to .xcodeproj file
- `workspacePath` - Path to .xcworkspace file

**Example**:
```javascript
// Using project
build_simulator({ 
  projectPath: '/path/to/MyApp.xcodeproj',
  scheme: 'MyScheme',
  simulatorName: 'iPhone 16'
})

// Using workspace  
build_simulator({
  workspacePath: '/path/to/MyApp.xcworkspace', 
  scheme: 'MyScheme',
  simulatorName: 'iPhone 16'
})
```

### Simulator Identification XOR Pattern
Tools that target simulators accept EITHER:
- `simulatorId` - UUID from `list_sims`
- `simulatorName` - Human-readable name like "iPhone 16"

**Example**:
```javascript
// Using UUID
launch_app_sim({
  simulatorUuid: 'ABC123-DEF456',
  bundleId: 'com.example.MyApp'
})

// Using name (where supported)
build_simulator({
  projectPath: '/path/to/MyApp.xcodeproj',
  scheme: 'MyScheme', 
  simulatorName: 'iPhone 16'
})
```

## Common Workflows

### iOS Simulator Development
```bash
1. list_sims()                                    # Find available simulators
2. boot_sim({ simulatorUuid: 'UUID' })           # Boot the simulator
3. open_sim()                                     # Make simulator visible
4. build_simulator({ ... })                      # Build for simulator
5. install_app_sim({ ... })                      # Install the app
6. launch_app_sim({ ... })                       # Launch the app
7. describe_ui()                                  # Get UI hierarchy
8. tap({ x: 100, y: 200 })                       # Interact with UI
```

### Physical Device Testing
```bash
1. list_devices()                                 # Find connected devices
2. build_device({ ... })                         # Build for device
3. install_app_device({ ... })                   # Install on device
4. launch_app_device({ ... })                    # Launch the app
5. start_device_log_cap({ ... })                 # Capture logs
6. test_device({ ... })                          # Run tests
7. stop_device_log_cap({ ... })                  # Get captured logs
```

### Swift Package Development
```bash
1. swift_package_build({ packagePath: '...' })   # Build package
2. swift_package_test({ packagePath: '...' })    # Run tests
3. swift_package_run({ packagePath: '...' })     # Run executable
4. swift_package_list()                          # Check running processes
5. swift_package_stop({ pid: 12345 })           # Stop process
```

## Version History

### v1.11+ (Current)
- Unified project/workspace tools with XOR validation
- Consolidated simulator ID/name tools
- Reduced tool count from ~85 to 61
- Improved parameter descriptions for AI agents
- Added visibility hints for simulator tools

### v1.10
- Initial release with separate project/workspace tools
- ~85 individual tools across 15 workflow groups