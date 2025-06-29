# Migration Plans: Clean Tools

This file contains 2 tools that need to be migrated to plugins/utilities/:

1. clean_ws
2. clean_proj

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

# Migration Plan: clean_ws

## Tool Information
- **Tool Name**: clean_ws
- **Current Location**: src/tools/clean/index.ts
- **Target Plugin**: plugins/utilities/clean_ws.js
- **Workflow Group**: General utilities

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/clean/index.ts`, extract the following (inside registerCleanWorkspaceTool function):

1. **Tool Name** - Find the first parameter to server.tool:
   ```typescript
   export const cleanWsToolName = '<extract_from_server.tool_first_param>';
   ```

2. **Tool Description** - Find the second parameter to server.tool:
   ```typescript
   export const cleanWsToolDescription = '<extract_from_server.tool_second_param>';
   ```

3. **Tool Schema** - Find the third parameter to server.tool:
   ```typescript
   export const cleanWsToolSchema = {
     // Extract the entire schema object from server.tool third param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function cleanWsToolHandler(params: {
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
  cleanWsToolName,
  cleanWsToolDescription,
  cleanWsToolSchema,
  cleanWsToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/utilities/clean_ws.js`:
```javascript
import {
  cleanWsToolName,
  cleanWsToolDescription,
  cleanWsToolSchema,
  cleanWsToolHandler
} from '../../src/tools/clean/index.js';

export default {
  name: cleanWsToolName,
  description: cleanWsToolDescription,
  schema: cleanWsToolSchema,
  handler: cleanWsToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/clean/index.test.ts plugins/utilities/clean_ws.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import cleanWs from './clean_ws.js';`
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

# Migration Plan: clean_proj

## Tool Information
- **Tool Name**: clean_proj
- **Current Location**: src/tools/clean/index.ts
- **Target Plugin**: plugins/utilities/clean_proj.js
- **Workflow Group**: General utilities

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/clean/index.ts`, extract the following (inside registerCleanProjectTool function):

1. **Tool Name** - Find the first parameter to server.tool:
   ```typescript
   export const cleanProjToolName = '<extract_from_server.tool_first_param>';
   ```

2. **Tool Description** - Find the second parameter to server.tool:
   ```typescript
   export const cleanProjToolDescription = '<extract_from_server.tool_second_param>';
   ```

3. **Tool Schema** - Find the third parameter to server.tool:
   ```typescript
   export const cleanProjToolSchema = {
     // Extract the entire schema object from server.tool third param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function cleanProjToolHandler(params: {
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
  cleanProjToolName,
  cleanProjToolDescription,
  cleanProjToolSchema,
  cleanProjToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/utilities/clean_proj.js`:
```javascript
import {
  cleanProjToolName,
  cleanProjToolDescription,
  cleanProjToolSchema,
  cleanProjToolHandler
} from '../../src/tools/clean/index.js';

export default {
  name: cleanProjToolName,
  description: cleanProjToolDescription,
  schema: cleanProjToolSchema,
  handler: cleanProjToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/clean/index.test.ts plugins/utilities/clean_proj.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import cleanProj from './clean_proj.js';`
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
2. clean_ws cleans build products for workspaces
3. clean_proj cleans build products for projects
4. Both tools use xcodebuild clean command
5. The test file needs to be copied twice and edited for each specific tool