# Migration Plans: Device Utility Tools

This file contains 4 tools that need to be migrated to plugins/simulator-utilities/:

1. list_devices
2. install_app_device
3. launch_app_device
4. stop_app_device

---

# Migration Plan: list_devices

## Tool Information
- **Tool Name**: list_devices
- **Current Location**: src/tools/device/index.ts
- **Target Plugin**: plugins/simulator-utilities/list_devices.js
- **Workflow Group**: Simulator management tools (device listing)

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/device/index.ts`, extract the following (after line with registerTool):

1. **Tool Name** - Find the second parameter to registerTool:
   ```typescript
   export const listDevicesToolName = '<extract_from_registerTool_second_param>';
   ```

2. **Tool Description** - Find the third parameter to registerTool:
   ```typescript
   export const listDevicesToolDescription = '<extract_from_registerTool_third_param>';
   ```

3. **Tool Schema** - Find the fourth parameter to registerTool:
   ```typescript
   export const listDevicesToolSchema = {
     // Extract the entire schema object from registerTool fourth param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function listDevicesToolHandler(params: {
     // Extract parameter type from handler function
   }): Promise<ToolResponse> {
     // CUT the handler function body from inside registerTool
     // PASTE it here
   }
   ```

### Step 2: Update Original registerTool Call

Replace the registerTool call with:
```typescript
registerTool(
  server,
  listDevicesToolName,
  listDevicesToolDescription,
  listDevicesToolSchema,
  listDevicesToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/simulator-utilities/list_devices.js`:
```javascript
import {
  listDevicesToolName,
  listDevicesToolDescription,
  listDevicesToolSchema,
  listDevicesToolHandler
} from '../../src/tools/device/index.js';

export default {
  name: listDevicesToolName,
  description: listDevicesToolDescription,
  schema: listDevicesToolSchema,
  handler: listDevicesToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/device/index.test.ts plugins/simulator-utilities/list_devices.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import listDevices from './list_devices.js';`
   - Find and replace tool name references
   - Remove tests for other tools in the file
   - Add plugin structure test

### Step 5: Validate

After surgical edits:
```bash
npm run build  # Should succeed
npm test       # Original tests still pass, new plugin tests pass
```

---

# Migration Plan: install_app_device

## Tool Information
- **Tool Name**: install_app_device
- **Current Location**: src/tools/device/index.ts
- **Target Plugin**: plugins/simulator-utilities/install_app_device.js
- **Workflow Group**: Simulator management tools (device operations)

## Migration Process

Follows standard migration pattern...

---

# Migration Plan: launch_app_device

## Tool Information
- **Tool Name**: launch_app_device
- **Current Location**: src/tools/device/index.ts
- **Target Plugin**: plugins/simulator-utilities/launch_app_device.js
- **Workflow Group**: Simulator management tools (device operations)

## Migration Process

Follows standard migration pattern...

---

# Migration Plan: stop_app_device

## Tool Information
- **Tool Name**: stop_app_device
- **Current Location**: src/tools/device/index.ts
- **Target Plugin**: plugins/simulator-utilities/stop_app_device.js
- **Workflow Group**: Simulator management tools (device operations)

## Migration Process

Follows standard migration pattern...

---

## Special Considerations

1. All 4 tools are in the same file, so extract all 4 sets of exports at once (16 total exports)
2. Update all 4 registerTool calls
3. Create 4 plugin files in simulator-utilities/ (these are device utilities grouped with simulator utilities)
4. The test file needs to be copied 4 times and edited for each specific tool
5. These tools interact with physical devices via devicectl and xctrace
6. list_devices has special logic for fallback from devicectl to xctrace