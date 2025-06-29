# Migration Plans: macOS Test Tools

This file contains 2 tools that need to be migrated and organized by workspace/project:

## Workspace Tools (target: plugins/macos-workspace/)
1. test_macos_ws

## Project Tools (target: plugins/macos-project/)
2. test_macos_proj

---

# Migration Plan: test_macos_ws

## Tool Information
- **Tool Name**: test_macos_ws
- **Current Location**: src/tools/test-macos/index.ts
- **Target Plugin**: plugins/macos-workspace/test_macos_ws.js
- **Workflow Group**: macOS + Workspace tools

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/test-macos/index.ts`, extract the following (after line with registerTool):

1. **Tool Name** - Find the second parameter to registerTool:
   ```typescript
   export const testMacosWsToolName = '<extract_from_registerTool_second_param>';
   ```

2. **Tool Description** - Find the third parameter to registerTool:
   ```typescript
   export const testMacosWsToolDescription = '<extract_from_registerTool_third_param>';
   ```

3. **Tool Schema** - Find the fourth parameter to registerTool:
   ```typescript
   export const testMacosWsToolSchema = {
     // Extract the entire schema object from registerTool fourth param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function testMacosWsToolHandler(params: {
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
  testMacosWsToolName,
  testMacosWsToolDescription,
  testMacosWsToolSchema,
  testMacosWsToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/macos-workspace/test_macos_ws.js`:
```javascript
import {
  testMacosWsToolName,
  testMacosWsToolDescription,
  testMacosWsToolSchema,
  testMacosWsToolHandler
} from '../../src/tools/test-macos/index.js';

export default {
  name: testMacosWsToolName,
  description: testMacosWsToolDescription,
  schema: testMacosWsToolSchema,
  handler: testMacosWsToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/test-macos/index.test.ts plugins/macos-workspace/test_macos_ws.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import testMacosWs from './test_macos_ws.js';`
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

# Migration Plan: test_macos_proj

## Tool Information
- **Tool Name**: test_macos_proj
- **Current Location**: src/tools/test-macos/index.ts
- **Target Plugin**: plugins/macos-project/test_macos_proj.js
- **Workflow Group**: macOS + Project tools

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/test-macos/index.ts`, extract the following (after line with registerTool):

1. **Tool Name** - Find the second parameter to registerTool:
   ```typescript
   export const testMacosProjToolName = '<extract_from_registerTool_second_param>';
   ```

2. **Tool Description** - Find the third parameter to registerTool:
   ```typescript
   export const testMacosProjToolDescription = '<extract_from_registerTool_third_param>';
   ```

3. **Tool Schema** - Find the fourth parameter to registerTool:
   ```typescript
   export const testMacosProjToolSchema = {
     // Extract the entire schema object from registerTool fourth param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function testMacosProjToolHandler(params: {
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
  testMacosProjToolName,
  testMacosProjToolDescription,
  testMacosProjToolSchema,
  testMacosProjToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/macos-project/test_macos_proj.js`:
```javascript
import {
  testMacosProjToolName,
  testMacosProjToolDescription,
  testMacosProjToolSchema,
  testMacosProjToolHandler
} from '../../src/tools/test-macos/index.js';

export default {
  name: testMacosProjToolName,
  description: testMacosProjToolDescription,
  schema: testMacosProjToolSchema,
  handler: testMacosProjToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/test-macos/index.test.ts plugins/macos-project/test_macos_proj.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import testMacosProj from './test_macos_proj.js';`
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
3. Both tools use handleTestLogic from test-common
4. The test file needs to be copied twice and edited for each specific tool