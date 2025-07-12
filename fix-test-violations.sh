#!/bin/bash
# Auto-generated script to help fix test architecture violations
# Review each change before applying!

echo "🔧 XcodeBuildMCP Test Architecture Fix Script"
echo "This script will help fix the 42 major violations found."
echo ""
echo "⚠️  IMPORTANT: Review each change before applying!"
echo ""

echo "Fixing 1/42: src/plugins/device-workspace/__tests__/get_device_app_path_ws.test.ts"
# TODO: Manual fix required for src/plugins/device-workspace/__tests__/get_device_app_path_ws.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 2/42: src/plugins/diagnostics/__tests__/diagnostic.test.ts"
# TODO: Manual fix required for src/plugins/diagnostics/__tests__/diagnostic.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 3/42: src/plugins/discovery/__tests__/discover_tools.test.ts"
# TODO: Manual fix required for src/plugins/discovery/__tests__/discover_tools.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 4/42: src/plugins/logging/__tests__/start_device_log_cap.test.ts"
# TODO: Manual fix required for src/plugins/logging/__tests__/start_device_log_cap.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 5/42: src/plugins/logging/__tests__/stop_device_log_cap.test.ts"
# TODO: Manual fix required for src/plugins/logging/__tests__/stop_device_log_cap.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 6/42: src/plugins/logging/__tests__/stop_sim_log_cap.test.ts"
# TODO: Manual fix required for src/plugins/logging/__tests__/stop_sim_log_cap.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 7/42: src/plugins/macos-shared/__tests__/stop_mac_app.test.ts"
# TODO: Manual fix required for src/plugins/macos-shared/__tests__/stop_mac_app.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 8/42: src/plugins/macos-workspace/__tests__/stop_mac_app.test.ts"
# TODO: Manual fix required for src/plugins/macos-workspace/__tests__/stop_mac_app.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 9/42: src/plugins/simulator-project/test_sim_id_proj.test.ts"
# TODO: Manual fix required for src/plugins/simulator-project/test_sim_id_proj.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 10/42: src/plugins/simulator-project/test_sim_name_proj.test.ts"
# TODO: Manual fix required for src/plugins/simulator-project/test_sim_name_proj.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 11/42: src/plugins/simulator-shared/__tests__/launch_app_logs_sim.test.ts"
# TODO: Manual fix required for src/plugins/simulator-shared/__tests__/launch_app_logs_sim.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 12/42: src/plugins/simulator-shared/__tests__/launch_app_sim.test.ts"
# TODO: Manual fix required for src/plugins/simulator-shared/__tests__/launch_app_sim.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 13/42: src/plugins/simulator-shared/__tests__/reset_simulator_location.test.ts"
# TODO: Manual fix required for src/plugins/simulator-shared/__tests__/reset_simulator_location.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 14/42: src/plugins/simulator-shared/__tests__/set_network_condition.test.ts"
# TODO: Manual fix required for src/plugins/simulator-shared/__tests__/set_network_condition.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 15/42: src/plugins/simulator-shared/__tests__/set_sim_appearance.test.ts"
# TODO: Manual fix required for src/plugins/simulator-shared/__tests__/set_sim_appearance.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 16/42: src/plugins/simulator-shared/__tests__/set_simulator_location.test.ts"
# TODO: Manual fix required for src/plugins/simulator-shared/__tests__/set_simulator_location.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 17/42: src/plugins/simulator-workspace/__tests__/build_run_sim_name_ws.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/__tests__/build_run_sim_name_ws.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 18/42: src/plugins/simulator-workspace/__tests__/build_sim_id_ws.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/__tests__/build_sim_id_ws.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 19/42: src/plugins/simulator-workspace/__tests__/build_sim_name_ws.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/__tests__/build_sim_name_ws.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 20/42: src/plugins/simulator-workspace/__tests__/describe_ui.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/__tests__/describe_ui.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 21/42: src/plugins/simulator-workspace/__tests__/get_sim_app_path_id_ws.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/__tests__/get_sim_app_path_id_ws.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 22/42: src/plugins/simulator-workspace/launch_app_logs_sim.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/launch_app_logs_sim.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 23/42: src/plugins/simulator-workspace/launch_app_sim.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/launch_app_sim.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 24/42: src/plugins/simulator-workspace/reset_simulator_location.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/reset_simulator_location.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 25/42: src/plugins/simulator-workspace/set_network_condition.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/set_network_condition.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 26/42: src/plugins/simulator-workspace/set_sim_appearance.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/set_sim_appearance.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 27/42: src/plugins/simulator-workspace/set_simulator_location.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/set_simulator_location.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 28/42: src/plugins/simulator-workspace/test_sim_id_ws.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/test_sim_id_ws.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 29/42: src/plugins/simulator-workspace/test_sim_name_ws.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/test_sim_name_ws.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 30/42: src/plugins/ui-testing/__tests__/button.test.ts"
# TODO: Manual fix required for src/plugins/ui-testing/__tests__/button.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 31/42: src/plugins/ui-testing/__tests__/describe_ui.test.ts"
# TODO: Manual fix required for src/plugins/ui-testing/__tests__/describe_ui.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 32/42: src/plugins/ui-testing/__tests__/gesture.test.ts"
# TODO: Manual fix required for src/plugins/ui-testing/__tests__/gesture.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 33/42: src/plugins/ui-testing/__tests__/key_press.test.ts"
# TODO: Manual fix required for src/plugins/ui-testing/__tests__/key_press.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 34/42: src/plugins/ui-testing/__tests__/key_sequence.test.ts"
# TODO: Manual fix required for src/plugins/ui-testing/__tests__/key_sequence.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 35/42: src/plugins/ui-testing/__tests__/long_press.test.ts"
# TODO: Manual fix required for src/plugins/ui-testing/__tests__/long_press.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 36/42: src/plugins/ui-testing/__tests__/screenshot.test.ts"
# TODO: Manual fix required for src/plugins/ui-testing/__tests__/screenshot.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 37/42: src/plugins/ui-testing/__tests__/swipe.test.ts"
# TODO: Manual fix required for src/plugins/ui-testing/__tests__/swipe.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 38/42: src/plugins/ui-testing/__tests__/tap.test.ts"
# TODO: Manual fix required for src/plugins/ui-testing/__tests__/tap.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 39/42: src/plugins/ui-testing/__tests__/touch.test.ts"
# TODO: Manual fix required for src/plugins/ui-testing/__tests__/touch.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 40/42: src/plugins/ui-testing/__tests__/type_text.test.ts"
# TODO: Manual fix required for src/plugins/ui-testing/__tests__/type_text.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 41/42: src/plugins/utilities/__tests__/scaffold_ios_project.test.ts"
# TODO: Manual fix required for src/plugins/utilities/__tests__/scaffold_ios_project.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 42/42: src/plugins/utilities/__tests__/scaffold_macos_project.test.ts"
# TODO: Manual fix required for src/plugins/utilities/__tests__/scaffold_macos_project.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "✅ All violations identified. Manual fixes required."
echo "See the audit report above for detailed guidance."
