# iOS Simulator Build Tools

This document describes the iOS Simulator build tools available in XcodeBuildMCP.

## Tools Overview

### iOS Simulator Build Tools

- `ios_simulator_build_by_name_workspace` - Builds an iOS app for a simulator by name using a workspace
- `ios_simulator_build_by_name_project` - Builds an iOS app for a simulator by name using a project file
- `ios_simulator_build_by_id_workspace` - Builds an iOS app for a simulator by UUID using a workspace
- `ios_simulator_build_by_id_project` - Builds an iOS app for a simulator by UUID using a project file

### iOS Simulator Build and Run Tools

- `ios_simulator_build_and_run_by_name_workspace` - Builds and runs an iOS app on a simulator by name using a workspace
- `ios_simulator_build_and_run_by_name_project` - Builds and runs an iOS app on a simulator by name using a project file
- `ios_simulator_build_and_run_by_id_workspace` - Builds and runs an iOS app on a simulator by UUID using a workspace
- `ios_simulator_build_and_run_by_id_project` - Builds and runs an iOS app on a simulator by UUID using a project file

## Usage Examples

### Building for a Simulator by Name

```javascript
// Using a workspace
ios_simulator_build_by_name_workspace({
  workspacePath: '/path/to/MyProject.xcworkspace',
  scheme: 'MyScheme',
  simulatorName: 'iPhone 16'
})

// Using a project file
ios_simulator_build_by_name_project({
  projectPath: '/path/to/MyProject.xcodeproj',
  scheme: 'MyScheme',
  simulatorName: 'iPhone 16'
})
```

### Building for a Simulator by UUID

```javascript
// Using a workspace
ios_simulator_build_by_id_workspace({
  workspacePath: '/path/to/MyProject.xcworkspace',
  scheme: 'MyScheme',
  simulatorId: 'SIMULATOR_UUID'
})

// Using a project file
ios_simulator_build_by_id_project({
  projectPath: '/path/to/MyProject.xcodeproj',
  scheme: 'MyScheme',
  simulatorId: 'SIMULATOR_UUID'
})
```

### Building and Running on a Simulator

```javascript
// By name with a workspace
ios_simulator_build_and_run_by_name_workspace({
  workspacePath: '/path/to/MyProject.xcworkspace',
  scheme: 'MyScheme',
  simulatorName: 'iPhone 16'
})

// By UUID with a project file
ios_simulator_build_and_run_by_id_project({
  projectPath: '/path/to/MyProject.xcodeproj',
  scheme: 'MyScheme',
  simulatorId: 'SIMULATOR_UUID'
})
```

## Parameters

### Common Parameters

| Parameter | Type | Description | Required | Default |
|-----------|------|-------------|----------|---------|
| `workspacePath` | string | Path to the .xcworkspace file | Yes (for workspace tools) | - |
| `projectPath` | string | Path to the .xcodeproj file | Yes (for project tools) | - |
| `scheme` | string | The scheme to build | Yes | - |
| `configuration` | string | Build configuration (Debug, Release, etc.) | No | "Debug" |
| `simulatorName` | string | Name of the simulator to use (e.g., 'iPhone 16') | Yes (for name-based tools) | - |
| `simulatorId` | string | UUID of the simulator to use (obtained from list_simulators) | Yes (for ID-based tools) | - |
| `useLatestOS` | boolean | Whether to use the latest OS version for the named simulator | No | true |
| `derivedDataPath` | string | Path where build products and other derived data will go | No | - |
| `extraArgs` | string[] | Additional xcodebuild arguments | No | - |
