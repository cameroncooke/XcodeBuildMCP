# Migration Plans: Bundle ID Tools

This file contains 2 tools that need to be migrated to plugins/project-discovery/:

1. get_mac_bundle_id
2. get_app_bundle_id

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

# Migration Plan: get_mac_bundle_id

## Tool Information
- **Tool Name**: get_mac_bundle_id
- **Current Location**: src/tools/bundle-id/index.ts
- **Target Plugin**: plugins/project-discovery/get_mac_bundle_id.js
- **Workflow Group**: Project discovery & analysis tools

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/bundle-id/index.ts`, extract the following (inside registerMacBundleIdTool function):

1. **Tool Name** - Find the first parameter to server.tool:
   ```typescript
   export const getMacBundleIdToolName = '<extract_from_server.tool_first_param>';
   ```

2. **Tool Description** - Find the second parameter to server.tool:
   ```typescript
   export const getMacBundleIdToolDescription = '<extract_from_server.tool_second_param>';
   ```

3. **Tool Schema** - Find the third parameter to server.tool:
   ```typescript
   export const getMacBundleIdToolSchema = {
     // Extract the entire schema object from server.tool third param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function getMacBundleIdToolHandler(params: {
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
  getMacBundleIdToolName,
  getMacBundleIdToolDescription,
  getMacBundleIdToolSchema,
  getMacBundleIdToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/project-discovery/get_mac_bundle_id.js`:
```javascript
import {
  getMacBundleIdToolName,
  getMacBundleIdToolDescription,
  getMacBundleIdToolSchema,
  getMacBundleIdToolHandler
} from '../../src/tools/bundle-id/index.js';

export default {
  name: getMacBundleIdToolName,
  description: getMacBundleIdToolDescription,
  schema: getMacBundleIdToolSchema,
  handler: getMacBundleIdToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/bundle-id/index.test.ts plugins/project-discovery/get_mac_bundle_id.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import getMacBundleId from './get_mac_bundle_id.js';`
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

# Migration Plan: get_app_bundle_id

## Tool Information
- **Tool Name**: get_app_bundle_id
- **Current Location**: src/tools/bundle-id/index.ts
- **Target Plugin**: plugins/project-discovery/get_app_bundle_id.js
- **Workflow Group**: Project discovery & analysis tools

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/bundle-id/index.ts`, extract the following (inside registerAppBundleIdTool function):

1. **Tool Name** - Find the first parameter to server.tool:
   ```typescript
   export const getAppBundleIdToolName = '<extract_from_server.tool_first_param>';
   ```

2. **Tool Description** - Find the second parameter to server.tool:
   ```typescript
   export const getAppBundleIdToolDescription = '<extract_from_server.tool_second_param>';
   ```

3. **Tool Schema** - Find the third parameter to server.tool:
   ```typescript
   export const getAppBundleIdToolSchema = {
     // Extract the entire schema object from server.tool third param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function getAppBundleIdToolHandler(params: {
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
  getAppBundleIdToolName,
  getAppBundleIdToolDescription,
  getAppBundleIdToolSchema,
  getAppBundleIdToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/project-discovery/get_app_bundle_id.js`:
```javascript
import {
  getAppBundleIdToolName,
  getAppBundleIdToolDescription,
  getAppBundleIdToolSchema,
  getAppBundleIdToolHandler
} from '../../src/tools/bundle-id/index.js';

export default {
  name: getAppBundleIdToolName,
  description: getAppBundleIdToolDescription,
  schema: getAppBundleIdToolSchema,
  handler: getAppBundleIdToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/bundle-id/index.test.ts plugins/project-discovery/get_app_bundle_id.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import getAppBundleId from './get_app_bundle_id.js';`
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
2. get_mac_bundle_id is specifically for macOS apps
3. get_app_bundle_id works for any Apple platform (iOS, iPadOS, watchOS, tvOS, visionOS)
4. Both tools extract bundle identifiers from app bundles (.app directories)
5. The test file needs to be copied twice and edited for each specific tool