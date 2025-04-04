# macOS Build Tools

This document describes the macOS build tools available in XcodeBuildMCP.

## Tools Overview

### macOS Build Tools

- `macos_build_workspace` - Builds a macOS app using a workspace
- `macos_build_project` - Builds a macOS app using a project file

### macOS Build and Run Tools

- `macos_build_and_run_workspace` - Builds and runs a macOS app using a workspace
- `macos_build_and_run_project` - Builds and runs a macOS app using a project file

## Usage Examples

### Building a macOS App

```javascript
// Using a workspace
macos_build_workspace({
  workspacePath: '/path/to/MyProject.xcworkspace',
  scheme: 'MyScheme'
})

// Using a project file
macos_build_project({
  projectPath: '/path/to/MyProject.xcodeproj',
  scheme: 'MyScheme'
})
```

### Building and Running a macOS App

```javascript
// Using a workspace
macos_build_and_run_workspace({
  workspacePath: '/path/to/MyProject.xcworkspace',
  scheme: 'MyScheme'
})

// Using a project file
macos_build_and_run_project({
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
