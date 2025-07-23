/**
 * Tests for list_devices plugin (device-project)
 * This tests the re-exported plugin from device-workspace
 * Following CLAUDE.md testing standards with literal validation
 *
 * Note: This is a re-export test. Comprehensive handler tests are in device-workspace/list_devices.test.ts
 */

import { describe, it, expect } from 'vitest';

// Import the actual implementation from device-workspace
import listDevicesImpl from '../../device-workspace/list_devices.ts';
// Import the re-export to verify it matches
import listDevices from '../list_devices.ts';

describe('list_devices plugin (device-project re-export)', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should re-export the same plugin as device-workspace', () => {
      expect(listDevices).toBe(listDevicesImpl);
    });

    it('should have correct name', () => {
      expect(listDevices.name).toBe('list_devices');
    });

    it('should have correct description', () => {
      expect(listDevices.description).toBe(
        'Lists connected physical Apple devices (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro) with their UUIDs, names, and connection status. Use this to discover physical devices for testing.',
      );
    });

    it('should have handler function', () => {
      expect(typeof listDevices.handler).toBe('function');
    });

    it('should have empty schema', () => {
      expect(listDevices.schema).toEqual({});
    });
  });

  // Note: Handler functionality is thoroughly tested in device-workspace/list_devices.test.ts
  // This test file only verifies the re-export works correctly
});
