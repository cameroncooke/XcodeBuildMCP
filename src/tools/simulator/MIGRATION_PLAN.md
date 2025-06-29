# Migration Plans: Simulator Utility Tools

This file contains 12 tools that need to be migrated to plugins/simulator-utilities/:

1. boot_sim
2. list_sims
3. install_app_sim
4. launch_app_sim
5. launch_app_logs_sim
6. open_sim
7. set_sim_appearance
8. set_simulator_location
9. reset_simulator_location
10. set_network_condition
11. reset_network_condition
12. stop_app_sim

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

# Migration Plan: boot_sim

## Tool Information
- **Tool Name**: boot_sim
- **Current Location**: src/tools/simulator/index.ts
- **Target Plugin**: plugins/simulator-utilities/boot_sim.js
- **Workflow Group**: Simulator management tools

## Migration Process

Follows standard pattern but for server.tool instead of registerTool...

---

# Migration Plan: list_sims

## Tool Information
- **Tool Name**: list_sims
- **Current Location**: src/tools/simulator/index.ts
- **Target Plugin**: plugins/simulator-utilities/list_sims.js
- **Workflow Group**: Simulator management tools

Same pattern...

---

# Migration Plan: install_app_sim

## Tool Information
- **Tool Name**: install_app_sim
- **Current Location**: src/tools/simulator/index.ts
- **Target Plugin**: plugins/simulator-utilities/install_app_sim.js
- **Workflow Group**: Simulator management tools

Same pattern...

---

# Migration Plan: launch_app_sim

## Tool Information
- **Tool Name**: launch_app_sim
- **Current Location**: src/tools/simulator/index.ts
- **Target Plugin**: plugins/simulator-utilities/launch_app_sim.js
- **Workflow Group**: Simulator management tools

Same pattern...

---

# Migration Plan: launch_app_logs_sim

## Tool Information
- **Tool Name**: launch_app_logs_sim
- **Current Location**: src/tools/simulator/index.ts
- **Target Plugin**: plugins/simulator-utilities/launch_app_logs_sim.js
- **Workflow Group**: Simulator management tools

Same pattern...

---

# Migration Plan: open_sim

## Tool Information
- **Tool Name**: open_sim
- **Current Location**: src/tools/simulator/index.ts
- **Target Plugin**: plugins/simulator-utilities/open_sim.js
- **Workflow Group**: Simulator management tools

Same pattern...

---

# Migration Plan: set_sim_appearance

## Tool Information
- **Tool Name**: set_sim_appearance
- **Current Location**: src/tools/simulator/index.ts
- **Target Plugin**: plugins/simulator-utilities/set_sim_appearance.js
- **Workflow Group**: Simulator management tools

Same pattern...

---

# Migration Plan: set_simulator_location

## Tool Information
- **Tool Name**: set_simulator_location
- **Current Location**: src/tools/simulator/index.ts
- **Target Plugin**: plugins/simulator-utilities/set_simulator_location.js
- **Workflow Group**: Simulator management tools

Same pattern...

---

# Migration Plan: reset_simulator_location

## Tool Information
- **Tool Name**: reset_simulator_location
- **Current Location**: src/tools/simulator/index.ts
- **Target Plugin**: plugins/simulator-utilities/reset_simulator_location.js
- **Workflow Group**: Simulator management tools

Same pattern...

---

# Migration Plan: set_network_condition

## Tool Information
- **Tool Name**: set_network_condition
- **Current Location**: src/tools/simulator/index.ts
- **Target Plugin**: plugins/simulator-utilities/set_network_condition.js
- **Workflow Group**: Simulator management tools

Same pattern...

---

# Migration Plan: reset_network_condition

## Tool Information
- **Tool Name**: reset_network_condition
- **Current Location**: src/tools/simulator/index.ts
- **Target Plugin**: plugins/simulator-utilities/reset_network_condition.js
- **Workflow Group**: Simulator management tools

Same pattern...

---

# Migration Plan: stop_app_sim

## Tool Information
- **Tool Name**: stop_app_sim
- **Current Location**: src/tools/simulator/index.ts
- **Target Plugin**: plugins/simulator-utilities/stop_app_sim.js
- **Workflow Group**: Simulator management tools

Same pattern...

---

## Special Considerations

1. All tools use server.tool() instead of registerTool()
2. Extract all 12 sets of exports at once (48 total exports)
3. Update all 12 server.tool calls
4. Create 12 plugin files in simulator-utilities/
5. The test pattern is the same - copy and surgically edit