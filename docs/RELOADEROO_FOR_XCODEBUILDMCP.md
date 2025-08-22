# Reloaderoo Usage Guide for XcodeBuildMCP

This guide explains how to use Reloaderoo for interacting with XcodeBuildMCP as a CLI to save context window space.

You can use this guide to prompt your agent, but providing the entire document will give you no actual benefits. You will end up using more context than just using MCP server directly. So it's recommended that you curate this document by removing the example commands that you don't need and just keeping the ones that are right for your project. You'll then want to keep this file within your project workspace and then include it in the context window when you need to interact your agent to use XcodeBuildMCP tools.

> [!IMPORTANT]
> Please remove this introduction before you prompt your agent with this file or any derrived version of it.

## Installation

Reloaderoo is available via npm and can be used with npx for universal compatibility.

```bash
# Use npx to run reloaderoo
npx reloaderoo@latest --help
```

**Example Tool Calls:**

### Dynamic Tool Discovery

- **`discover_tools`**: Analyzes a task description to enable relevant tools.
  ```bash
  npx reloaderoo@latest inspect call-tool discover_tools --params '{"task_description": "I want to build and run my iOS app on a simulator."}' -- node build/index.js
  ```

### iOS Device Development

- **`build_device`**: Builds an app for a physical device.
  ```bash
  npx reloaderoo@latest inspect call-tool build_device --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' -- node build/index.js
  ```
- **`get_device_app_path`**: Gets the `.app` bundle path for a device build.
  ```bash
  npx reloaderoo@latest inspect call-tool get_device_app_path --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' -- node build/index.js
  ```
- **`install_app_device`**: Installs an app on a physical device.
  ```bash
  npx reloaderoo@latest inspect call-tool install_app_device --params '{"deviceId": "DEVICE_UDID", "appPath": "/path/to/MyApp.app"}' -- node build/index.js
  ```
- **`launch_app_device`**: Launches an app on a physical device.
  ```bash
  npx reloaderoo@latest inspect call-tool launch_app_device --params '{"deviceId": "DEVICE_UDID", "bundleId": "com.example.MyApp"}' -- node build/index.js
  ```
- **`list_devices`**: Lists connected physical devices.
  ```bash
  npx reloaderoo@latest inspect call-tool list_devices --params '{}' -- node build/index.js
  ```
- **`stop_app_device`**: Stops an app on a physical device.
  ```bash
  npx reloaderoo@latest inspect call-tool stop_app_device --params '{"deviceId": "DEVICE_UDID", "processId": 12345}' -- node build/index.js
  ```
- **`test_device`**: Runs tests on a physical device.
  ```bash
  npx reloaderoo@latest inspect call-tool test_device --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "deviceId": "DEVICE_UDID"}' -- node build/index.js
  ```

### iOS Simulator Development

- **`boot_sim`**: Boots a simulator.
  ```bash
  npx reloaderoo@latest inspect call-tool boot_sim --params '{"simulatorUuid": "SIMULATOR_UUID"}' -- node build/index.js
  ```
- **`build_run_sim`**: Builds and runs an app on a simulator.
  ```bash
  npx reloaderoo@latest inspect call-tool build_run_sim --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "simulatorName": "iPhone 16"}' -- node build/index.js
  ```
- **`build_sim`**: Builds an app for a simulator.
  ```bash
  npx reloaderoo@latest inspect call-tool build_sim --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "simulatorName": "iPhone 16"}' -- node build/index.js
  ```
- **`get_sim_app_path`**: Gets the `.app` bundle path for a simulator build.
  ```bash
  npx reloaderoo@latest inspect call-tool get_sim_app_path --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "platform": "iOS Simulator", "simulatorName": "iPhone 16"}' -- node build/index.js
  ```
- **`install_app_sim`**: Installs an app on a simulator.
  ```bash
  npx reloaderoo@latest inspect call-tool install_app_sim --params '{"simulatorUuid": "SIMULATOR_UUID", "appPath": "/path/to/MyApp.app"}' -- node build/index.js
  ```
