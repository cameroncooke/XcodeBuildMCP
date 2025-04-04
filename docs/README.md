# XcodeBuildMCP Documentation

XcodeBuildMCP is a ModelContextProtocol server that provides tools for Xcode project management, simulator management, and app utilities.

## Overview

This documentation provides detailed information about the tools available in XcodeBuildMCP and how to use them effectively.

## Tool Categories

- [Build Tools](./tools/README.md) - Tools for building and running Xcode projects
  - [macOS Build Tools](./tools/build_macos.md)
  - [iOS Simulator Build Tools](./tools/build_ios_simulator.md)
  - [iOS Device Build Tools](./tools/build_ios_device.md)
  - [App Path Tools](./tools/app_path.md)
  - [Build Settings and Scheme Tools](./tools/build_settings.md)

## Project Structure

XcodeBuildMCP follows a modular architecture with the following structure:

```
src/
├── index.ts                # Main entry point
├── server/                 # MCP server implementation
├── tools/                  # Tool implementations
│   ├── app_path.ts         # App path retrieval tools
│   ├── build_ios_device.ts # iOS device build tools
│   ├── build_ios_simulator.ts # iOS simulator build tools
│   ├── build_macos.ts      # macOS build tools
│   ├── build_settings.ts   # Build settings and scheme tools
│   ├── bundleId.ts         # Bundle ID extraction tools
│   ├── clean.ts            # Project cleaning tools
│   ├── common.ts           # Common types and utilities
│   └── simulator.ts        # Simulator management tools
├── types/                  # TypeScript type definitions
│   └── common.ts           # Common type interfaces
└── utils/                  # Utility functions
    ├── logger.ts           # Logging utilities
    ├── validation.ts       # Parameter validation utilities
    └── xcode.ts            # Xcode command utilities
```

## Installation

```bash
# Install globally
npm install -g xcodebuildmcp

# Or use with npx
npx xcodebuildmcp

# Or use with mise
mise x xcodebuildmcp
```

## Usage

XcodeBuildMCP provides a ModelContextProtocol server that can be used by MCP clients to interact with Xcode projects and simulators.

### Example Workflows

#### Building and Running a macOS App

```javascript
// List available schemes
list_schemes_workspace({ workspacePath: '/path/to/MyProject.xcworkspace' })

// Build the app
macos_build_workspace({ 
  workspacePath: '/path/to/MyProject.xcworkspace', 
  scheme: 'MyScheme' 
})

// Get the app path
get_app_path_for_device_workspace({ 
  workspacePath: '/path/to/MyProject.xcworkspace', 
  scheme: 'MyScheme', 
  platform: 'macOS' 
})

// Launch the app
launch_macos_app({ appPath: '/path/to/build/Debug/MyApp.app' })
```

#### Building and Running an iOS App in Simulator

```javascript
// List available simulators
list_simulators({})

// Build and run in one step
ios_simulator_build_and_run_by_name_workspace({
  workspacePath: '/path/to/MyProject.xcworkspace',
  scheme: 'MyScheme',
  simulatorName: 'iPhone 16'
})
```

## Contributing

See the [CONTRIBUTING.md](../CONTRIBUTING.md) file for details on how to contribute to XcodeBuildMCP.

## License

XcodeBuildMCP is licensed under the MIT License. See the [LICENSE](../LICENSE) file for details.
