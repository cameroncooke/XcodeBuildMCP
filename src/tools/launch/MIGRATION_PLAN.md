# Migration Plans: Launch Tools

This file contains 2 tools that need to be migrated:

## macOS Tools (target: plugins/macos-workspace/)
1. launch_mac_app
2. stop_mac_app

## Important Note

These tools use `server.tool()` instead of `registerTool()`. The migration pattern needs adjustment:

### Original Pattern:
```typescript
server.tool(
  'tool_name',
  'description',
  { schema },
  async handler
);
```

### Migration Pattern:
```typescript
// Extract as:
export const toolNameToolName = 'tool_name';
export const toolNameToolDescription = 'description';
export const toolNameToolSchema = { schema };
export async function toolNameToolHandler(params) { 
  // handler body
}

// Update to:
server.tool(
  toolNameToolName,
  toolNameToolDescription,
  toolNameToolSchema,
  toolNameToolHandler
);
```

---

# Migration Plan: launch_mac_app

## Tool Information
- **Tool Name**: launch_mac_app
- **Current Location**: src/tools/launch/index.ts
- **Target Plugin**: plugins/macos-workspace/launch_mac_app.js
- **Workflow Group**: macOS tools

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/launch/index.ts`, extract the following (inside registerLaunchMacOSAppTool function):

1. **Tool Name** - Find the first parameter to server.tool:
   ```typescript
   export const launchMacAppToolName = '<extract_from_server.tool_first_param>';
   ```

2. **Tool Description** - Find the second parameter to server.tool:
   ```typescript
   export const launchMacAppToolDescription = '<extract_from_server.tool_second_param>';
   ```

3. **Tool Schema** - Find the third parameter to server.tool:
   ```typescript
   export const launchMacAppToolSchema = {
     // Extract the entire schema object from server.tool third param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function launchMacAppToolHandler(params: {
     // Extract parameter type from handler function
   }): Promise<ToolResponse> {
     // CUT the handler function body from inside server.tool
     // PASTE it here
   }
   ```

### Step 2: Update Original server.tool Call

Replace the server.tool call with:
```typescript
server.tool(
  launchMacAppToolName,
  launchMacAppToolDescription,
  launchMacAppToolSchema,
  launchMacAppToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/macos-workspace/launch_mac_app.js`:
```javascript
import {
  launchMacAppToolName,
  launchMacAppToolDescription,
  launchMacAppToolSchema,
  launchMacAppToolHandler
} from '../../src/tools/launch/index.js';

export default {
  name: launchMacAppToolName,
  description: launchMacAppToolDescription,
  schema: launchMacAppToolSchema,
  handler: launchMacAppToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/launch/index.test.ts plugins/macos-workspace/launch_mac_app.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import launchMacApp from './launch_mac_app.js';`
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

# Migration Plan: stop_mac_app

## Tool Information
- **Tool Name**: stop_mac_app
- **Current Location**: src/tools/launch/index.ts
- **Target Plugin**: plugins/macos-workspace/stop_mac_app.js
- **Workflow Group**: macOS tools

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/launch/index.ts`, extract the following (inside registerStopMacOSAppTool function):

1. **Tool Name** - Find the first parameter to server.tool:
   ```typescript
   export const stopMacAppToolName = '<extract_from_server.tool_first_param>';
   ```

2. **Tool Description** - Find the second parameter to server.tool:
   ```typescript
   export const stopMacAppToolDescription = '<extract_from_server.tool_second_param>';
   ```

3. **Tool Schema** - Find the third parameter to server.tool:
   ```typescript
   export const stopMacAppToolSchema = {
     // Extract the entire schema object from server.tool third param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function stopMacAppToolHandler(params: {
     // Extract parameter type from handler function
   }): Promise<ToolResponse> {
     // CUT the handler function body from inside server.tool
     // PASTE it here
   }
   ```

### Step 2: Update Original server.tool Call

Replace the server.tool call with:
```typescript
server.tool(
  stopMacAppToolName,
  stopMacAppToolDescription,
  stopMacAppToolSchema,
  stopMacAppToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/macos-workspace/stop_mac_app.js`:
```javascript
import {
  stopMacAppToolName,
  stopMacAppToolDescription,
  stopMacAppToolSchema,
  stopMacAppToolHandler
} from '../../src/tools/launch/index.js';

export default {
  name: stopMacAppToolName,
  description: stopMacAppToolDescription,
  schema: stopMacAppToolSchema,
  handler: stopMacAppToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/launch/index.test.ts plugins/macos-workspace/stop_mac_app.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import stopMacApp from './stop_mac_app.js';`
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

1. Both tools use server.tool() instead of registerTool()
2. Both tools are macOS-specific and belong in macos-workspace
3. launch_mac_app launches apps with optional arguments
4. stop_mac_app can stop by app name or process ID
5. The test file needs to be copied twice and edited for each specific tool