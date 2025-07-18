#!/bin/bash

# Comprehensive batch fix for all failing test files

failing_files=(
    "src/plugins/simulator-project/__tests__/build_sim_id_proj.test.ts"
    "src/plugins/simulator-project/__tests__/build_sim_name_proj.test.ts"
    "src/plugins/simulator-project/__tests__/get_sim_app_path_id_proj.test.ts"
    "src/plugins/simulator-project/__tests__/get_sim_app_path_name_proj.test.ts"
    "src/plugins/simulator-shared/__tests__/boot_sim.test.ts"
    "src/plugins/simulator-shared/__tests__/install_app_sim.test.ts"
    "src/plugins/simulator-shared/__tests__/screenshot.test.ts"
    "src/plugins/simulator-shared/__tests__/set_network_condition.test.ts"
    "src/plugins/simulator-shared/__tests__/stop_app_sim.test.ts"
    "src/plugins/simulator-workspace/__tests__/boot_sim.test.ts"
    "src/plugins/simulator-workspace/__tests__/build_run_sim_name_ws.test.ts"
    "src/plugins/simulator-workspace/__tests__/get_sim_app_path_name_ws.test.ts"
    "src/plugins/simulator-workspace/__tests__/install_app_sim_id_ws.test.ts"
    "src/plugins/simulator-workspace/__tests__/launch_app_sim_id_ws.test.ts"
    "src/plugins/simulator-workspace/__tests__/launch_app_sim_name_ws.test.ts"
    "src/plugins/simulator-workspace/__tests__/set_network_condition.test.ts"
    "src/plugins/simulator-workspace/__tests__/set_sim_appearance.test.ts"
    "src/plugins/simulator-workspace/__tests__/stop_app_sim_id_ws.test.ts"
    "src/plugins/simulator-workspace/__tests__/stop_app_sim_name_ws.test.ts"
    "src/plugins/ui-testing/__tests__/button.test.ts"
    "src/plugins/ui-testing/__tests__/describe_ui.test.ts"
    "src/plugins/ui-testing/__tests__/gesture.test.ts"
    "src/plugins/ui-testing/__tests__/key_press.test.ts"
    "src/plugins/ui-testing/__tests__/key_sequence.test.ts"
    "src/plugins/ui-testing/__tests__/screenshot.test.ts"
    "src/plugins/ui-testing/__tests__/swipe.test.ts"
    "src/plugins/ui-testing/__tests__/type_text.test.ts"
    "src/plugins/utilities/__tests__/clean_proj.test.ts"
    "src/plugins/utilities/__tests__/clean_ws.test.ts"
    "src/plugins/utilities/__tests__/scaffold_macos_project.test.ts"
)

for file in "${failing_files[@]}"; do
    if [ -f "$file" ]; then
        echo "Processing $file..."
        
        # Skip if already has the required imports
        if grep -q "createMockFileSystemExecutor" "$file"; then
            echo "  Already has required imports, skipping..."
            continue
        fi
        
        # Fix imports (multiple patterns)
        sed -i '' 's/import { createMockExecutor }/import { createMockExecutor, createMockFileSystemExecutor, createNoopExecutor }/' "$file"
        sed -i '' 's/import { createMockExecutor, createNoopExecutor }/import { createMockExecutor, createMockFileSystemExecutor, createNoopExecutor }/' "$file"
        sed -i '' 's/import { createNoopExecutor }/import { createMockExecutor, createMockFileSystemExecutor, createNoopExecutor }/' "$file"
        
        # Fix handler calls with existing executor (most common pattern)
        sed -i '' 's/        mockExecutor,$/        mockExecutor,\n        createMockFileSystemExecutor(),/' "$file"
        sed -i '' 's/        executor,$/        executor,\n        createMockFileSystemExecutor(),/' "$file"
        
        # Fix handler calls with no executor (validation tests)
        sed -i '' 's/\.handler({})/\.handler({}, createNoopExecutor(), createMockFileSystemExecutor())/' "$file"
        
        # Fix handler calls with args but no executor  
        sed -i '' 's/\.handler(\([^)]*\});/\.handler(\1, createNoopExecutor(), createMockFileSystemExecutor());/' "$file"
        
        echo "  Fixed $file"
    else
        echo "  File not found: $file"
    fi
done

echo "Batch fix complete! Run tests to verify."