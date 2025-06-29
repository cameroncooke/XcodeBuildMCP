# Migration Plans: macOS Build Tools

This file contains 4 tools that need to be migrated and organized by workspace/project:

## Workspace Tools (target: plugins/macos-workspace/)
1. build_mac_ws
2. build_run_mac_ws

## Project Tools (target: plugins/macos-project/)
3. build_mac_proj
4. build_run_mac_proj

---

# Migration Plan: build_mac_ws

## Tool Information
- **Tool Name**: build_mac_ws
- **Current Location**: src/tools/build-macos/index.ts
- **Target Plugin**: plugins/macos-workspace/build_mac_ws.js
- **Workflow Group**: macOS + Workspace tools

## Migration Process

### Step 1: Extract Components from Original File

From `src/tools/build-macos/index.ts`, extract the following (after line with registerTool):

1. **Tool Name** - Find the second parameter to registerTool:
   ```typescript
   export const buildMacWsToolName = '<extract_from_registerTool_second_param>';
   ```

2. **Tool Description** - Find the third parameter to registerTool:
   ```typescript
   export const buildMacWsToolDescription = '<extract_from_registerTool_third_param>';
   ```

3. **Tool Schema** - Find the fourth parameter to registerTool:
   ```typescript
   export const buildMacWsToolSchema = {
     // Extract the entire schema object from registerTool fourth param
   };
   ```

4. **Tool Handler** - Extract the handler function:
   ```typescript
   export async function buildMacWsToolHandler(params: {
     // Extract parameter type from handler function
   }): Promise<ToolResponse> {
     // CUT the handler function body from inside registerTool
     // PASTE it here
   }
   ```

### Step 2: Update Original registerTool Call

Replace the registerTool call with:
```typescript
registerTool<WorkspaceParams>(
  server,
  buildMacWsToolName,
  buildMacWsToolDescription,
  buildMacWsToolSchema,
  buildMacWsToolHandler
);
```

### Step 3: Create Plugin File

Create `plugins/macos-workspace/build_mac_ws.js`:
```javascript
import {
  buildMacWsToolName,
  buildMacWsToolDescription,
  buildMacWsToolSchema,
  buildMacWsToolHandler
} from '../../src/tools/build-macos/index.js';

export default {
  name: buildMacWsToolName,
  description: buildMacWsToolDescription,
  schema: buildMacWsToolSchema,
  handler: buildMacWsToolHandler,
};
```

### Step 4: Create Plugin Test File

1. Copy the original test file:
   ```bash
   cp src/tools/build-macos/index.test.ts plugins/macos-workspace/build_mac_ws.test.ts
   ```

2. Surgically edit the test file:
   - Update import to: `import buildMacWs from './build_mac_ws.js';`
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

# Migration Plan: build_run_mac_ws

## Tool Information
- **Tool Name**: build_run_mac_ws
- **Current Location**: src/tools/build-macos/index.ts
- **Target Plugin**: plugins/macos-workspace/build_run_mac_ws.js
- **Workflow Group**: macOS + Workspace tools

## Migration Process

Follows standard migration pattern...

---

# Migration Plan: build_mac_proj

## Tool Information
- **Tool Name**: build_mac_proj
- **Current Location**: src/tools/build-macos/index.ts
- **Target Plugin**: plugins/macos-project/build_mac_proj.js
- **Workflow Group**: macOS + Project tools

## Migration Process

Follows standard migration pattern...

---

# Migration Plan: build_run_mac_proj

## Tool Information
- **Tool Name**: build_run_mac_proj
- **Current Location**: src/tools/build-macos/index.ts
- **Target Plugin**: plugins/macos-project/build_run_mac_proj.js
- **Workflow Group**: macOS + Project tools

## Migration Process

Follows standard migration pattern...

---

## Special Considerations

1. All 4 tools are in the same file, so extract all 4 sets of exports at once (16 total exports)
2. Tools are split between workspace and project variants
3. Build and build_run variants exist for both workspace and project
4. Tools support architecture-specific builds (arm64 or x86_64)
5. The test file needs to be copied 4 times and edited for each specific tool