- **`launch_app_logs_sim`**: Launches an app on a simulator with log capture.
  ```bash
  npx reloaderoo@latest inspect call-tool launch_app_logs_sim --params '{"simulatorUuid": "SIMULATOR_UUID", "bundleId": "com.example.MyApp"}' -- node build/index.js
  ```
- **`launch_app_sim`**: Launches an app on a simulator.
  ```bash
  npx reloaderoo@latest inspect call-tool launch_app_sim --params '{"simulatorName": "iPhone 16", "bundleId": "com.example.MyApp"}' -- node build/index.js
  ```
- **`list_sims`**: Lists available simulators.
  ```bash
  npx reloaderoo@latest inspect call-tool list_sims --params '{}' -- node build/index.js
  ```
- **`open_sim`**: Opens the Simulator application.
  ```bash
  npx reloaderoo@latest inspect call-tool open_sim --params '{}' -- node build/index.js
  ```
- **`stop_app_sim`**: Stops an app on a simulator.
  ```bash
  npx reloaderoo@latest inspect call-tool stop_app_sim --params '{"simulatorName": "iPhone 16", "bundleId": "com.example.MyApp"}' -- node build/index.js
  ```
- **`test_sim`**: Runs tests on a simulator.
  ```bash
  npx reloaderoo@latest inspect call-tool test_sim --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "simulatorName": "iPhone 16"}' -- node build/index.js
  ```

### Log Capture & Management

- **`start_device_log_cap`**: Starts log capture for a physical device.
  ```bash
  npx reloaderoo@latest inspect call-tool start_device_log_cap --params '{"deviceId": "DEVICE_UDID", "bundleId": "com.example.MyApp"}' -- node build/index.js
  ```
- **`start_sim_log_cap`**: Starts log capture for a simulator.
  ```bash
  npx reloaderoo@latest inspect call-tool start_sim_log_cap --params '{"simulatorUuid": "SIMULATOR_UUID", "bundleId": "com.example.MyApp"}' -- node build/index.js
  ```
- **`stop_device_log_cap`**: Stops log capture for a physical device.
  ```bash
  npx reloaderoo@latest inspect call-tool stop_device_log_cap --params '{"logSessionId": "SESSION_ID"}' -- node build/index.js
  ```
- **`stop_sim_log_cap`**: Stops log capture for a simulator.
  ```bash
  npx reloaderoo@latest inspect call-tool stop_sim_log_cap --params '{"logSessionId": "SESSION_ID"}' -- node build/index.js
  ```

### macOS Development

- **`build_macos`**: Builds a macOS app.
  ```bash
  npx reloaderoo@latest inspect call-tool build_macos --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' -- node build/index.js
  ```
- **`build_run_macos`**: Builds and runs a macOS app.
  ```bash
  npx reloaderoo@latest inspect call-tool build_run_macos --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' -- node build/index.js
  ```
- **`get_mac_app_path`**: Gets the `.app` bundle path for a macOS build.
  ```bash
  npx reloaderoo@latest inspect call-tool get_mac_app_path --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' -- node build/index.js
  ```
- **`launch_mac_app`**: Launches a macOS app.
  ```bash
  npx reloaderoo@latest inspect call-tool launch_mac_app --params '{"appPath": "/Applications/Calculator.app"}' -- node build/index.js
  ```
- **`stop_mac_app`**: Stops a macOS app.
  ```bash
  npx reloaderoo@latest inspect call-tool stop_mac_app --params '{"appName": "Calculator"}' -- node build/index.js
  ```
- **`test_macos`**: Runs tests for a macOS project.
  ```bash
  npx reloaderoo@latest inspect call-tool test_macos --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' -- node build/index.js
  ```

### Project Discovery

- **`discover_projs`**: Discovers Xcode projects and workspaces.
  ```bash
  npx reloaderoo@latest inspect call-tool discover_projs --params '{"workspaceRoot": "/path/to/workspace"}' -- node build/index.js
  ```
