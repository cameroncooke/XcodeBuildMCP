# XcodeBuildMCP Tool Dependency Analysis

## Dependency Categories

### Level 0: Leaf Tools (No Dependencies)
These tools can be tested first as they don't depend on other tools:

**Project/Workspace Discovery:**
- `discover_projs` - Finds projects in a directory
- `list_schems_proj` - Lists schemes (needs projectPath but can use example projects)
- `list_schems_ws` - Lists schemes (needs workspacePath but can use example projects)

**Simulator Management:**
- `list_sims` - Lists available simulators (no parameters needed)
- `list_devices` - Lists available devices (no parameters needed)

**Swift Package Manager:**
- `swift_package_list` - Lists package info (needs packagePath but can use example SPM project)
- `swift_package_build` - Builds package (needs packagePath)
- `swift_package_clean` - Cleans package (needs packagePath)
- `swift_package_test` - Tests package (needs packagePath)
- `swift_package_run` - Runs package (needs packagePath + executable)
- `swift_package_stop` - Stops package execution

**Project Scaffolding:**
- `scaffold_ios_project` - Creates new iOS project
- `scaffold_macos_project` - Creates new macOS project

**Diagnostic:**
- `diagnostic` - System diagnostic info

### Level 1: Primary Dependencies
These tools depend on Level 0 tools:

**Simulator Operations (depend on list_sims):**
- `boot_sim` - Needs simulatorUuid from list_sims
- `open_sim` - Controls simulator UI
- `reset_simulator_location` - Needs simulatorUuid
- `set_sim_appearance` - Needs simulatorUuid
- `set_simulator_location` - Needs simulatorUuid
- `reset_network_condition` - Needs simulatorUuid
- `set_network_condition` - Needs simulatorUuid

**Build Operations (need project/workspace paths):**
- `build_sim_id_proj` - Needs projectPath + simulatorId from list_sims
- `build_sim_id_ws` - Needs workspacePath + simulatorId from list_sims
- `build_sim_name_proj` - Needs projectPath + simulator name
- `build_sim_name_ws` - Needs workspacePath + simulator name
- `build_dev_proj` - Needs projectPath + deviceId from list_devices
- `build_dev_ws` - Needs workspacePath + deviceId from list_devices
- `build_mac_proj` - Needs projectPath
- `build_mac_ws` - Needs workspacePath
- `clean_proj` - Needs projectPath
- `clean_ws` - Needs workspacePath
- `show_build_set_proj` - Needs projectPath
- `show_build_set_ws` - Needs workspacePath

### Level 2: Secondary Dependencies
These tools depend on Level 1 tools (typically need successful builds):

**Test Operations:**
- `test_sim_id_proj` - Needs build_sim_id_proj to work first
- `test_sim_id_ws` - Needs build_sim_id_ws to work first
- `test_sim_name_proj` - Needs build_sim_name_proj to work first
- `test_sim_name_ws` - Needs build_sim_name_ws to work first
- `test_device_proj` - Needs build_dev_proj to work first
- `test_device_ws` - Needs build_dev_ws to work first
- `test_macos_proj` - Needs build_mac_proj to work first
- `test_macos_ws` - Needs build_mac_ws to work first

**App Path/Bundle Operations:**
- `get_sim_app_path_id_proj` - Needs successful build
- `get_sim_app_path_id_ws` - Needs successful build
- `get_sim_app_path_name_proj` - Needs successful build
- `get_sim_app_path_name_ws` - Needs successful build
- `get_device_app_path_proj` - Needs successful build
- `get_device_app_path_ws` - Needs successful build
- `get_mac_app_path_proj` - Needs successful build
- `get_mac_app_path_ws` - Needs successful build
- `get_app_bundle_id` - Needs app path
- `get_mac_bundle_id` - Needs app path

**Build & Run Operations:**
- `build_run_sim_id_proj` - Combines build + launch
- `build_run_sim_id_ws` - Combines build + launch
- `build_run_sim_name_proj` - Combines build + launch
- `build_run_sim_name_ws` - Combines build + launch
- `build_run_mac_proj` - Combines build + launch
- `build_run_mac_ws` - Combines build + launch

### Level 3: Tertiary Dependencies
These need apps to be built and installed:

**App Installation:**
- `install_app_sim` - Needs app path from get_*_app_path_*
- `install_app_device` - Needs app path from get_*_app_path_*

**App Lifecycle:**
- `launch_app_sim` - Needs app to be installed
- `launch_app_sim_name_ws` - Needs app to be installed
- `launch_app_device` - Needs app to be installed
- `launch_mac_app` - Needs app to be built
- `launch_app_logs_sim` - Needs app to be launched
- `stop_app_sim` - Needs app to be running
- `stop_app_sim_name_ws` - Needs app to be running
- `stop_app_device` - Needs app to be running
- `stop_mac_app` - Needs app to be running

**Logging:**
- `start_sim_log_cap` - Needs simulator booted
- `start_device_log_cap` - Needs device connected
- `stop_sim_log_cap` - Needs logging to be started
- `stop_device_log_cap` - Needs logging to be started

### Level 4: UI Testing Dependencies
These need apps to be running and visible:

**UI Interaction:**
- `describe_ui` - Needs app running and visible
- `screenshot` - Needs simulator/device ready
- `tap` - Needs UI elements (from describe_ui)
- `touch` - Needs UI elements
- `button` - Needs UI elements
- `swipe` - Needs UI running
- `long_press` - Needs UI elements
- `gesture` - Needs UI running
- `key_press` - Needs app focused
- `key_sequence` - Needs app focused
- `type_text` - Needs text field focused

## Testing Order Strategy

1. **Level 0** (Leaf tools) - Test completely standalone
2. **Level 1** (Primary deps) - Use results from Level 0
3. **Level 2** (Secondary deps) - Use results from Levels 0-1
4. **Level 3** (Tertiary deps) - Use results from Levels 0-2
5. **Level 4** (UI deps) - Use results from all previous levels

## Available Test Resources

**Projects:**
- `/Volumes/Developer/XcodeBuildMCP/example_projects/iOS/MCPTest.xcodeproj`
- `/Volumes/Developer/XcodeBuildMCP/example_projects/iOS_Calculator/CalculatorApp.xcworkspace`
- `/Volumes/Developer/XcodeBuildMCP/example_projects/macOS/MCPTest.xcodeproj`
- `/Volumes/Developer/XcodeBuildMCP/example_projects/spm/Package.swift`

**Key Principle:** Sub-agents MUST call dependency tools to get real parameters, never use fake/placeholder values.