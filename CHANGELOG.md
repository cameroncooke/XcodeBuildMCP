# Changelog

## [Unreleased]
### Added
- **Selective Workflow Loading**: New `XCODEBUILDMCP_ENABLED_WORKFLOWS` environment variable allows loading only specific workflow groups in static mode, reducing context window usage for clients that don't support MCP sampling

## [v1.11.2] - 2025-08-08
- Fixed "registerTools is not a function" errors during package upgrades

## [v1.11.1] - 2025-08-07
- Improved tool discovery to be more accurate and context-aware

## [v1.11.0] - 2025-08-07
- Major refactor/rewrite to improve code quality and maintainability in preparation for future development
- Added support for dynamic tools (VSCode only for now)
- Added support for MCP Resources (devices, simulators, environment info)
- Workaround for https://github.com/cameroncooke/XcodeBuildMCP/issues/66 and https://github.com/anthropics/claude-code/issues/1804 issues where Claude Code would only see the first text content from tool responses

## [v1.10.0] - 2025-06-10
### Added
- **App Lifecycle Management**: New tools for stopping running applications
  - `stop_app_device`: Stop apps running on physical Apple devices (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro)
  - `stop_app_sim`: Stop apps running on iOS/watchOS/tvOS/visionOS simulators
  - `stop_mac_app`: Stop macOS applications by name or process ID
- **Enhanced Launch Tools**: Device launch tools now return process IDs for better app management
- **Bundled AXe Distribution**: AXe binary and frameworks now included in npm package for zero-setup UI automation

### Fixed
- **WiFi Device Detection**: Improved detection of Apple devices connected over WiFi networks
- **Device Connectivity**: Better handling of paired devices with different connection states

### Improved
- **Simplified Installation**: No separate AXe installation required - everything works out of the box

## [v1.9.0] - 2025-06-09
- Added support for hardware devices over USB and Wi-Fi
- New tools for Apple device deployment:
  - `install_app_device`
  - `launch_app_device`
- Updated all simulator and device tools to be platform-agnostic, supporting all Apple platforms (iOS, iPadOS, watchOS, tvOS, visionOS)
- Changed `get_ios_bundle_id` to `get_app_bundle_id` with support for all Apple platforms

## [v1.8.0] - 2025-06-07
- Added support for running tests on macOS, iOS simulators, and iOS devices
- New tools for testing:
  - `test_macos_workspace`
  - `test_macos_project`
  - `test_ios_simulator_name_workspace`
  - `test_ios_simulator_name_project`
  - `test_ios_simulator_id_workspace`
  - `test_ios_simulator_id_project`
  - `test_ios_device_workspace`
  - `test_ios_device_project`

## [v1.7.0] - 2025-06-04
- Added support for Swift Package Manager (SPM)
- New tools for Swift Package Manager:
  - `swift_package_build`
  - `swift_package_clean`
  - `swift_package_test`
  - `swift_package_run`
  - `swift_package_list`
  - `swift_package_stop`

## [v1.6.1] - 2025-06-03
- Improve UI tool hints

## [v1.6.0] - 2025-06-03
- Moved project templates to external GitHub repositories for independent versioning
- Added support for downloading templates from GitHub releases
- Added local template override support via environment variables
- Added `scaffold_ios_project` and `scaffold_macos_project` tools for creating new projects
- Centralized template version management in package.json for easier updates

## [v1.5.0] - 2025-06-01
- UI automation is no longer in beta!
- Added support for AXe UI automation
- Revised default installation instructions to prefer npx instead of mise

## [v1.4.0] - 2025-05-11
- Merge the incremental build beta branch into main
- Add preferXcodebuild argument to build tools with improved error handling allowing the agent to force the use of xcodebuild over xcodemake for complex projects. It also adds a hint when incremental builds fail due to non-compiler errors, enabling the agent to automatically switch to xcodebuild for a recovery build attempt, improving reliability.

## [v1.3.7] - 2025-05-08
- Fix Claude Code issue due to long tool names

## [v1.4.0-beta.3] - 2025-05-07
- Fixed issue where incremental builds would only work for "Debug" build configurations
- 
## [v1.4.0-beta.2] - 2025-05-07
- Same as beta 1 but has the latest features from the main release channel

## [v1.4.0-beta.1] - 2025-05-05
- Added experimental support for incremental builds (requires opt-in)

## [v1.3.6] - 2025-05-07
- Added support for enabling/disabling tools via environment variables

## [v1.3.5] - 2025-05-05
- Fixed the text input UI automation tool
- Improve the UI automation tool hints to reduce agent tool call errors
- Improved the project discovery tool to reduce agent tool call errors
- Added instructions for installing idb client manually

## [v1.3.4] - 2025-05-04
- Improved Sentry integration

## [v1.3.3] - 2025-05-04
- Added Sentry opt-out functionality

## [v1.3.1] - 2025-05-03
- Added Sentry integration for error reporting

## [v1.3.0] - 2025-04-28

- Added support for interacting with the simulator (tap, swipe etc.)
- Added support for capturing simulator screenshots

Please note that the UI automation features are an early preview and currently in beta your mileage may vary.

## [v1.2.4] - 2025-04-24
- Improved xcodebuild reporting of warnings and errors in tool response
- Refactor build utils and remove redundant code

## [v1.2.3] - 2025-04-23
- Added support for skipping macro validation

## [v1.2.2] - 2025-04-23
- Improved log readability with version information for easier debugging
- Enhanced overall stability and performance

## [v1.2.1] - 2025-04-23
- General stability improvements and bug fixes

## [v1.2.0] - 2025-04-14
### Added
- New simulator log capture feature: Easily view and debug your app's logs while running in the simulator
- Automatic project discovery: XcodeBuildMCP now finds your Xcode projects and workspaces automatically
- Support for both Intel and Apple Silicon Macs in macOS builds

### Improved
- Cleaner, more readable build output with better error messages
- Faster build times and more reliable build process
- Enhanced documentation with clearer usage examples

## [v1.1.0] - 2025-04-05
### Added
- Real-time build progress reporting
- Separate tools for iOS and macOS builds
- Better workspace and project support

### Improved
- Simplified build commands with better parameter handling
- More reliable clean operations for both projects and workspaces

## [v1.0.2] - 2025-04-02
- Improved documentation with better examples and clearer instructions
- Easier version tracking for compatibility checks

## [v1.0.1] - 2025-04-02
- Initial release of XcodeBuildMCP
- Basic support for building iOS and macOS applications
