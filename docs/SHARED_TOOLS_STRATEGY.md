# Shared Tools Strategy for Plugin Migration

## Problem Statement

Some tools need to be available in multiple plugin directories but must maintain a single source of truth. For example:
- Simulator build/test tools are needed by both `simulator-workspace/` and `simulator-project/`
- Device build/test tools are needed by both `device-workspace/` and `device-project/`
- macOS build/test tools are needed by both `macos-workspace/` and `macos-project/`

## Solution: Re-export Pattern

### 1. Primary Implementation
The actual plugin implementation lives in the workspace directory (as it's typically the more common use case):

**Example: `plugins/simulator-workspace/build_sim_name_ws.js`**
```javascript
import {
  buildSimNameWsToolName,
  buildSimNameWsToolDescription,
  buildSimNameWsToolSchema,
  buildSimNameWsToolHandler
} from '../../src/tools/build-ios-simulator/index.js';

export default {
  name: buildSimNameWsToolName,
  description: buildSimNameWsToolDescription,
  schema: buildSimNameWsToolSchema,
  handler: buildSimNameWsToolHandler,
};
```

### 2. Re-export Implementation
The project directory contains a re-export that imports and re-exports the workspace version:

**Example: `plugins/simulator-project/build_sim_name_ws.js`**
```javascript
// Re-export from simulator-workspace to avoid duplication
export { default } from '../simulator-workspace/build_sim_name_ws.js';
```

### 3. Test Strategy
- Primary tests live with the primary implementation in `simulator-workspace/`
- Re-export location has a minimal test to verify the re-export works:

**Example: `plugins/simulator-project/build_sim_name_ws.test.ts`**
```typescript
import { describe, it, expect } from 'vitest';
import buildSimNameWs from './build_sim_name_ws.js';
import buildSimNameWsOriginal from '../simulator-workspace/build_sim_name_ws.js';

describe('build_sim_name_ws re-export', () => {
  it('should re-export the same plugin object', () => {
    expect(buildSimNameWs).toBe(buildSimNameWsOriginal);
  });
});
```

## Tools Requiring Re-export

Based on the PLUGIN_MIGRATION_PLAN.md, these tools need re-exports:

### Simulator Tools
- `build_sim_name_ws` - Primary in `simulator-workspace/`, re-exported in `simulator-project/`
- `build_sim_id_ws` - Primary in `simulator-workspace/`, re-exported in `simulator-project/`
- `build_sim_name_proj` - Primary in `simulator-workspace/`, re-exported in `simulator-project/`
- `build_sim_id_proj` - Primary in `simulator-workspace/`, re-exported in `simulator-project/`
- `test_sim_name_ws` - Primary in `simulator-workspace/`, re-exported in `simulator-project/`
- `test_sim_id_ws` - Primary in `simulator-workspace/`, re-exported in `simulator-project/`
- `test_sim_name_proj` - Primary in `simulator-workspace/`, re-exported in `simulator-project/`
- `test_sim_id_proj` - Primary in `simulator-workspace/`, re-exported in `simulator-project/`

### Device Tools
- `build_dev_ws` - Primary in `device-workspace/`, re-exported in `device-project/`
- `build_dev_proj` - Primary in `device-workspace/`, re-exported in `device-project/`
- `test_device_ws` - Primary in `device-workspace/`, re-exported in `device-project/`
- `test_device_proj` - Primary in `device-workspace/`, re-exported in `device-project/`

### macOS Tools
- `build_mac_ws` - Primary in `macos-workspace/`, re-exported in `macos-project/`
- `build_mac_proj` - Primary in `macos-workspace/`, re-exported in `macos-project/`
- `test_macos_ws` - Primary in `macos-workspace/`, re-exported in `macos-project/`
- `test_macos_proj` - Primary in `macos-workspace/`, re-exported in `macos-project/`

## Migration Process Update

When migrating these shared tools:

1. **Surgical Edit Phase**: Extract the exports as normal in the source file
2. **Primary Plugin**: Create the full plugin in the workspace directory
3. **Re-export Plugin**: Create a one-line re-export in the project directory
4. **Primary Tests**: Copy and adapt full tests for the workspace plugin
5. **Re-export Tests**: Create minimal test to verify re-export works

## Benefits

1. **Single Source of Truth**: Tool implementation only exists in one place
2. **Surgical Edits Preserved**: No code duplication, maintaining the surgical approach
3. **Plugin Discovery Works**: Both directories will have the tool available
4. **Test Coverage**: Full tests for implementation, minimal tests for re-exports
5. **Clear Organization**: Re-exports are explicitly marked and easy to understand

## Example Updated Migration Plan Section

For a shared tool like `build_sim_name_ws`, the migration plan would include:

### Step 3a: Create Primary Plugin File
Create `plugins/simulator-workspace/build_sim_name_ws.js`:
```javascript
import {
  buildSimNameWsToolName,
  buildSimNameWsToolDescription,
  buildSimNameWsToolSchema,
  buildSimNameWsToolHandler
} from '../../src/tools/build-ios-simulator/index.js';

export default {
  name: buildSimNameWsToolName,
  description: buildSimNameWsToolDescription,
  schema: buildSimNameWsToolSchema,
  handler: buildSimNameWsToolHandler,
};
```

### Step 3b: Create Re-export Plugin File
Create `plugins/simulator-project/build_sim_name_ws.js`:
```javascript
// Re-export from simulator-workspace to avoid duplication
export { default } from '../simulator-workspace/build_sim_name_ws.js';
```

This maintains the surgical edit approach while properly implementing the shared tool structure defined in PLUGIN_MIGRATION_PLAN.md.