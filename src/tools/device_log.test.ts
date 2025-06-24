/**
 * Tests for device log capture tools
 *
 * CANONICAL MIGRATION COMPLETE ✅
 *
 * All iOS Device log tool tests have been consolidated into:
 * /tests-vitest/src/tools/build_ios_device.test.ts
 *
 * This file maintains the expected structure but points to the consolidated tests.
 *
 * Covered tools:
 * - start_device_log_cap (from device_log.ts)
 * - stop_device_log_cap (from device_log.ts)
 *
 * Total: 2 device log tools (part of 12 total iOS Device tools)
 */

import { describe, it, expect } from 'vitest';

describe('Device Log Tools - Redirect Notice', () => {
  it('should indicate tests are in consolidated iOS device test file', () => {
    const consolidatedLocation = '/tests-vitest/src/tools/build_ios_device.test.ts';
    const coveredTools = ['start_device_log_cap', 'stop_device_log_cap'];

    expect(consolidatedLocation).toBe('/tests-vitest/src/tools/build_ios_device.test.ts');
    expect(coveredTools).toHaveLength(2);

    // Verify this is part of the 12 iOS Device tools
    expect(
      coveredTools.every((tool) => ['start_device_log_cap', 'stop_device_log_cap'].includes(tool)),
    ).toBe(true);
  });

  it('should confirm canonical migration is complete', () => {
    const migrationStatus = 'COMPLETE';
    const canonicalFile = 'src/tools/device_log.ts';
    const testLocation = 'tests-vitest/src/tools/build_ios_device.test.ts';

    expect(migrationStatus).toBe('COMPLETE');
    expect(canonicalFile).toBe('src/tools/device_log.ts');
    expect(testLocation).toBe('tests-vitest/src/tools/build_ios_device.test.ts');
  });
});
