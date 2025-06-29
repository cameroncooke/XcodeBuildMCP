# Migration Plans: Screenshot Tool

This file contains 1 tool that needs to be migrated to plugins/ui-testing/:

1. screenshot

## Important Note

This tool uses `server.tool()` instead of `registerTool()`. The migration pattern needs adjustment:

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

# Migration Plan: screenshot

## Tool Information
- **Tool Name**: screenshot
- **Current Location**: src/tools/screenshot/index.ts
- **Target Plugin**: plugins/ui-testing/screenshot.js
- **Workflow Group**: UI testing tools

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/screenshot/index.ts`, extract the following (inside registerScreenshotTool function):

1. **Tool Name** - Find the first parameter to server.tool:
   ```typescript
   export const screenshotToolName = '<extract_from_server.tool_first_param>';
   ```

2. **Tool Description** - Find the second parameter to server.tool:
   ```typescript
   export const screenshotToolDescription = '<extract_from_server.tool_second_param>';
   ```

3. **Tool Schema** - Find the third parameter to server.tool:
   ```typescript
   export const screenshotToolSchema = {
     // Extract the entire schema object from server.tool third param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function screenshotToolHandler(params: {
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
  screenshotToolName,
  screenshotToolDescription,
  screenshotToolSchema,
  screenshotToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/ui-testing/screenshot.js`:
```javascript
import {
  screenshotToolName,
  screenshotToolDescription,
  screenshotToolSchema,
  screenshotToolHandler
} from '../../src/tools/screenshot/index.js';

export default {
  name: screenshotToolName,
  description: screenshotToolDescription,
  schema: screenshotToolSchema,
  handler: screenshotToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/screenshot/index.test.ts plugins/ui-testing/screenshot.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import screenshot from './screenshot.js';`
   - Find and replace tool name references
   - Add plugin structure test

### Step 5: Validate

After surgical edits:
```bash
npm run build  # Should succeed
npm test       # Original tests still pass, new plugin tests pass
```

---

## Special Considerations

1. Tool uses server.tool() instead of registerTool()
2. Screenshot tool captures iOS Simulator screens
3. Returns base64 encoded PNG or JPEG image data
4. Works with the simulator UUID parameter