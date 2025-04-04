# iOS Device Build Tools

This document describes the iOS Device build tools available in XcodeBuildMCP.

## Tools Overview

### iOS Device Build Tools

- `ios_device_build_workspace` - Builds an iOS app for a physical device using a workspace
- `ios_device_build_project` - Builds an iOS app for a physical device using a project file

## Usage Examples

### Building for a Physical iOS Device

```javascript
// Using a workspace
ios_device_build_workspace({
  workspacePath: '/path/to/MyProject.xcworkspace',
  scheme: 'MyScheme'
})

// Using a project file
ios_device_build_project({
  projectPath: '/path/to/MyProject.xcodeproj',
  scheme: 'MyScheme'
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
| `derivedDataPath` | string | Path where build products and other derived data will go | No | - |
| `extraArgs` | string[] | Additional xcodebuild arguments | No | - |
