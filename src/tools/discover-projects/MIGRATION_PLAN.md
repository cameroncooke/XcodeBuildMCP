# Migration Plans: Discover Projects Tool

This file contains 1 tool that needs to be migrated to plugins/project-discovery/:

1. discover_projs

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

# Migration Plan: discover_projs

## Tool Information
- **Tool Name**: discover_projs
- **Current Location**: src/tools/discover-projects/index.ts
- **Target Plugin**: plugins/project-discovery/discover_projs.js
- **Workflow Group**: Project discovery & analysis tools

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/discover-projects/index.ts`, extract the following (inside registerDiscoverProjectsTool function):

1. **Tool Name** - Find the first parameter to server.tool:
   ```typescript
   export const discoverProjsToolName = '<extract_from_server.tool_first_param>';
   ```

2. **Tool Description** - Find the second parameter to server.tool:
   ```typescript
   export const discoverProjsToolDescription = '<extract_from_server.tool_second_param>';
   ```

3. **Tool Schema** - Find the third parameter to server.tool:
   ```typescript
   export const discoverProjsToolSchema = {
     // Extract the entire schema object from server.tool third param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function discoverProjsToolHandler(params: {
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
  discoverProjsToolName,
  discoverProjsToolDescription,
  discoverProjsToolSchema,
  discoverProjsToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/project-discovery/discover_projs.js`:
```javascript
import {
  discoverProjsToolName,
  discoverProjsToolDescription,
  discoverProjsToolSchema,
  discoverProjsToolHandler
} from '../../src/tools/discover-projects/index.js';

export default {
  name: discoverProjsToolName,
  description: discoverProjsToolDescription,
  schema: discoverProjsToolSchema,
  handler: discoverProjsToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/discover-projects/index.test.ts plugins/project-discovery/discover_projs.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import discoverProjs from './discover_projs.js';`
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
2. Discovers Xcode project (.xcodeproj) and workspace (.xcworkspace) files
3. Recursively scans directories with configurable depth
4. Returns hierarchical project structure information