- **`get_app_bundle_id`**: Gets an app's bundle identifier.
  ```bash
  npx reloaderoo@latest inspect call-tool get_app_bundle_id --params '{"appPath": "/path/to/MyApp.app"}' -- node build/index.js
  ```
- **`get_mac_bundle_id`**: Gets a macOS app's bundle identifier.
  ```bash
  npx reloaderoo@latest inspect call-tool get_mac_bundle_id --params '{"appPath": "/Applications/Calculator.app"}' -- node build/index.js
  ```
- **`list_schemes`**: Lists schemes in a project or workspace.
  ```bash
  npx reloaderoo@latest inspect call-tool list_schemes --params '{"projectPath": "/path/to/MyProject.xcodeproj"}' -- node build/index.js
  ```
- **`show_build_settings`**: Shows build settings for a scheme.
  ```bash
  npx reloaderoo@latest inspect call-tool show_build_settings --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' -- node build/index.js
  ```

### Project Scaffolding

- **`scaffold_ios_project`**: Scaffolds a new iOS project.
  ```bash
  npx reloaderoo@latest inspect call-tool scaffold_ios_project --params '{"projectName": "MyNewApp", "outputPath": "/path/to/projects"}' -- node build/index.js
  ```
- **`scaffold_macos_project`**: Scaffolds a new macOS project.
  ```bash
  npx reloaderoo@latest inspect call-tool scaffold_macos_project --params '{"projectName": "MyNewMacApp", "outputPath": "/path/to/projects"}' -- node build/index.js
  ```

### Project Utilities

- **`clean`**: Cleans build artifacts.
  ```bash
  # For a project
  npx reloaderoo@latest inspect call-tool clean --params '{"projectPath": "/path/to/MyProject.xcodeproj"}' -- node build/index.js
  # For a workspace
  npx reloaderoo@latest inspect call-tool clean --params '{"workspacePath": "/path/to/MyWorkspace.xcworkspace", "scheme": "MyScheme"}' -- node build/index.js
  ```

### Simulator Management

- **`reset_sim_location`**: Resets a simulator's location.
  ```bash
  npx reloaderoo@latest inspect call-tool reset_sim_location --params '{"simulatorUuid": "SIMULATOR_UUID"}' -- node build/index.js
  ```
- **`set_sim_appearance`**: Sets a simulator's appearance (dark/light mode).
  ```bash
  npx reloaderoo@latest inspect call-tool set_sim_appearance --params '{"simulatorUuid": "SIMULATOR_UUID", "mode": "dark"}' -- node build/index.js
  ```
- **`set_sim_location`**: Sets a simulator's GPS location.
  ```bash
  npx reloaderoo@latest inspect call-tool set_sim_location --params '{"simulatorUuid": "SIMULATOR_UUID", "latitude": 37.7749, "longitude": -122.4194}' -- node build/index.js
  ```
- **`sim_statusbar`**: Overrides a simulator's status bar.
  ```bash
  npx reloaderoo@latest inspect call-tool sim_statusbar --params '{"simulatorUuid": "SIMULATOR_UUID", "dataNetwork": "wifi"}' -- node build/index.js
  ```

### Swift Package Manager

- **`swift_package_build`**: Builds a Swift package.
  ```bash
  npx reloaderoo@latest inspect call-tool swift_package_build --params '{"packagePath": "/path/to/package"}' -- node build/index.js
  ```
- **`swift_package_clean`**: Cleans a Swift package.
  ```bash
  npx reloaderoo@latest inspect call-tool swift_package_clean --params '{"packagePath": "/path/to/package"}' -- node build/index.js
  ```
- **`swift_package_list`**: Lists running Swift package processes.
  ```bash
  npx reloaderoo@latest inspect call-tool swift_package_list --params '{}' -- node build/index.js
  ```
- **`swift_package_run`**: Runs a Swift package executable.
  ```bash
  npx reloaderoo@latest inspect call-tool swift_package_run --params '{"packagePath": "/path/to/package"}' -- node build/index.js
  ```
