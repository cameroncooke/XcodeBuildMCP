/**
 * Tests for launch_app_device plugin (device-project)
 * This tests the re-exported plugin from device-workspace
 * Following CLAUDE.md testing standards with literal validation
 *
 * Note: This is a re-export test. Comprehensive handler tests are in device-workspace/launch_app_device.test.ts
 */

import { describe, it, expect } from 'vitest';

// Import the actual implementation from device-workspace
import launchAppDeviceImpl from '../../device-workspace/launch_app_device.ts';
// Import the re-export to verify it matches
import launchAppDevice from '../launch_app_device.ts';

describe('launch_app_device plugin (device-project re-export)', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should re-export the same plugin as device-workspace', () => {
      expect(launchAppDevice).toBe(launchAppDeviceImpl);
    });

    it('should have correct name', () => {
      expect(launchAppDevice.name).toBe('launch_app_device');
    });

    it('should have correct description', () => {
      expect(launchAppDevice.description).toBe(
        'Launches an app on a physical Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). Requires deviceId and bundleId.',
      );
    });

    it('should have handler function', () => {
      expect(typeof launchAppDevice.handler).toBe('function');
    });

    it('should have schema object', () => {
      expect(typeof launchAppDevice.schema).toBe('object');
      expect(launchAppDevice.schema).not.toBeNull();
    });
  });

  // Note: Handler functionality is thoroughly tested in device-workspace/launch_app_device.test.ts
  // This test file only verifies the re-export works correctly
});
