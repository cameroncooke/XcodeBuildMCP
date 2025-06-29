# Migration Plans: Device Log Tools

This file contains 2 tools that need to be migrated to plugins/logging/:

1. start_device_log_cap
2. stop_device_log_cap

---

# Migration Plan: start_device_log_cap

## Tool Information
- **Tool Name**: start_device_log_cap
- **Current Location**: src/tools/device-log/index.ts
- **Target Plugin**: plugins/logging/start_device_log_cap.js
- **Workflow Group**: Logging tools

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/device-log/index.ts`, extract the following (after line with registerTool):

1. **Tool Name** - Find the second parameter to registerTool:
   ```typescript
   export const startDeviceLogCapToolName = '<extract_from_registerTool_second_param>';
   ```

2. **Tool Description** - Find the third parameter to registerTool:
   ```typescript
   export const startDeviceLogCapToolDescription = '<extract_from_registerTool_third_param>';
   ```

3. **Tool Schema** - Find the fourth parameter to registerTool:
   ```typescript
   export const startDeviceLogCapToolSchema = {
     // Extract the entire schema object from registerTool fourth param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function startDeviceLogCapToolHandler(params: {
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
  startDeviceLogCapToolName,
  startDeviceLogCapToolDescription,
  startDeviceLogCapToolSchema,
  startDeviceLogCapToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/logging/start_device_log_cap.js`:
```javascript
import {
  startDeviceLogCapToolName,
  startDeviceLogCapToolDescription,
  startDeviceLogCapToolSchema,
  startDeviceLogCapToolHandler
} from '../../src/tools/device-log/index.js';

export default {
  name: startDeviceLogCapToolName,
  description: startDeviceLogCapToolDescription,
  schema: startDeviceLogCapToolSchema,
  handler: startDeviceLogCapToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/device-log/index.test.ts plugins/logging/start_device_log_cap.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import startDeviceLogCap from './start_device_log_cap.js';`
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

# Migration Plan: stop_device_log_cap

## Tool Information
- **Tool Name**: stop_device_log_cap
- **Current Location**: src/tools/device-log/index.ts
- **Target Plugin**: plugins/logging/stop_device_log_cap.js
- **Workflow Group**: Logging tools

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/device-log/index.ts`, extract the following (after line with registerTool):

1. **Tool Name** - Find the second parameter to registerTool:
   ```typescript
   export const stopDeviceLogCapToolName = '<extract_from_registerTool_second_param>';
   ```

2. **Tool Description** - Find the third parameter to registerTool:
   ```typescript
   export const stopDeviceLogCapToolDescription = '<extract_from_registerTool_third_param>';
   ```

3. **Tool Schema** - Find the fourth parameter to registerTool:
   ```typescript
   export const stopDeviceLogCapToolSchema = {
     // Extract the entire schema object from registerTool fourth param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function stopDeviceLogCapToolHandler(params: {
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
  stopDeviceLogCapToolName,
  stopDeviceLogCapToolDescription,
  stopDeviceLogCapToolSchema,
  stopDeviceLogCapToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/logging/stop_device_log_cap.js`:
```javascript
import {
  stopDeviceLogCapToolName,
  stopDeviceLogCapToolDescription,
  stopDeviceLogCapToolSchema,
  stopDeviceLogCapToolHandler
} from '../../src/tools/device-log/index.js';

export default {
  name: stopDeviceLogCapToolName,
  description: stopDeviceLogCapToolDescription,
  schema: stopDeviceLogCapToolSchema,
  handler: stopDeviceLogCapToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/device-log/index.test.ts plugins/logging/stop_device_log_cap.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import stopDeviceLogCap from './stop_device_log_cap.js';`
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
2. These tools manage stateful log capture sessions - start returns a session ID, stop uses that ID
3. The tools use the device log capture utility functions from src/utils/device_log.ts
4. Both tools work with physical Apple devices via devicectl