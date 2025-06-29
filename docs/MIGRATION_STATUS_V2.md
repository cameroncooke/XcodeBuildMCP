# Migration Status Summary V2 (With Re-export Strategy)

## Migration Progress
- **Total Tools**: 81 + 1 diagnostic = 82 tools
- **Migrated**: 65 tools ✅
  - `swift_package_build` (example)
  - `swift_package_test` (first migration)
  - `swift_package_run` (second migration)
  - `swift_package_list` (third migration)
  - `swift_package_stop` (fourth migration)
  - `swift_package_clean` (fifth migration - Swift Package group complete!)
  - `boot_sim` (sixth migration - first simulator utility)
  - `list_sims` (seventh migration - second simulator utility)
  - `install_app_sim` (eighth migration - third simulator utility, delegated to sub-agent)
  - `launch_app_sim` (ninth migration - fourth simulator utility, delegated to sub-agent)
  - `launch_app_logs_sim` (tenth migration - fifth simulator utility, delegated to sub-agent)
  - `open_sim` (eleventh migration - sixth simulator utility, delegated to sub-agent)
  - `set_sim_appearance` (twelfth migration - seventh simulator utility, delegated to sub-agent)
  - `set_simulator_location` (thirteenth migration - eighth simulator utility, delegated to sub-agent)
  - `reset_simulator_location` (fourteenth migration - ninth simulator utility, delegated to sub-agent)
  - `set_network_condition` (fifteenth migration - tenth simulator utility, delegated to sub-agent)
  - `reset_network_condition` (sixteenth migration - eleventh simulator utility, delegated to sub-agent)
  - `stop_app_sim` (seventeenth migration - twelfth simulator utility, delegated to sub-agent)
  - `start_sim_log_cap` (eighteenth migration - thirteenth simulator utility, delegated to sub-agent)
  - `stop_sim_log_cap` (nineteenth migration - fourteenth simulator utility, delegated to sub-agent)
  - `describe_ui` (twentieth migration - fifteenth simulator utility, delegated to sub-agent) ✅ **SIMULATOR UTILITIES COMPLETE!**
  - `tap` (twenty-first migration - first ui-testing tool, delegated to sub-agent)
  - `long_press` (twenty-second migration - second ui-testing tool, delegated to sub-agent)
  - `swipe` (twenty-third migration - third ui-testing tool, delegated to sub-agent)
  - `type_text` (twenty-fourth migration - fourth ui-testing tool, delegated to sub-agent)
  - `key_press` (twenty-fifth migration - fifth ui-testing tool, delegated to sub-agent)
  - `button` (twenty-sixth migration - sixth ui-testing tool, delegated to sub-agent)
  - `key_sequence` (twenty-seventh migration - seventh ui-testing tool, delegated to sub-agent)
  - `touch` (twenty-eighth migration - eighth ui-testing tool, delegated to sub-agent)
  - `gesture` (twenty-ninth migration - ninth ui-testing tool, delegated to sub-agent)
  - `screenshot` (thirtieth migration - tenth ui-testing tool, delegated to sub-agent) ✅ **UI-TESTING COMPLETE!**
  - `discover_projs` (thirty-first migration - first project-discovery tool, delegated to sub-agent)
  - `list_schems_proj` (thirty-second migration - second project-discovery tool, delegated to sub-agent)
  - `list_schems_ws` (thirty-third migration - third project-discovery tool, delegated to sub-agent)
  - `show_build_set_proj` (thirty-fourth migration - fourth project-discovery tool, delegated to sub-agent)
  - `show_build_set_ws` (thirty-fifth migration - fifth project-discovery tool, delegated to sub-agent)
  - `get_app_bundle_id` (thirty-sixth migration - sixth project-discovery tool, delegated to sub-agent)
  - `get_mac_bundle_id` (thirty-seventh migration - seventh project-discovery tool, delegated to sub-agent) ✅ **PROJECT DISCOVERY COMPLETE!**
  - `start_device_log_cap` (thirty-eighth migration - first logging tool, delegated to sub-agent) 
  - `stop_device_log_cap` (thirty-ninth migration - second logging tool, delegated to sub-agent)
  - `start_sim_log_cap` (fortieth migration - third logging tool, following explicit migration plan)
  - `stop_sim_log_cap` (forty-first migration - fourth logging tool, following explicit migration plan) ✅ **LOGGING COMPLETE!**
  - `clean_ws` (forty-second migration - first utilities tool) ✅
  - `clean_proj` (forty-third migration - second utilities tool) ✅
  - `scaffold_ios_project` (forty-fourth migration - third utilities tool) ✅
  - `scaffold_macos_project` (forty-fifth migration - fourth utilities tool) ✅ **UTILITIES COMPLETE!**
  - `build_sim_name_ws` (forty-sixth migration - first simulator-workspace tool with re-export) ✅
  - `build_sim_id_ws` (forty-seventh migration - second simulator-workspace tool with re-export) ✅
  - `build_run_sim_name_ws` (forty-eighth migration - third simulator-workspace tool with re-export) ✅
  - `build_run_sim_id_ws` (forty-ninth migration - fourth simulator-workspace tool with re-export) ✅ **SIMULATOR-WORKSPACE COMPLETE!**
  - `build_sim_name_proj` (fiftieth migration - first simulator-project tool with re-export from workspace) ✅
  - `build_sim_id_proj` (fifty-first migration - second simulator-project tool with re-export from workspace) ✅
  - `build_run_sim_name_proj` (fifty-second migration - third simulator-project tool with re-export from workspace) ✅
  - `build_run_sim_id_proj` (fifty-third migration - fourth simulator-project tool with re-export from workspace) ✅ **IOS SIMULATOR BUILD TOOLS COMPLETE! (8/8)**
  - `build_mac_ws` (fifty-fourth migration - first macos-workspace tool with re-export) ✅
  - `build_mac_proj` (fifty-fifth migration - second macos-workspace tool with re-export) ✅
  - `build_run_mac_ws` (fifty-sixth migration - third macos-workspace tool with re-export) ✅
  - `build_run_mac_proj` (fifty-seventh migration - fourth macos-workspace tool with re-export) ✅ **MACOS BUILD TOOLS COMPLETE! (4/4)**
  - `get_mac_app_path_ws` (fifty-eighth migration - first app-path tool, macOS workspace variant) ✅
  - `get_mac_app_path_proj` (fifty-ninth migration - second app-path tool, macOS project variant) ✅ **MACOS TOOLS COMPLETE! (6/6)**
  - `test_sim_name_ws` (sixtieth migration - first test simulator tool with re-export) ✅
  - `test_sim_id_ws` (sixty-first migration - second test simulator tool with re-export) ✅
  - `test_sim_name_proj` (sixty-second migration - third test simulator tool with re-export) ✅
  - `test_sim_id_proj` (sixty-third migration - fourth test simulator tool with re-export) ✅ **IOS SIMULATOR TESTING TOOLS COMPLETE! (4/4)**
  - `build_dev_ws` (sixty-fourth migration - first device build tool with re-export) ✅
  - `build_dev_proj` (sixty-fifth migration - second device build tool with re-export) ✅ **IOS DEVICE BUILD TOOLS COMPLETE! (2/2)**
  - `test_device_ws` (sixty-sixth migration - first device test tool with re-export) ✅
  - `test_device_proj` (sixty-seventh migration - second device test tool with re-export) ✅ **IOS DEVICE TESTING TOOLS COMPLETE! (2/2)**
  - `launch_mac_app` (sixty-eighth migration - first launch tool, delegated to sub-agent) ✅
  - `stop_mac_app` (sixty-ninth migration - second launch tool) ✅ **LAUNCH TOOLS COMPLETE! (2/2)**
