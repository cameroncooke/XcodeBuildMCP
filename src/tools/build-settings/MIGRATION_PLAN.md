# Migration Plans: Build Settings Tools

This file contains 4 tools that need to be migrated to plugins/project-discovery/:

## Build Settings Tools
1. show_build_set_ws
2. show_build_set_proj

## Scheme Listing Tools
3. list_schems_ws
4. list_schems_proj

---

# Migration Plan: show_build_set_ws

## Tool Information
- **Tool Name**: show_build_set_ws
- **Current Location**: src/tools/build-settings/index.ts
- **Target Plugin**: plugins/project-discovery/show_build_set_ws.js
- **Workflow Group**: Project discovery & analysis tools

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/build-settings/index.ts`, extract the following (after line with registerTool):

1. **Tool Name** - Find the second parameter to registerTool:
   ```typescript
   export const showBuildSetWsToolName = '<extract_from_registerTool_second_param>';
   ```

2. **Tool Description** - Find the third parameter to registerTool:
   ```typescript
   export const showBuildSetWsToolDescription = '<extract_from_registerTool_third_param>';
   ```

3. **Tool Schema** - Find the fourth parameter to registerTool:
   ```typescript
   export const showBuildSetWsToolSchema = {
     // Extract the entire schema object from registerTool fourth param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function showBuildSetWsToolHandler(params: {
     // Extract parameter type from handler function
   }): Promise<ToolResponse> {
     // CUT the handler function body from inside registerTool
     // PASTE it here
   }
   ```

### Step 2: Update Original registerTool Call

Replace the registerTool call with:
```typescript
registerTool<BaseWorkspaceParams>(
  server,
  showBuildSetWsToolName,
  showBuildSetWsToolDescription,
  showBuildSetWsToolSchema,
  showBuildSetWsToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/project-discovery/show_build_set_ws.js`:
```javascript
import {
  showBuildSetWsToolName,
  showBuildSetWsToolDescription,
  showBuildSetWsToolSchema,
  showBuildSetWsToolHandler
} from '../../src/tools/build-settings/index.js';

export default {
  name: showBuildSetWsToolName,
  description: showBuildSetWsToolDescription,
  schema: showBuildSetWsToolSchema,
  handler: showBuildSetWsToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/build-settings/index.test.ts plugins/project-discovery/show_build_set_ws.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import showBuildSetWs from './show_build_set_ws.js';`
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

# Migration Plan: show_build_set_proj

## Tool Information
- **Tool Name**: show_build_set_proj
- **Current Location**: src/tools/build-settings/index.ts
- **Target Plugin**: plugins/project-discovery/show_build_set_proj.js
- **Workflow Group**: Project discovery & analysis tools

## Migration Process

Follows standard migration pattern...

---

# Migration Plan: list_schems_ws

## Tool Information
- **Tool Name**: list_schems_ws
- **Current Location**: src/tools/build-settings/index.ts
- **Target Plugin**: plugins/project-discovery/list_schems_ws.js
- **Workflow Group**: Project discovery & analysis tools

## Migration Process

Follows standard migration pattern...

---

# Migration Plan: list_schems_proj

## Tool Information
- **Tool Name**: list_schems_proj
- **Current Location**: src/tools/build-settings/index.ts
- **Target Plugin**: plugins/project-discovery/list_schems_proj.js
- **Workflow Group**: Project discovery & analysis tools

## Migration Process

Follows standard migration pattern...

---

## Special Considerations

1. All 4 tools are in the same file, so extract all 4 sets of exports at once (16 total exports)
2. Tools are split between workspace and project variants
3. show_build_set_* tools display build settings
4. list_schems_* tools list available schemes
5. The test file needs to be copied 4 times and edited for each specific tool