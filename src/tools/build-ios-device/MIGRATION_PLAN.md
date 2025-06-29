# Migration Plans: Device Build Tools

This file contains 2 tools that need to be migrated and organized by workspace/project:

## Workspace Tools (target: plugins/device-workspace/)
1. build_dev_ws

## Project Tools (target: plugins/device-project/)
2. build_dev_proj

---

# Migration Plan: build_dev_ws

## Tool Information
- **Tool Name**: build_dev_ws
- **Current Location**: src/tools/build-ios-device/index.ts
- **Target Plugin**: plugins/device-workspace/build_dev_ws.js
- **Workflow Group**: Device + Workspace tools

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/build-ios-device/index.ts`, extract the following (after line with registerTool):

1. **Tool Name** - Find the second parameter to registerTool:
   ```typescript
   export const buildDevWsToolName = '<extract_from_registerTool_second_param>';
   ```

2. **Tool Description** - Find the third parameter to registerTool:
   ```typescript
   export const buildDevWsToolDescription = '<extract_from_registerTool_third_param>';
   ```

3. **Tool Schema** - Find the fourth parameter to registerTool:
   ```typescript
   export const buildDevWsToolSchema = {
     // Extract the entire schema object from registerTool fourth param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function buildDevWsToolHandler(params: {
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
  buildDevWsToolName,
  buildDevWsToolDescription,
  buildDevWsToolSchema,
  buildDevWsToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/device-workspace/build_dev_ws.js`:
```javascript
import {
  buildDevWsToolName,
  buildDevWsToolDescription,
  buildDevWsToolSchema,
  buildDevWsToolHandler
} from '../../src/tools/build-ios-device/index.js';

export default {
  name: buildDevWsToolName,
  description: buildDevWsToolDescription,
  schema: buildDevWsToolSchema,
  handler: buildDevWsToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/build-ios-device/index.test.ts plugins/device-workspace/build_dev_ws.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import buildDevWs from './build_dev_ws.js';`
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

# Migration Plan: build_dev_proj

## Tool Information
- **Tool Name**: build_dev_proj
- **Current Location**: src/tools/build-ios-device/index.ts
- **Target Plugin**: plugins/device-project/build_dev_proj.js
- **Workflow Group**: Device + Project tools

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/build-ios-device/index.ts`, extract the following (after line with registerTool):

1. **Tool Name** - Find the second parameter to registerTool:
   ```typescript
   export const buildDevProjToolName = '<extract_from_registerTool_second_param>';
   ```

2. **Tool Description** - Find the third parameter to registerTool:
   ```typescript
   export const buildDevProjToolDescription = '<extract_from_registerTool_third_param>';
   ```

3. **Tool Schema** - Find the fourth parameter to registerTool:
   ```typescript
   export const buildDevProjToolSchema = {
     // Extract the entire schema object from registerTool fourth param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function buildDevProjToolHandler(params: {
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
  buildDevProjToolName,
  buildDevProjToolDescription,
  buildDevProjToolSchema,
  buildDevProjToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/device-project/build_dev_proj.js`:
```javascript
import {
  buildDevProjToolName,
  buildDevProjToolDescription,
  buildDevProjToolSchema,
  buildDevProjToolHandler
} from '../../src/tools/build-ios-device/index.js';

export default {
  name: buildDevProjToolName,
  description: buildDevProjToolDescription,
  schema: buildDevProjToolSchema,
  handler: buildDevProjToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/build-ios-device/index.test.ts plugins/device-project/build_dev_proj.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import buildDevProj from './build_dev_proj.js';`
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
3. The test file needs to be copied twice and edited for each specific tool