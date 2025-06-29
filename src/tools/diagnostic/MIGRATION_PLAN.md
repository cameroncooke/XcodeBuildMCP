# Migration Plans: Diagnostic Tool

This file contains 1 tool that needs to be migrated to plugins/diagnostics/:

1. diagnostic

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

# Migration Plan: diagnostic

## Tool Information
- **Tool Name**: diagnostic
- **Current Location**: src/tools/diagnostic/index.ts
- **Target Plugin**: plugins/diagnostics/diagnostic.js
- **Workflow Group**: Diagnostic tools

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/diagnostic/index.ts`, extract the following (inside registerDiagnosticTool function):

1. **Tool Name** - Find the first parameter to server.tool:
   ```typescript
   export const diagnosticToolName = '<extract_from_server.tool_first_param>';
   ```

2. **Tool Description** - Find the second parameter to server.tool:
   ```typescript
   export const diagnosticToolDescription = '<extract_from_server.tool_second_param>';
   ```

3. **Tool Schema** - Find the third parameter to server.tool:
   ```typescript
   export const diagnosticToolSchema = {
     // Extract the entire schema object from server.tool third param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function diagnosticToolHandler(params: {
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
  diagnosticToolName,
  diagnosticToolDescription,
  diagnosticToolSchema,
  diagnosticToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/diagnostics/diagnostic.js`:
```javascript
import {
  diagnosticToolName,
  diagnosticToolDescription,
  diagnosticToolSchema,
  diagnosticToolHandler
} from '../../src/tools/diagnostic/index.js';

export default {
  name: diagnosticToolName,
  description: diagnosticToolDescription,
  schema: diagnosticToolSchema,
  handler: diagnosticToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/diagnostic/index.test.ts plugins/diagnostics/diagnostic.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import diagnostic from './diagnostic.js';`
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
2. Diagnostic tool provides comprehensive system information
3. Checks Xcode version, dependencies, environment
4. Special tool that requires XCODEBUILDMCP_DEBUG=true to register
5. The tool is conditionally registered based on debug flag