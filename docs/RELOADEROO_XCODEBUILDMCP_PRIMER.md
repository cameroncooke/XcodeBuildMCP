# Reloaderoo + XcodeBuildMCP: Curated CLI Primer

Use this primer to drive XcodeBuildMCP entirely through Reloaderoo—treating it like a CLI. It is designed to be included in your agent’s context to show exactly how to invoke the specific tools your project needs.

Why this file:
- XcodeBuildMCP exposes many tools. Dumping the full tool surface into the context wastes tokens.
- Instead, copy this file into your project and delete everything you don’t need. Keep only the commands relevant to your workflow (e.g., just Simulator tools).
- Your trimmed version becomes a small, project‑specific reference that tells your agent precisely which Reloaderoo tool calls to make.

How to use this primer:
1. Copy this file into your repo (e.g., docs/xcodebuildmcp_primer.md or AGENTS.md).
2. Remove all sections and commands you don’t use. Keep it minimal.
3. Replace placeholders with your real values (paths, schemes, simulator UUIDs/Names, bundle IDs, etc.).
4. Use the quiet (-q) examples to reduce noise; pipe output to jq when you only need the content.
5. Include your curated file in the agent context whenever you want it to call XcodeBuildMCP via Reloaderoo.

Conventions in the examples:
- Calls use: npx reloaderoo@latest inspect … -q -- npx xcodebuildmcp@latest
- Parameters are passed as JSON via --params.
- Resources are read with read-resource (e.g., xcodebuildmcp://simulators).
- Use jq -r '.contents[].text' to extract the textual results when needed.

Keep it small. The smaller your curated primer, the less context your agent needs—and the cheaper, faster, and more reliable your interactions will be.

## Installation

Reloaderoo is available via npm and can be used with npx for universal compatibility.

```bash
# Use npx to run reloaderoo
npx reloaderoo@latest --help
```

## Hint

Use jq to parse the output to get just the content response:

```bash
 npx reloaderoo@latest inspect read-resource "xcodebuildmcp://simulators" -q -- npx xcodebuildmcp@latest | jq -r '.contents[].text'
 ```

**Example Tool Calls:**

## Dynamic Tool Discovery

- **`discover_tools`**: Analyzes a task description to enable relevant tools.
  ```bash
  npx reloaderoo@latest inspect call-tool discover_tools --params '{"task_description": "I want to build and run my iOS app on a simulator."}' -q -- npx xcodebuildmcp@latest
  ```

## iOS Device Development

- **`build_device`**: Builds an app for a physical device (iOS, visionOS, watchOS, tvOS).
  ```bash
  # iOS device (default)
  npx reloaderoo@latest inspect -q call-tool build_device --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' -q -- npx xcodebuildmcp@latest

  # visionOS device
  npx reloaderoo@latest inspect -q call-tool build_device --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "platform": "visionOS"}' -q -- npx xcodebuildmcp@latest
  ```
- **`get_device_app_path`**: Gets the `.app` bundle path for a device build.
  ```bash
  npx reloaderoo@latest inspect call-tool get_device_app_path --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' -q -- npx xcodebuildmcp@latest
  ```
- **`install_app_device`**: Installs an app on a physical device.
  ```bash
  npx reloaderoo@latest inspect call-tool install_app_device --params '{"deviceId": "DEVICE_UDID", "appPath": "/path/to/MyApp.app"}' -q -- npx xcodebuildmcp@latest
  ```
- **`launch_app_device`**: Launches an app on a physical device.
  ```bash
  npx reloaderoo@latest inspect call-tool launch_app_device --params '{"deviceId": "DEVICE_UDID", "bundleId": "com.example.MyApp"}' -q -- npx xcodebuildmcp@latest
  ```
- **`list_devices`**: Lists connected physical devices.
  ```bash
  npx reloaderoo@latest inspect call-tool list_devices --params '{}' -q -- npx xcodebuildmcp@latest
  ```
- **`stop_app_device`**: Stops an app on a physical device.
  ```bash
  npx reloaderoo@latest inspect call-tool stop_app_device --params '{"deviceId": "DEVICE_UDID", "processId": 12345}' -q -- npx xcodebuildmcp@latest
  ```
- **`test_device`**: Runs tests on a physical device.
  ```bash
  npx reloaderoo@latest inspect call-tool test_device --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "deviceId": "DEVICE_UDID"}' -q -- npx xcodebuildmcp@latest
  ```

## iOS Simulator Development

- **`boot_sim`**: Boots a simulator.
  ```bash
  npx reloaderoo@latest inspect call-tool boot_sim --params '{"simulatorUuid": "SIMULATOR_UUID"}' -q -- npx xcodebuildmcp@latest
  ```
- **`build_run_sim`**: Builds and runs an app on a simulator.
  ```bash
  npx reloaderoo@latest inspect call-tool build_run_sim --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "simulatorName": "iPhone 16"}' -q -- npx xcodebuildmcp@latest
  ```
- **`build_sim`**: Builds an app for a simulator.
  ```bash
  npx reloaderoo@latest inspect call-tool build_sim --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "simulatorName": "iPhone 16"}' -q -- npx xcodebuildmcp@latest
  ```
- **`get_sim_app_path`**: Gets the `.app` bundle path for a simulator build.
  ```bash
  npx reloaderoo@latest inspect call-tool get_sim_app_path --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "platform": "iOS Simulator", "simulatorName": "iPhone 16"}' -q -- npx xcodebuildmcp@latest
  ```
- **`install_app_sim`**: Installs an app on a simulator.
  ```bash
  npx reloaderoo@latest inspect call-tool install_app_sim --params '{"simulatorUuid": "SIMULATOR_UUID", "appPath": "/path/to/MyApp.app"}' -q -- npx xcodebuildmcp@latest
  ```
- **`launch_app_logs_sim`**: Launches an app on a simulator with log capture.
  ```bash
  npx reloaderoo@latest inspect call-tool launch_app_logs_sim --params '{"simulatorUuid": "SIMULATOR_UUID", "bundleId": "com.example.MyApp"}' -q -- npx xcodebuildmcp@latest
  ```
- **`launch_app_sim`**: Launches an app on a simulator.
  ```bash
  npx reloaderoo@latest inspect call-tool launch_app_sim --params '{"simulatorName": "iPhone 16", "bundleId": "com.example.MyApp"}' -q -- npx xcodebuildmcp@latest
  ```
- **`list_sims`**: Lists available simulators.
  ```bash
  npx reloaderoo@latest inspect call-tool list_sims --params '{}' -q -- npx xcodebuildmcp@latest
  ```
- **`open_sim`**: Opens the Simulator application.
  ```bash
  npx reloaderoo@latest inspect call-tool open_sim --params '{}' -q -- npx xcodebuildmcp@latest
  ```
- **`stop_app_sim`**: Stops an app on a simulator.
  ```bash
  npx reloaderoo@latest inspect call-tool stop_app_sim --params '{"simulatorName": "iPhone 16", "bundleId": "com.example.MyApp"}' -q -- npx xcodebuildmcp@latest
  ```
- **`test_sim`**: Runs tests on a simulator.
  ```bash
  npx reloaderoo@latest inspect call-tool test_sim --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme", "simulatorName": "iPhone 16"}' -q -- npx xcodebuildmcp@latest
  ```

## Log Capture & Management

- **`start_device_log_cap`**: Starts log capture for a physical device.
  ```bash
  npx reloaderoo@latest inspect call-tool start_device_log_cap --params '{"deviceId": "DEVICE_UDID", "bundleId": "com.example.MyApp"}' -q -- npx xcodebuildmcp@latest
  ```
- **`start_sim_log_cap`**: Starts log capture for a simulator.
  ```bash
  npx reloaderoo@latest inspect call-tool start_sim_log_cap --params '{"simulatorUuid": "SIMULATOR_UUID", "bundleId": "com.example.MyApp"}' -q -- npx xcodebuildmcp@latest
  ```
- **`stop_device_log_cap`**: Stops log capture for a physical device.
  ```bash
  npx reloaderoo@latest inspect call-tool stop_device_log_cap --params '{"logSessionId": "SESSION_ID"}' -q -- npx xcodebuildmcp@latest
  ```
- **`stop_sim_log_cap`**: Stops log capture for a simulator.
  ```bash
  npx reloaderoo@latest inspect call-tool stop_sim_log_cap --params '{"logSessionId": "SESSION_ID"}' -q -- npx xcodebuildmcp@latest
  ```

## macOS Development

- **`build_macos`**: Builds a macOS app.
  ```bash
  npx reloaderoo@latest inspect call-tool build_macos --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' -q -- npx xcodebuildmcp@latest
  ```
- **`build_run_macos`**: Builds and runs a macOS app.
  ```bash
  npx reloaderoo@latest inspect call-tool build_run_macos --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' -q -- npx xcodebuildmcp@latest
  ```
- **`get_mac_app_path`**: Gets the `.app` bundle path for a macOS build.
  ```bash
  npx reloaderoo@latest inspect call-tool get_mac_app_path --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' -q -- npx xcodebuildmcp@latest
  ```
- **`launch_mac_app`**: Launches a macOS app.
  ```bash
  npx reloaderoo@latest inspect call-tool launch_mac_app --params '{"appPath": "/Applications/Calculator.app"}' -q -- npx xcodebuildmcp@latest
  ```
- **`stop_mac_app`**: Stops a macOS app.
  ```bash
  npx reloaderoo@latest inspect call-tool stop_mac_app --params '{"appName": "Calculator"}' -q -- npx xcodebuildmcp@latest
  ```
- **`test_macos`**: Runs tests for a macOS project.
  ```bash
  npx reloaderoo@latest inspect call-tool test_macos --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' -q -- npx xcodebuildmcp@latest
  ```

## Project Discovery

- **`discover_projs`**: Discovers Xcode projects and workspaces.
  ```bash
  npx reloaderoo@latest inspect call-tool discover_projs --params '{"workspaceRoot": "/path/to/workspace"}' -q -- npx xcodebuildmcp@latest
  ```
- **`get_app_bundle_id`**: Gets an app's bundle identifier.
  ```bash
  npx reloaderoo@latest inspect call-tool get_app_bundle_id --params '{"appPath": "/path/to/MyApp.app"}' -q -- npx xcodebuildmcp@latest
  ```
- **`get_mac_bundle_id`**: Gets a macOS app's bundle identifier.
  ```bash
  npx reloaderoo@latest inspect call-tool get_mac_bundle_id --params '{"appPath": "/Applications/Calculator.app"}' -q -- npx xcodebuildmcp@latest
  ```
- **`list_schemes`**: Lists schemes in a project or workspace.
  ```bash
  npx reloaderoo@latest inspect call-tool list_schemes --params '{"projectPath": "/path/to/MyProject.xcodeproj"}' -q -- npx xcodebuildmcp@latest
  ```
- **`show_build_settings`**: Shows build settings for a scheme.
  ```bash
  npx reloaderoo@latest inspect call-tool show_build_settings --params '{"projectPath": "/path/to/MyProject.xcodeproj", "scheme": "MyScheme"}' -q -- npx xcodebuildmcp@latest
  ```

## Project Scaffolding

- **`scaffold_ios_project`**: Scaffolds a new iOS project.
  ```bash
  npx reloaderoo@latest inspect call-tool scaffold_ios_project --params '{"projectName": "MyNewApp", "outputPath": "/path/to/projects"}' -q -- npx xcodebuildmcp@latest
  ```
- **`scaffold_macos_project`**: Scaffolds a new macOS project.
  ```bash
  npx reloaderoo@latest inspect call-tool scaffold_macos_project --params '{"projectName": "MyNewMacApp", "outputPath": "/path/to/projects"}' -q -- npx xcodebuildmcp@latest
  ```

## Project Utilities

- **`clean`**: Cleans build artifacts.
  ```bash
  # For a project
  npx reloaderoo@latest inspect call-tool clean --params '{"projectPath": "/path/to/MyProject.xcodeproj"}' -q -- npx xcodebuildmcp@latest
  # For a workspace
  npx reloaderoo@latest inspect call-tool clean --params '{"workspacePath": "/path/to/MyWorkspace.xcworkspace", "scheme": "MyScheme"}' -q -- npx xcodebuildmcp@latest
  ```

## Simulator Management

- **`reset_sim_location`**: Resets a simulator's location.
  ```bash
  npx reloaderoo@latest inspect call-tool reset_sim_location --params '{"simulatorUuid": "SIMULATOR_UUID"}' -q -- npx xcodebuildmcp@latest
  ```
- **`set_sim_appearance`**: Sets a simulator's appearance (dark/light mode).
  ```bash
  npx reloaderoo@latest inspect call-tool set_sim_appearance --params '{"simulatorUuid": "SIMULATOR_UUID", "mode": "dark"}' -q -- npx xcodebuildmcp@latest
  ```
- **`set_sim_location`**: Sets a simulator's GPS location.
  ```bash
  npx reloaderoo@latest inspect call-tool set_sim_location --params '{"simulatorUuid": "SIMULATOR_UUID", "latitude": 37.7749, "longitude": -122.4194}' -q -- npx xcodebuildmcp@latest
  ```
- **`sim_statusbar`**: Overrides a simulator's status bar.
  ```bash
  npx reloaderoo@latest inspect call-tool sim_statusbar --params '{"simulatorUuid": "SIMULATOR_UUID", "dataNetwork": "wifi"}' -q -- npx xcodebuildmcp@latest
  ```

## Swift Package Manager

- **`swift_package_build`**: Builds a Swift package.
  ```bash
  npx reloaderoo@latest inspect call-tool swift_package_build --params '{"packagePath": "/path/to/package"}' -q -- npx xcodebuildmcp@latest
  ```
- **`swift_package_clean`**: Cleans a Swift package.
  ```bash
  npx reloaderoo@latest inspect call-tool swift_package_clean --params '{"packagePath": "/path/to/package"}' -q -- npx xcodebuildmcp@latest
  ```
- **`swift_package_list`**: Lists running Swift package processes.
  ```bash
  npx reloaderoo@latest inspect call-tool swift_package_list --params '{}' -q -- npx xcodebuildmcp@latest
  ```
- **`swift_package_run`**: Runs a Swift package executable.
  ```bash
  npx reloaderoo@latest inspect call-tool swift_package_run --params '{"packagePath": "/path/to/package"}' -q -- npx xcodebuildmcp@latest
  ```
- **`swift_package_stop`**: Stops a running Swift package process.
  ```bash
  npx reloaderoo@latest inspect call-tool swift_package_stop --params '{"pid": 12345}' -q -- npx xcodebuildmcp@latest
  ```
- **`swift_package_test`**: Tests a Swift package.
  ```bash
  npx reloaderoo@latest inspect call-tool swift_package_test --params '{"packagePath": "/path/to/package"}' -q -- npx xcodebuildmcp@latest
  ```

## System Doctor

- **`doctor`**: Runs system diagnostics.
  ```bash
  npx reloaderoo@latest inspect call-tool doctor --params '{}' -q -- npx xcodebuildmcp@latest
  ```

## UI Testing & Automation

- **`button`**: Simulates a hardware button press.
  ```bash
  npx reloaderoo@latest inspect call-tool button --params '{"simulatorUuid": "SIMULATOR_UUID", "buttonType": "home"}' -q -- npx xcodebuildmcp@latest
  ```
- **`describe_ui`**: Gets the UI hierarchy of the current screen.
  ```bash
  npx reloaderoo@latest inspect call-tool describe_ui --params '{"simulatorUuid": "SIMULATOR_UUID"}' -q -- npx xcodebuildmcp@latest
  ```
- **`gesture`**: Performs a pre-defined gesture.
  ```bash
  npx reloaderoo@latest inspect call-tool gesture --params '{"simulatorUuid": "SIMULATOR_UUID", "preset": "scroll-up"}' -q -- npx xcodebuildmcp@latest
  ```
- **`key_press`**: Simulates a key press.
  ```bash
  npx reloaderoo@latest inspect call-tool key_press --params '{"simulatorUuid": "SIMULATOR_UUID", "keyCode": 40}' -q -- npx xcodebuildmcp@latest
  ```
- **`key_sequence`**: Simulates a sequence of key presses.
  ```bash
  npx reloaderoo@latest inspect call-tool key_sequence --params '{"simulatorUuid": "SIMULATOR_UUID", "keyCodes": [40, 42, 44]}' -q -- npx xcodebuildmcp@latest
  ```
- **`long_press`**: Performs a long press at coordinates.
  ```bash
  npx reloaderoo@latest inspect call-tool long_press --params '{"simulatorUuid": "SIMULATOR_UUID", "x": 100, "y": 200, "duration": 1500}' -q -- npx xcodebuildmcp@latest
  ```
- **`screenshot`**: Takes a screenshot.
  ```bash
  npx reloaderoo@latest inspect call-tool screenshot --params '{"simulatorUuid": "SIMULATOR_UUID"}' -q -- npx xcodebuildmcp@latest
  ```
- **`swipe`**: Performs a swipe gesture.
  ```bash
  npx reloaderoo@latest inspect call-tool swipe --params '{"simulatorUuid": "SIMULATOR_UUID", "x1": 100, "y1": 200, "x2": 100, "y2": 400}' -q -- npx xcodebuildmcp@latest
  ```
- **`tap`**: Performs a tap at coordinates.
  ```bash
  npx reloaderoo@latest inspect call-tool tap --params '{"simulatorUuid": "SIMULATOR_UUID", "x": 100, "y": 200}' -q -- npx xcodebuildmcp@latest
  ```
- **`touch`**: Simulates a touch down or up event.
  ```bash
  npx reloaderoo@latest inspect call-tool touch --params '{"simulatorUuid": "SIMULATOR_UUID", "x": 100, "y": 200, "down": true}' -q -- npx xcodebuildmcp@latest
  ```
- **`type_text`**: Types text into the focused element.
  ```bash
  npx reloaderoo@latest inspect call-tool type_text --params '{"simulatorUuid": "SIMULATOR_UUID", "text": "Hello, World!"}' -q -- npx xcodebuildmcp@latest
  ```

## Resources

- **Read devices resource**:
  ```bash
  npx reloaderoo@latest inspect read-resource "xcodebuildmcp://devices" -q -- npx xcodebuildmcp@latest
  ```
- **Read simulators resource**:
  ```bash
  npx reloaderoo@latest inspect read-resource "xcodebuildmcp://simulators" -q -- npx xcodebuildmcp@latest
  ```
- **Read doctor resource**:
  ```bash
  npx reloaderoo@latest inspect read-resource "xcodebuildmcp://doctor" -q -- npx xcodebuildmcp@latest
  ```
