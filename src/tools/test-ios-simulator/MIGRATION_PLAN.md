# Migration Plans: iOS Simulator Test Tools

This file contains 4 tools that need to be migrated and organized by workspace/project:

## Workspace Tools (target: plugins/simulator-workspace/)
1. test_sim_name_ws
2. test_sim_id_ws

## Project Tools (target: plugins/simulator-project/)
3. test_sim_name_proj
4. test_sim_id_proj

---

# Migration Plan: test_sim_name_ws

## Tool Information
- **Tool Name**: test_sim_name_ws
- **Current Location**: src/tools/test-ios-simulator/index.ts
- **Target Plugin**: plugins/simulator-workspace/test_sim_name_ws.js
- **Workflow Group**: Simulator + Workspace tools

## Migration Process

Follows standard migration pattern...

---

# Migration Plan: test_sim_id_ws

## Tool Information
- **Tool Name**: test_sim_id_ws
- **Current Location**: src/tools/test-ios-simulator/index.ts
- **Target Plugin**: plugins/simulator-workspace/test_sim_id_ws.js
- **Workflow Group**: Simulator + Workspace tools

Follows standard migration pattern...

---

# Migration Plan: test_sim_name_proj

## Tool Information
- **Tool Name**: test_sim_name_proj
- **Current Location**: src/tools/test-ios-simulator/index.ts
- **Target Plugin**: plugins/simulator-project/test_sim_name_proj.js
- **Workflow Group**: Simulator + Project tools

Follows standard migration pattern...

---

# Migration Plan: test_sim_id_proj

## Tool Information
- **Tool Name**: test_sim_id_proj
- **Current Location**: src/tools/test-ios-simulator/index.ts
- **Target Plugin**: plugins/simulator-project/test_sim_id_proj.js
- **Workflow Group**: Simulator + Project tools

Follows standard migration pattern...

---

## Special Considerations

Since all 4 tools are in the same file:
1. Extract all 4 sets of exports at once (16 total exports)
2. Update all 4 registerTool calls
3. Create 2 plugin files in simulator-workspace/
4. Create 2 plugin files in simulator-project/
5. Copy the test file 4 times and edit each for its specific tool