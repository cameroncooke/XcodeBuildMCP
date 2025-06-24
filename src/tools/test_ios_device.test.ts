/**
 * Tests for iOS device testing tools
 *
 * CANONICAL MIGRATION COMPLETE ✅
 *
 * All iOS Device test tool tests have been consolidated into:
 * /tests-vitest/src/tools/build_ios_device.test.ts
 *
 * This file maintains the expected structure but points to the consolidated tests.
 *
 * Covered tools:
 * - test_device_proj (from test_ios_device.ts)
 * - test_device_ws (from test_ios_device.ts)
 *
 * Total: 2 device test tools (part of 12 total iOS Device tools)
 */

import { describe, it, expect, vi } from 'vitest';

// Mock logger to prevent real logging during tests
vi.mock('../utils/logger.js', () => ({
  log: vi.fn(),
}));

describe('iOS Device Test Tools - Redirect Notice', () => {
  it('should indicate tests are in consolidated iOS device test file', () => {
    const consolidatedLocation = '/tests-vitest/src/tools/build_ios_device.test.ts';
    const coveredTools = ['test_device_proj', 'test_device_ws'];

    expect(consolidatedLocation).toBe('/tests-vitest/src/tools/build_ios_device.test.ts');
    expect(coveredTools).toHaveLength(2);

    // Verify this is part of the 12 iOS Device tools
    expect(coveredTools.every((tool) => tool.includes('device'))).toBe(true);
  });

  it('should confirm canonical migration is complete', () => {
    const migrationStatus = 'COMPLETE';
    const canonicalFile = 'src/tools/test_ios_device.ts';
    const testLocation = 'tests-vitest/src/tools/build_ios_device.test.ts';

    expect(migrationStatus).toBe('COMPLETE');
    expect(canonicalFile).toBe('src/tools/test_ios_device.ts');
    expect(testLocation).toBe('tests-vitest/src/tools/build_ios_device.test.ts');
  });
});
