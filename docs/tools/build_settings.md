# Build Settings and Scheme Tools

This document describes the build settings and scheme listing tools available in XcodeBuildMCP.

## Tools Overview

### Build Settings Tools

- `show_build_settings_workspace` - Shows build settings from a workspace
- `show_build_settings_project` - Shows build settings from a project file

### Scheme Listing Tools

- `list_schemes_workspace` - Lists available schemes in a workspace
- `list_schemes_project` - Lists available schemes in a project file

## Usage Examples

### Showing Build Settings

```javascript
// Using a workspace
show_build_settings_workspace({
  workspacePath: '/path/to/MyProject.xcworkspace',
  scheme: 'MyScheme'
})

// Using a project file
show_build_settings_project({
  projectPath: '/path/to/MyProject.xcodeproj',
  scheme: 'MyScheme'
})
```

### Listing Schemes

```javascript
// Using a workspace
list_schemes_workspace({
  workspacePath: '/path/to/MyProject.xcworkspace'
})

// Using a project file
list_schemes_project({
  projectPath: '/path/to/MyProject.xcodeproj'
})
```

## Parameters

### Build Settings Parameters

| Parameter | Type | Description | Required | Default |
|-----------|------|-------------|----------|---------|
| `workspacePath` | string | Path to the .xcworkspace file | Yes (for workspace tools) | - |
| `projectPath` | string | Path to the .xcodeproj file | Yes (for project tools) | - |
| `scheme` | string | The scheme to show build settings for | Yes | - |

### Scheme Listing Parameters

| Parameter | Type | Description | Required | Default |
|-----------|------|-------------|----------|---------|
| `workspacePath` | string | Path to the .xcworkspace file | Yes (for workspace tools) | - |
| `projectPath` | string | Path to the .xcodeproj file | Yes (for project tools) | - |
