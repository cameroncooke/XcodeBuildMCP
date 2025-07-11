/**
 * Tests for stop_app_device plugin (device-project)
 * This tests the re-exported plugin from device-workspace
 * Following CLAUDE.md testing standards with literal validation
 *
 * Note: This is a re-export test. Comprehensive handler tests are in device-workspace/stop_app_device.test.ts
 */

import { describe, it, expect } from 'vitest';

// Import the actual implementation from device-workspace
import stopAppDeviceImpl from '../../device-workspace/stop_app_device.ts';
// Import the re-export to verify it matches
import stopAppDevice from '../stop_app_device.ts';

describe('stop_app_device plugin (device-project re-export)', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should re-export the same plugin as device-workspace', () => {
      expect(stopAppDevice).toBe(stopAppDeviceImpl);
    });

    it('should have correct name', () => {
      expect(stopAppDevice.name).toBe('stop_app_device');
    });

    it('should have correct description', () => {
      expect(stopAppDevice.description).toBe(
        'Stops an app running on a physical Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). Requires deviceId and processId.',
      );
    });

    it('should have handler function', () => {
      expect(typeof stopAppDevice.handler).toBe('function');
    });

    it('should have schema object', () => {
      expect(typeof stopAppDevice.schema).toBe('object');
      expect(stopAppDevice.schema).not.toBeNull();
    });
  });

  // Note: Handler functionality is thoroughly tested in device-workspace/stop_app_device.test.ts
  // This test file only verifies the re-export works correctly
});
