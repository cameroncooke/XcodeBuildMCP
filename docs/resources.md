# XcodeBuildMCP Resources

Resources provide contextual information about your Xcode project without executing tools. They allow MCP clients to access project metadata, build configurations, and other contextual data.

## Available Resources

### Project Resources

#### `xcode://project/info`
**Description:** Complete project metadata and configuration information  
**Content Type:** `application/json`

Returns information about the current Xcode project including:
- Project path and type (workspace/project)
- Available schemes and targets
- Current working directory
- Timestamp of last access

#### `xcode://project/schemes`
**Description:** Available build schemes in the Xcode project  
**Content Type:** `application/json`

Returns a list of all available build schemes with links to their build settings.

#### `xcode://project/targets`
**Description:** Available targets in the Xcode project  
**Content Type:** `application/json`

Returns a list of all project targets.

### Build Resources

#### `xcode://build/settings/{scheme}`
**Description:** Build settings and configuration for specific schemes  
**Content Type:** `application/json`  
**Template:** Yes (supports scheme completion)

Returns detailed build settings for the specified scheme, including:
- All build configuration variables
- Deployment targets
- Code signing settings
- Compiler flags and options

#### `xcode://build/logs/latest`
**Description:** Most recent Xcode build log  
**Content Type:** `text/plain`

Returns the content of the most recent build log, extracted from Xcode's activity logs.

### Simulator Resources

#### `xcode://simulator/devices`
**Description:** Available iOS Simulator devices and their states  
**Content Type:** `application/json`

Returns comprehensive simulator information including:
- All available devices grouped by runtime
- Device states (Booted, Shutdown, etc.)
- Summary statistics
- Device identifiers and types

#### `xcode://simulator/runtimes`
**Description:** Available iOS Simulator runtimes and versions  
**Content Type:** `application/json`

Returns information about installed simulator runtimes:
- Runtime identifiers and versions
- Availability status
- Supported device types count

#### `xcode://simulator/device-types`
**Description:** Available iOS Simulator device types  
**Content Type:** `application/json`

Returns device type information grouped by product family:
- Device identifiers and names
- Product families (iPhone, iPad, etc.)
- Model identifiers

#### `xcode://simulator/booted`
**Description:** Currently booted iOS Simulator devices  
**Content Type:** `application/json`

Quick access to only the currently running simulators.

## Usage Examples

### Reading Project Information
```typescript
// Get project metadata
const projectInfo = await client.readResource('xcode://project/info');
console.log(JSON.parse(projectInfo.contents[0].text));
```

### Accessing Build Settings
```typescript
// Get build settings for a specific scheme
const buildSettings = await client.readResource('xcode://build/settings/MyApp');
console.log(JSON.parse(buildSettings.contents[0].text));
```

### Checking Simulator Status
```typescript
// Get currently booted simulators
const bootedSims = await client.readResource('xcode://simulator/booted');
console.log(JSON.parse(bootedSims.contents[0].text));
```

## Configuration

Resources can be disabled by setting the environment variable:
```bash
export XCODEBUILDMCP_ENABLE_RESOURCES=false
```

## Error Handling

Resources gracefully handle common error scenarios:
- No Xcode project found in current directory
- Missing or invalid schemes
- Simulator unavailability
- Build log access issues

Error information is returned in the resource content with descriptive messages and suggestions for resolution.

