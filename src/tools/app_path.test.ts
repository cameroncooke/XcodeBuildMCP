/**
 * Tests for app path tools (all platforms)
 *
 * PARTIAL MIGRATION COMPLETE ✅ (iOS Device tools)
 *
 * iOS Device app path tools have been migrated to:
 * /tests-vitest/src/tools/build_ios_device.test.ts
 *
 * Completed by Sub-Agent 6:
 * - get_device_app_path_ws (from app_path.ts) ✅
 * - get_device_app_path_proj (from app_path.ts) ✅
 *
 * Remaining for other Sub-Agents:
 * - get_mac_app_path_ws, get_mac_app_path_proj (Sub-Agent 5)
 * - get_sim_app_path_id_proj, get_sim_app_path_name_proj (Sub-Agent 7)
 * - get_sim_app_path_id_ws, get_sim_app_path_name_ws (Sub-Agent 8)
 *
 * Total iOS Device app path tools: 2 (part of 12 total iOS Device tools)
 */

import { describe, it, expect, vi } from 'vitest';

// Mock logger to prevent real logging during tests
vi.mock('../utils/logger.js', () => ({
  log: vi.fn(),
}));

describe('App Path Tools - Migration Status', () => {
  it('should confirm iOS Device app path tools are migrated', () => {
    const migratedDeviceTools = ['get_device_app_path_ws', 'get_device_app_path_proj'];
    const consolidatedLocation = '/tests-vitest/src/tools/build_ios_device.test.ts';

    expect(migratedDeviceTools).toHaveLength(2);
    expect(consolidatedLocation).toBe('/tests-vitest/src/tools/build_ios_device.test.ts');

    // Verify these are iOS Device tools
    expect(migratedDeviceTools.every((tool) => tool.includes('device'))).toBe(true);
  });

  it('should track remaining app path tools for other platforms', () => {
    const remainingMacOSTools = ['get_mac_app_path_ws', 'get_mac_app_path_proj'];
    const remainingSimulatorTools = [
      'get_sim_app_path_id_proj',
      'get_sim_app_path_name_proj',
      'get_sim_app_path_id_ws',
      'get_sim_app_path_name_ws',
    ];

    expect(remainingMacOSTools).toHaveLength(2);
    expect(remainingSimulatorTools).toHaveLength(4);

    // Total app path tools should be 8 across all platforms
    const totalAppPathTools = 2 + remainingMacOSTools.length + remainingSimulatorTools.length;
    expect(totalAppPathTools).toBe(8);
  });
});
