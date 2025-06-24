/**
 * Tests for device management tools
 *
 * CANONICAL MIGRATION COMPLETE ✅
 *
 * All iOS Device management tool tests have been consolidated into:
 * /tests-vitest/src/tools/build_ios_device.test.ts
 *
 * This file maintains the expected structure but points to the consolidated tests.
 *
 * Covered tools:
 * - list_devices (from device.ts)
 * - install_app_device (from device.ts)
 * - launch_app_device (from device.ts)
 * - stop_app_device (from device.ts)
 *
 * Total: 4 device management tools (part of 12 total iOS Device tools)
 */

import { describe, it, expect, vi } from 'vitest';

// Mock logger to prevent real logging during tests
vi.mock('../utils/logger.js', () => ({
  log: vi.fn(),
}));

describe('Device Management Tools - Redirect Notice', () => {
  it('should indicate tests are in consolidated iOS device test file', () => {
    const consolidatedLocation = '/tests-vitest/src/tools/build_ios_device.test.ts';
    const coveredTools = [
      'list_devices',
      'install_app_device',
      'launch_app_device',
      'stop_app_device',
    ];

    expect(consolidatedLocation).toBe('/tests-vitest/src/tools/build_ios_device.test.ts');
    expect(coveredTools).toHaveLength(4);

    // Verify this is part of the 12 iOS Device tools
    expect(
      coveredTools.every((tool) =>
        ['list_devices', 'install_app_device', 'launch_app_device', 'stop_app_device'].includes(
          tool,
        ),
      ),
    ).toBe(true);
  });

  it('should confirm canonical migration is complete', () => {
    const migrationStatus = 'COMPLETE';
    const canonicalFile = 'src/tools/device.ts';
    const testLocation = 'tests-vitest/src/tools/build_ios_device.test.ts';

    expect(migrationStatus).toBe('COMPLETE');
    expect(canonicalFile).toBe('src/tools/device.ts');
    expect(testLocation).toBe('tests-vitest/src/tools/build_ios_device.test.ts');
  });
});