- **Remaining**: 15 tools
- **Re-exports Required**: 22 tools

## Critical Update: Re-export Requirements

Per PLUGIN_MIGRATION_PLAN.md, certain tools must be available in multiple plugin directories. This is achieved through re-exports, not duplication.

### Tools Requiring Re-exports (22 total)
- **Simulator tools**: 12 tools (primary in simulator-workspace/, re-exported in simulator-project/)
- **Device tools**: 4 tools (primary in device-workspace/, re-exported in device-project/)
- **macOS tools**: 6 tools (primary in macos-workspace/, re-exported in macos-project/)

## Migration Plans Status

### ✅ Completed Plans (Need Re-export Updates)
The following directories have migration plans but need to be updated to include re-export strategy:

1. **src/tools/build-ios-simulator/** - Needs update for 8 re-exports
2. **src/tools/test-ios-simulator/** - Needs update for 4 re-exports
3. **src/tools/build-ios-device/** - Needs update for 2 re-exports
4. **src/tools/test-ios-device/** - Needs update for 2 re-exports
5. **src/tools/build-macos/** - Needs update for 4 re-exports
6. **src/tools/test-macos/** - Needs update for 2 re-exports

### ✅ Completed Plans (No Re-exports Needed)
These tools don't require re-exports as they belong to single plugin directories:

7. **src/tools/simulator/** - 12 tools → simulator-utilities/
8. **src/tools/app-path/** - 8 tools → various directories (no re-exports needed)
9. **src/tools/device/** - 4 tools → simulator-utilities/
10. **src/tools/device-log/** - 2 tools → logging/
11. **src/tools/launch/** - 2 tools → macos-workspace/
12. **src/tools/axe/** - 10 tools → ui-testing/
13. **src/tools/screenshot/** - 1 tool → ui-testing/
14. **src/tools/discover-projects/** - 1 tool → project-discovery/
15. **src/tools/build-settings/** - 4 tools → project-discovery/
16. **src/tools/bundle-id/** - 2 tools → project-discovery/
17. **src/tools/clean/** - 2 tools → utilities/
18. **src/tools/scaffold/** - 2 tools → utilities/
19. **src/tools/log/** - 2 tools → logging/
20. **src/tools/diagnostic/** - 1 tool → diagnostics/
21. **src/tools/build-swift-package/** - 1 tool (already migrated) ✅
22. **src/tools/test-swift-package/** - 1 tool → swift-package/ ✅ (just migrated)
23. **src/tools/run-swift-package/** - 4 tools → swift-package/

## File Count Impact

### Original Estimate
- 81 plugin files + 81 test files = 162 files

### Revised Estimate with Re-exports
- 81 primary plugin files
- 22 re-export plugin files
- 81 primary test files
- 22 re-export test files
- **Total: 206 files**

## Updated Migration Process

For tools requiring re-exports:

1. **Surgical Edit**: Extract 4 exports per tool (same as before)
2. **Primary Plugin**: Create full implementation in workspace directory
3. **Re-export Plugin**: Create one-line re-export in project directory
4. **Primary Tests**: Full test suite in workspace directory
5. **Re-export Tests**: Minimal verification tests in project directory

For tools not requiring re-exports:
- Follow original migration plan (no changes needed)

## Next Steps

1. **Update existing migration plans** for the 6 directories that need re-export strategy
2. **Create reference implementation** showing both primary and re-export patterns
3. **Begin Phase 3 execution** with updated approach
4. **Track both primary and re-export files** in migration progress

## Benefits of This Approach

1. **Maintains surgical edits** - No code duplication
2. **Single source of truth** - Each tool implementation exists only once
3. **Correct plugin structure** - Tools available where PLUGIN_MIGRATION_PLAN.md specifies
4. **Clear organization** - Re-exports are explicit and documented
5. **Testable** - Both primary and re-export have appropriate test coverage