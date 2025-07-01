# Utilities and Remaining Tools Migration Guide

## Overview
Migration guide for making utility workflow tools self-contained by removing dependencies on various `src/tools/` directories.

## Tools by Workflow

### Utilities Workflow
1. `clean_ws` - Clean workspace build artifacts
2. `clean_proj` - Clean project build artifacts  
3. `scaffold_ios_project` - Create new iOS projects
4. `scaffold_macos_project` - Create new macOS projects

### Logging Workflow
1. `start_device_log_cap` - Start device log capture
2. `stop_device_log_cap` - Stop device log capture
3. `start_sim_log_cap` - Start simulator log capture  
4. `stop_sim_log_cap` - Stop simulator log capture

### Device Workspaces/Projects
1. `build_dev_ws` - Build workspace for device
2. `build_dev_proj` - Build project for device
3. `test_device_ws` - Test workspace on device
4. `test_device_proj` - Test project on device
5. `get_device_app_path_ws` - Get device app path for workspace
6. `get_device_app_path_proj` - Get device app path for project
7. `install_app_device` - Install app on device
8. `launch_app_device` - Launch app on device
9. `list_devices` - List connected devices
10. `stop_app_device` - Stop app on device

### macOS Workspaces/Projects  
1. `build_mac_ws` - Build workspace for macOS
2. `build_mac_proj` - Build project for macOS
3. `build_run_mac_ws` - Build and run workspace on macOS
4. `build_run_mac_proj` - Build and run project on macOS
5. `test_macos_ws` - Test workspace on macOS
6. `test_macos_proj` - Test project on macOS
7. `get_mac_app_path_ws` - Get macOS app path for workspace
8. `get_mac_app_path_proj` - Get macOS app path for project
9. `launch_mac_app` - Launch macOS application
10. `stop_mac_app` - Stop macOS application

### Diagnostics
1. `diagnostic` - System diagnostics and environment check

## Migration Pattern

### Standard Pattern
```typescript
// BEFORE: Plugin imports from tool
import { [NAME], [DESC], [SCHEMA], [HANDLER] } from '../../src/tools/[category]/index.js';

export default {
  name: [NAME],
  description: [DESC],
  schema: [SCHEMA],
  handler: [HANDLER],
};

// AFTER: Self-contained plugin
import { z } from 'zod';
import { [required_utils] } from '../../src/utils/[util].js';

export default {
  name: '[literal_name]',
  description: '[literal_description]',
  schema: {
    [inline_schema_object]
  },
  async handler(params) {
    [complete_handler_implementation]
  },
};
```

## Special Considerations

### Clean Tools
Source: `src/tools/clean/index.ts`
- Handle both workspace and project variants
- Different xcodebuild clean commands
- Shared error handling patterns

### Scaffold Tools  
Source: `src/tools/scaffold/index.ts`
- Complex template downloading logic
- iOS vs macOS platform differences
- Template version management
- File system operations

### Device Tools
Source: `src/tools/build-ios-device/`, `src/tools/test-ios-device/`, `src/tools/device/`
- Device communication via devicectl/xcrun
- Device ID validation and management
- App installation and lifecycle

### macOS Tools
Source: `src/tools/build-macos/`, `src/tools/test-macos/`, `src/tools/launch/`
- macOS-specific build configurations
- App launching and process management
- Architecture handling (arm64/x86_64)

### Log Capture Tools
Source: `src/tools/log/`, `src/tools/device-log/`
- Background process management
- Log session tracking
- Device vs simulator log differences

### Diagnostic Tool
Source: `src/tools/diagnostic/index.ts`
- Environment detection and validation
- Xcode installation checks
- System capability reporting

## Migration Process per Tool

1. **Read Source**: Get complete implementation from appropriate `src/tools/[category]/index.ts`
2. **Extract Components**:
   - Tool name, description, schema literals
   - Complete handler implementation  
   - Platform-specific logic
3. **Handle Complex Dependencies**:
   - Template management for scaffold tools
   - Process management for log tools
   - Device communication for device tools
4. **Update Plugin**: Use MultiEdit for surgical replacement
5. **Test**: Run `npm test -- plugins/[workflow]/[tool].test.ts`

## Utility Dependencies
Common imports needed:
- `executeCommand` from `../../src/utils/command.js`
- `validateRequiredParam` from `../../src/utils/validation.js`
- `createErrorResponse` from `../../src/utils/errors.js`
- `log` from `../../src/utils/logger.js`
- `buildUtils` from `../../src/utils/build-utils.js`
- `templateManager` from `../../src/utils/template-manager.js` (scaffold tools)
- Process management utilities (log tools)

## Validation Checkpoints

**After Each Tool**:
```bash
npm test -- plugins/[workflow]/[tool].test.ts
```

**After Each Workflow**:
```bash
npm test -- plugins/[workflow]/
grep -r "src/tools" plugins/[workflow]/  # Should return no results
```

## Success Criteria
- ✅ All remaining tools are self-contained
- ✅ No imports from `src/tools` remain
- ✅ All plugin tests pass
- ✅ Complex functionality preserved (scaffolding, logging, device communication)
- ✅ Platform-specific logic maintained