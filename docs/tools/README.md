# XcodeBuildMCP Tools Documentation

This directory contains documentation for all the tools available in XcodeBuildMCP.

## Tool Categories

- [macOS Build Tools](./build_macos.md) - Tools for building and running macOS applications
- [iOS Simulator Build Tools](./build_ios_simulator.md) - Tools for building and running iOS applications in simulators
- [iOS Device Build Tools](./build_ios_device.md) - Tools for building iOS applications for physical devices
- [App Path Tools](./app_path.md) - Tools for retrieving app bundle paths
- [Build Settings and Scheme Tools](./build_settings.md) - Tools for viewing build settings and listing schemes

## Tool Naming Convention

All tools in XcodeBuildMCP follow a consistent snake_case naming convention. This makes them more predictable and easier to use.

## Common Parameters

Most tools accept the following common parameters:

- `workspacePath` or `projectPath` - Path to the Xcode workspace or project file
- `scheme` - The scheme to build or use
- `configuration` - Build configuration (Debug, Release, etc.), defaults to "Debug"

## Empty Object Requirement

Some tools require an empty object `{}` to be passed even when no parameters are needed. This is due to the MCP protocol requirements. The tool descriptions explicitly mention this requirement when applicable.

## Next Steps Guidance

Most tool responses include "Next Steps" guidance that suggests which tools to use next in your workflow. This helps create a seamless development experience by connecting different tools together.

## Platform-Specific Approach

XcodeBuildMCP uses a platform-specific approach for all tools, with separate tools for each platform (macOS, iOS Simulator, iOS Device) rather than a single tool with conditional parameters. This makes it easier to use the tools correctly.

## Error Handling

All tools provide clear error messages when something goes wrong, helping you quickly identify and fix issues in your workflow.