- **`swift_package_stop`**: Stops a running Swift package process.
  ```bash
  npx reloaderoo@latest inspect call-tool swift_package_stop --params '{"pid": 12345}' -- node build/index.js
  ```
- **`swift_package_test`**: Tests a Swift package.
  ```bash
  npx reloaderoo@latest inspect call-tool swift_package_test --params '{"packagePath": "/path/to/package"}' -- node build/index.js
  ```

### System Doctor

- **`doctor`**: Runs system diagnostics.
  ```bash
  npx reloaderoo@latest inspect call-tool doctor --params '{}' -- node build/index.js
  ```

### UI Testing & Automation

- **`button`**: Simulates a hardware button press.
  ```bash
  npx reloaderoo@latest inspect call-tool button --params '{"simulatorUuid": "SIMULATOR_UUID", "buttonType": "home"}' -- node build/index.js
  ```
- **`describe_ui`**: Gets the UI hierarchy of the current screen.
  ```bash
  npx reloaderoo@latest inspect call-tool describe_ui --params '{"simulatorUuid": "SIMULATOR_UUID"}' -- node build/index.js
  ```
- **`gesture`**: Performs a pre-defined gesture.
  ```bash
  npx reloaderoo@latest inspect call-tool gesture --params '{"simulatorUuid": "SIMULATOR_UUID", "preset": "scroll-up"}' -- node build/index.js
  ```
- **`key_press`**: Simulates a key press.
  ```bash
  npx reloaderoo@latest inspect call-tool key_press --params '{"simulatorUuid": "SIMULATOR_UUID", "keyCode": 40}' -- node build/index.js
  ```
- **`key_sequence`**: Simulates a sequence of key presses.
  ```bash
  npx reloaderoo@latest inspect call-tool key_sequence --params '{"simulatorUuid": "SIMULATOR_UUID", "keyCodes": [40, 42, 44]}' -- node build/index.js
  ```
- **`long_press`**: Performs a long press at coordinates.
  ```bash
  npx reloaderoo@latest inspect call-tool long_press --params '{"simulatorUuid": "SIMULATOR_UUID", "x": 100, "y": 200, "duration": 1500}' -- node build/index.js
  ```
- **`screenshot`**: Takes a screenshot.
  ```bash
  npx reloaderoo@latest inspect call-tool screenshot --params '{"simulatorUuid": "SIMULATOR_UUID"}' -- node build/index.js
  ```
- **`swipe`**: Performs a swipe gesture.
  ```bash
  npx reloaderoo@latest inspect call-tool swipe --params '{"simulatorUuid": "SIMULATOR_UUID", "x1": 100, "y1": 200, "x2": 100, "y2": 400}' -- node build/index.js
  ```
- **`tap`**: Performs a tap at coordinates.
  ```bash
  npx reloaderoo@latest inspect call-tool tap --params '{"simulatorUuid": "SIMULATOR_UUID", "x": 100, "y": 200}' -- node build/index.js
  ```
- **`touch`**: Simulates a touch down or up event.
  ```bash
  npx reloaderoo@latest inspect call-tool touch --params '{"simulatorUuid": "SIMULATOR_UUID", "x": 100, "y": 200, "down": true}' -- node build/index.js
  ```
- **`type_text`**: Types text into the focused element.
  ```bash
  npx reloaderoo@latest inspect call-tool type_text --params '{"simulatorUuid": "SIMULATOR_UUID", "text": "Hello, World!"}' -- node build/index.js
  ```

### Resources

- **Read devices resource**:
  ```bash
  npx reloaderoo@latest inspect read-resource "xcodebuildmcp://devices" -- node build/index.js
  ```
- **Read simulators resource**:
  ```bash
  npx reloaderoo@latest inspect read-resource "xcodebuildmcp://simulators" -- node build/index.js
  ```
- **Read doctor resource**:
  ```bash
  npx reloaderoo@latest inspect read-resource "xcodebuildmcp://doctor" -- node build/index.js
  ```
