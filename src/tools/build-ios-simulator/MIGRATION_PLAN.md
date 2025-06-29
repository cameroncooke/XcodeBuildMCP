# Migration Plans: iOS Simulator Build Tools

This file contains 8 tools that need to be migrated and organized by workspace/project:

## Workspace Tools (target: plugins/simulator-workspace/)
1. build_sim_name_ws
2. build_sim_id_ws
3. build_run_sim_name_ws
4. build_run_sim_id_ws

## Project Tools (target: plugins/simulator-project/)
5. build_sim_name_proj
6. build_sim_id_proj
7. build_run_sim_name_proj
8. build_run_sim_id_proj

---

# Migration Plan: build_sim_name_ws

## Tool Information
- **Tool Name**: build_sim_name_ws
- **Current Location**: src/tools/build-ios-simulator/index.ts
- **Target Plugin**: plugins/simulator-workspace/build_sim_name_ws.js
- **Workflow Group**: Simulator + Workspace tools

## Migration Process

### Step 1: Validate Existing Tool Works
```bash
npm test -- src/tools/build-ios-simulator/index.test.ts
```
Expected: All existing tests pass

### Step 2: Surgical Edits to Tool File

Add 4 exports BEFORE the first registerTool function:

```typescript
// GENERIC PATTERN:
export const buildSimNameWsToolName = '<extract_from_registerTool_second_param>';
export const buildSimNameWsToolDescription = '<extract_from_registerTool_third_param>';
export const buildSimNameWsToolSchema = {
  // Extract the entire schema object from registerTool fourth param
};
export async function buildSimNameWsToolHandler(params: {
  // Extract parameter type from handler function
}): Promise<ToolResponse> {
  // CUT the handler function body from inside registerTool
  // PASTE it here
}
```

Follow standard pattern for remaining steps...

---

# Migration Plan: build_sim_id_ws

## Tool Information
- **Tool Name**: build_sim_id_ws
- **Current Location**: src/tools/build-ios-simulator/index.ts
- **Target Plugin**: plugins/simulator-workspace/build_sim_id_ws.js
- **Workflow Group**: Simulator + Workspace tools

Same pattern as above for the second registerTool call...

---

# Migration Plan: build_run_sim_name_ws

## Tool Information
- **Tool Name**: build_run_sim_name_ws
- **Current Location**: src/tools/build-ios-simulator/index.ts
- **Target Plugin**: plugins/simulator-workspace/build_run_sim_name_ws.js
- **Workflow Group**: Simulator + Workspace tools

Same pattern...

---

# Migration Plan: build_run_sim_id_ws

## Tool Information
- **Tool Name**: build_run_sim_id_ws
- **Current Location**: src/tools/build-ios-simulator/index.ts
- **Target Plugin**: plugins/simulator-workspace/build_run_sim_id_ws.js
- **Workflow Group**: Simulator + Workspace tools

Same pattern...

---

# Migration Plan: build_sim_name_proj

## Tool Information
- **Tool Name**: build_sim_name_proj
- **Current Location**: src/tools/build-ios-simulator/index.ts
- **Target Plugin**: plugins/simulator-project/build_sim_name_proj.js
- **Workflow Group**: Simulator + Project tools

Same pattern but different target folder...

---

# Migration Plan: build_sim_id_proj

## Tool Information
- **Tool Name**: build_sim_id_proj
- **Current Location**: src/tools/build-ios-simulator/index.ts
- **Target Plugin**: plugins/simulator-project/build_sim_id_proj.js
- **Workflow Group**: Simulator + Project tools

Same pattern...

---

# Migration Plan: build_run_sim_name_proj

## Tool Information
- **Tool Name**: build_run_sim_name_proj
- **Current Location**: src/tools/build-ios-simulator/index.ts
- **Target Plugin**: plugins/simulator-project/build_run_sim_name_proj.js
- **Workflow Group**: Simulator + Project tools

Same pattern...

---

# Migration Plan: build_run_sim_id_proj

## Tool Information
- **Tool Name**: build_run_sim_id_proj
- **Current Location**: src/tools/build-ios-simulator/index.ts
- **Target Plugin**: plugins/simulator-project/build_run_sim_id_proj.js
- **Workflow Group**: Simulator + Project tools

Same pattern...

---

## Special Considerations

Since all 8 tools are in the same file:
1. Extract all 8 sets of exports at once (32 total exports)
2. Update all 8 registerTool calls
3. Create 4 plugin files in simulator-workspace/
4. Create 4 plugin files in simulator-project/
5. Copy the test file 8 times and edit each for its specific tool
6. The original test file likely tests multiple tools - each plugin test should only test its specific tool