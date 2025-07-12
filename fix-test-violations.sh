#!/bin/bash
# Auto-generated script to help fix test architecture violations
# Review each change before applying!

echo "🔧 XcodeBuildMCP Test Architecture Fix Script"
echo "This script will help fix the 35 major violations found."
echo ""
echo "⚠️  IMPORTANT: Review each change before applying!"
echo ""

echo "Fixing 1/35: src/plugins/macos-workspace/__tests__/stop_mac_app.test.ts"
# TODO: Manual fix required for src/plugins/macos-workspace/__tests__/stop_mac_app.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 2/35: src/plugins/simulator-project/test_sim_id_proj.test.ts"
# TODO: Manual fix required for src/plugins/simulator-project/test_sim_id_proj.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 3/35: src/plugins/simulator-project/test_sim_name_proj.test.ts"
# TODO: Manual fix required for src/plugins/simulator-project/test_sim_name_proj.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 4/35: src/plugins/simulator-shared/__tests__/launch_app_logs_sim.test.ts"
# TODO: Manual fix required for src/plugins/simulator-shared/__tests__/launch_app_logs_sim.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 5/35: src/plugins/simulator-shared/__tests__/launch_app_sim.test.ts"
# TODO: Manual fix required for src/plugins/simulator-shared/__tests__/launch_app_sim.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 6/35: src/plugins/simulator-shared/__tests__/reset_simulator_location.test.ts"
# TODO: Manual fix required for src/plugins/simulator-shared/__tests__/reset_simulator_location.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 7/35: src/plugins/simulator-shared/__tests__/set_network_condition.test.ts"
# TODO: Manual fix required for src/plugins/simulator-shared/__tests__/set_network_condition.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 8/35: src/plugins/simulator-shared/__tests__/set_sim_appearance.test.ts"
# TODO: Manual fix required for src/plugins/simulator-shared/__tests__/set_sim_appearance.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 9/35: src/plugins/simulator-shared/__tests__/set_simulator_location.test.ts"
# TODO: Manual fix required for src/plugins/simulator-shared/__tests__/set_simulator_location.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 10/35: src/plugins/simulator-workspace/__tests__/build_run_sim_name_ws.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/__tests__/build_run_sim_name_ws.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 11/35: src/plugins/simulator-workspace/__tests__/build_sim_id_ws.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/__tests__/build_sim_id_ws.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 12/35: src/plugins/simulator-workspace/__tests__/build_sim_name_ws.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/__tests__/build_sim_name_ws.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 13/35: src/plugins/simulator-workspace/__tests__/describe_ui.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/__tests__/describe_ui.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 14/35: src/plugins/simulator-workspace/__tests__/get_sim_app_path_id_ws.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/__tests__/get_sim_app_path_id_ws.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 15/35: src/plugins/simulator-workspace/launch_app_logs_sim.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/launch_app_logs_sim.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 16/35: src/plugins/simulator-workspace/launch_app_sim.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/launch_app_sim.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 17/35: src/plugins/simulator-workspace/reset_simulator_location.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/reset_simulator_location.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 18/35: src/plugins/simulator-workspace/set_network_condition.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/set_network_condition.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 19/35: src/plugins/simulator-workspace/set_sim_appearance.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/set_sim_appearance.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 20/35: src/plugins/simulator-workspace/set_simulator_location.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/set_simulator_location.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 21/35: src/plugins/simulator-workspace/test_sim_id_ws.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/test_sim_id_ws.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 22/35: src/plugins/simulator-workspace/test_sim_name_ws.test.ts"
# TODO: Manual fix required for src/plugins/simulator-workspace/test_sim_name_ws.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 23/35: src/plugins/ui-testing/__tests__/button.test.ts"
# TODO: Manual fix required for src/plugins/ui-testing/__tests__/button.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 24/35: src/plugins/ui-testing/__tests__/describe_ui.test.ts"
# TODO: Manual fix required for src/plugins/ui-testing/__tests__/describe_ui.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 25/35: src/plugins/ui-testing/__tests__/gesture.test.ts"
# TODO: Manual fix required for src/plugins/ui-testing/__tests__/gesture.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 26/35: src/plugins/ui-testing/__tests__/key_press.test.ts"
# TODO: Manual fix required for src/plugins/ui-testing/__tests__/key_press.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 27/35: src/plugins/ui-testing/__tests__/key_sequence.test.ts"
# TODO: Manual fix required for src/plugins/ui-testing/__tests__/key_sequence.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 28/35: src/plugins/ui-testing/__tests__/long_press.test.ts"
# TODO: Manual fix required for src/plugins/ui-testing/__tests__/long_press.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 29/35: src/plugins/ui-testing/__tests__/screenshot.test.ts"
# TODO: Manual fix required for src/plugins/ui-testing/__tests__/screenshot.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 30/35: src/plugins/ui-testing/__tests__/swipe.test.ts"
# TODO: Manual fix required for src/plugins/ui-testing/__tests__/swipe.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 31/35: src/plugins/ui-testing/__tests__/tap.test.ts"
# TODO: Manual fix required for src/plugins/ui-testing/__tests__/tap.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 32/35: src/plugins/ui-testing/__tests__/touch.test.ts"
# TODO: Manual fix required for src/plugins/ui-testing/__tests__/touch.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 33/35: src/plugins/ui-testing/__tests__/type_text.test.ts"
# TODO: Manual fix required for src/plugins/ui-testing/__tests__/type_text.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 34/35: src/plugins/utilities/__tests__/scaffold_ios_project.test.ts"
# TODO: Manual fix required for src/plugins/utilities/__tests__/scaffold_ios_project.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "Fixing 35/35: src/plugins/utilities/__tests__/scaffold_macos_project.test.ts"
# TODO: Manual fix required for src/plugins/utilities/__tests__/scaffold_macos_project.test.ts
# 1. Remove vi.mock('../../utils/index.js')
# 2. Add vi.mock('child_process', () => ({ spawn: vi.fn() }))
# 3. Remove utility imports and mocks
# 4. Test integration flow instead

echo "✅ All violations identified. Manual fixes required."
echo "See the audit report above for detailed guidance."
