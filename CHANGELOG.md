# Changelog

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
