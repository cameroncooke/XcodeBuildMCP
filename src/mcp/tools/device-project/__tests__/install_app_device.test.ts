/**
 * Tests for install_app_device plugin (device-project)
 * This tests the re-exported plugin from device-workspace
 * Following CLAUDE.md testing standards with literal validation
 *
 * Note: This is a re-export test. Comprehensive handler tests are in device-workspace/install_app_device.test.ts
 */

import { describe, it, expect } from 'vitest';

// Import the actual implementation from device-workspace
import installAppDeviceImpl from '../../device-workspace/install_app_device.ts';
// Import the re-export to verify it matches
import installAppDevice from '../install_app_device.ts';

describe('install_app_device plugin (device-project re-export)', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should re-export the same plugin as device-workspace', () => {
      expect(installAppDevice).toBe(installAppDeviceImpl);
    });

    it('should have correct name', () => {
      expect(installAppDevice.name).toBe('install_app_device');
    });

    it('should have correct description', () => {
      expect(installAppDevice.description).toBe(
        'Installs an app on a physical Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). Requires deviceId and appPath.',
      );
    });

    it('should have handler function', () => {
      expect(typeof installAppDevice.handler).toBe('function');
    });

    it('should have schema object', () => {
      expect(typeof installAppDevice.schema).toBe('object');
      expect(installAppDevice.schema).not.toBeNull();
    });
  });

  // Note: Handler functionality is thoroughly tested in device-workspace/install_app_device.test.ts
  // This test file only verifies the re-export works correctly
});
