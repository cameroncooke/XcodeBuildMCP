# Migration Plans: Device Test Tools

This file contains 2 tools that need to be migrated and organized by workspace/project:

## Workspace Tools (target: plugins/device-workspace/)
1. test_device_ws

## Project Tools (target: plugins/device-project/)
2. test_device_proj

---

# Migration Plan: test_device_ws

## Tool Information
- **Tool Name**: test_device_ws
- **Current Location**: src/tools/test-ios-device/index.ts
- **Target Plugin**: plugins/device-workspace/test_device_ws.js
- **Workflow Group**: Device + Workspace tools

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/test-ios-device/index.ts`, extract the following (after line with registerTool):

1. **Tool Name** - Find the second parameter to registerTool:
   ```typescript
   export const testDeviceWsToolName = '<extract_from_registerTool_second_param>';
   ```

2. **Tool Description** - Find the third parameter to registerTool:
   ```typescript
   export const testDeviceWsToolDescription = '<extract_from_registerTool_third_param>';
   ```

3. **Tool Schema** - Find the fourth parameter to registerTool:
   ```typescript
   export const testDeviceWsToolSchema = {
     // Extract the entire schema object from registerTool fourth param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function testDeviceWsToolHandler(params: {
     // Extract parameter type from handler function
   }): Promise<ToolResponse> {
     // CUT the handler function body from inside registerTool
     // PASTE it here
   }
   ```

### Step 2: Update Original registerTool Call

Replace the registerTool call with:
```typescript
registerTool<Params>(
  server,
  testDeviceWsToolName,
  testDeviceWsToolDescription,
  testDeviceWsToolSchema,
  testDeviceWsToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/device-workspace/test_device_ws.js`:
```javascript
import {
  testDeviceWsToolName,
  testDeviceWsToolDescription,
  testDeviceWsToolSchema,
  testDeviceWsToolHandler
} from '../../src/tools/test-ios-device/index.js';

export default {
  name: testDeviceWsToolName,
  description: testDeviceWsToolDescription,
  schema: testDeviceWsToolSchema,
  handler: testDeviceWsToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/test-ios-device/index.test.ts plugins/device-workspace/test_device_ws.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import testDeviceWs from './test_device_ws.js';`
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

# Migration Plan: test_device_proj

## Tool Information
- **Tool Name**: test_device_proj
- **Current Location**: src/tools/test-ios-device/index.ts
- **Target Plugin**: plugins/device-project/test_device_proj.js
- **Workflow Group**: Device + Project tools

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/test-ios-device/index.ts`, extract the following (after line with registerTool):

1. **Tool Name** - Find the second parameter to registerTool:
   ```typescript
   export const testDeviceProjToolName = '<extract_from_registerTool_second_param>';
   ```

2. **Tool Description** - Find the third parameter to registerTool:
   ```typescript
   export const testDeviceProjToolDescription = '<extract_from_registerTool_third_param>';
   ```

3. **Tool Schema** - Find the fourth parameter to registerTool:
   ```typescript
   export const testDeviceProjToolSchema = {
     // Extract the entire schema object from registerTool fourth param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function testDeviceProjToolHandler(params: {
     // Extract parameter type from handler function
   }): Promise<ToolResponse> {
     // CUT the handler function body from inside registerTool
     // PASTE it here
   }
   ```

### Step 2: Update Original registerTool Call

Replace the registerTool call with:
```typescript
registerTool<Params>(
  server,
  testDeviceProjToolName,
  testDeviceProjToolDescription,
  testDeviceProjToolSchema,
  testDeviceProjToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/device-project/test_device_proj.js`:
```javascript
import {
  testDeviceProjToolName,
  testDeviceProjToolDescription,
  testDeviceProjToolSchema,
  testDeviceProjToolHandler
} from '../../src/tools/test-ios-device/index.js';

export default {
  name: testDeviceProjToolName,
  description: testDeviceProjToolDescription,
  schema: testDeviceProjToolSchema,
  handler: testDeviceProjToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/test-ios-device/index.test.ts plugins/device-project/test_device_proj.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import testDeviceProj from './test_device_proj.js';`
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

## Special Considerations

1. Both tools are in the same file, so extract both sets of exports at once
2. Tools are organized by workspace vs project
3. Both tools support multiple platforms (iOS, watchOS, tvOS, visionOS)
4. The test file needs to be copied twice and edited for each specific tool