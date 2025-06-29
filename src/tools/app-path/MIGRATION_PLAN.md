# Migration Plans: App Path Tools

This file contains 8 tools that need to be migrated and organized by platform and workspace/project:

## macOS Tools
- **Workspace** (target: plugins/macos-workspace/)
  1. get_mac_app_path_ws
- **Project** (target: plugins/macos-project/)
  2. get_mac_app_path_proj

## Device Tools
- **Workspace** (target: plugins/device-workspace/)
  3. get_device_app_path_ws
- **Project** (target: plugins/device-project/)
  4. get_device_app_path_proj

## Simulator Tools
- **Workspace** (target: plugins/simulator-workspace/)
  5. get_sim_app_path_name_ws
  6. get_sim_app_path_id_ws
- **Project** (target: plugins/simulator-project/)
  7. get_sim_app_path_name_proj
  8. get_sim_app_path_id_proj

---

# Migration Plan: get_mac_app_path_ws

## Tool Information
- **Tool Name**: get_mac_app_path_ws
- **Current Location**: src/tools/app-path/index.ts
- **Target Plugin**: plugins/macos-workspace/get_mac_app_path_ws.js
- **Workflow Group**: macOS + Workspace tools

## Migration Process

Follows standard migration pattern...

---

# Migration Plan: get_mac_app_path_proj

## Tool Information
- **Tool Name**: get_mac_app_path_proj
- **Current Location**: src/tools/app-path/index.ts
- **Target Plugin**: plugins/macos-project/get_mac_app_path_proj.js
- **Workflow Group**: macOS + Project tools

Follows standard migration pattern...

---

# Migration Plan: get_device_app_path_ws

## Tool Information
- **Tool Name**: get_device_app_path_ws
- **Current Location**: src/tools/app-path/index.ts
- **Target Plugin**: plugins/device-workspace/get_device_app_path_ws.js
- **Workflow Group**: Device + Workspace tools

Follows standard migration pattern...

---

# Migration Plan: get_device_app_path_proj

## Tool Information
- **Tool Name**: get_device_app_path_proj
- **Current Location**: src/tools/app-path/index.ts
- **Target Plugin**: plugins/device-project/get_device_app_path_proj.js
- **Workflow Group**: Device + Project tools

Follows standard migration pattern...

---

# Migration Plan: get_sim_app_path_name_ws

## Tool Information
- **Tool Name**: get_sim_app_path_name_ws
- **Current Location**: src/tools/app-path/index.ts
- **Target Plugin**: plugins/simulator-workspace/get_sim_app_path_name_ws.js
- **Workflow Group**: Simulator + Workspace tools

Follows standard migration pattern...

---

# Migration Plan: get_sim_app_path_name_proj

## Tool Information
- **Tool Name**: get_sim_app_path_name_proj
- **Current Location**: src/tools/app-path/index.ts
- **Target Plugin**: plugins/simulator-project/get_sim_app_path_name_proj.js
- **Workflow Group**: Simulator + Project tools

Follows standard migration pattern...

---

# Migration Plan: get_sim_app_path_id_ws

## Tool Information
- **Tool Name**: get_sim_app_path_id_ws
- **Current Location**: src/tools/app-path/index.ts
- **Target Plugin**: plugins/simulator-workspace/get_sim_app_path_id_ws.js
- **Workflow Group**: Simulator + Workspace tools

Follows standard migration pattern...

---

# Migration Plan: get_sim_app_path_id_proj

## Tool Information
- **Tool Name**: get_sim_app_path_id_proj
- **Current Location**: src/tools/app-path/index.ts
- **Target Plugin**: plugins/simulator-project/get_sim_app_path_id_proj.js
- **Workflow Group**: Simulator + Project tools

Follows standard migration pattern...

---

## Special Considerations

1. Tools are organized by platform (macOS, Device, Simulator) and then by workspace/project
2. Extract all 8 sets of exports at once (32 total exports)
3. Update all 8 registerTool calls
4. Create plugins in appropriate folders based on platform and type
5. Test file needs to be copied 8 times and edited for each specific tool