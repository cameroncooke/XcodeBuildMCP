/**
 * Tests for install_app_device plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import installAppDevice from './install_app_device.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  executeCommand: vi.fn(),
}));

describe('install_app_device plugin', () => {
  describe('Export Field Validation (Literal)', () => {
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

    it('should validate schema correctly', () => {
      // Test required fields
      expect(installAppDevice.schema.deviceId.safeParse('test-device-123').success).toBe(true);
      expect(installAppDevice.schema.appPath.safeParse('/path/to/test.app').success).toBe(true);

      // Test invalid inputs
      expect(installAppDevice.schema.deviceId.safeParse(null).success).toBe(false);
      expect(installAppDevice.schema.deviceId.safeParse(123).success).toBe(false);
      expect(installAppDevice.schema.appPath.safeParse(null).success).toBe(false);
    });
  });

  let mockExecuteCommand: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');

    mockExecuteCommand = utils.executeCommand as MockedFunction<any>;

    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact successful installation response', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'App installation successful',
        error: '',
      });

      const result = await installAppDevice.handler({
        deviceId: 'test-device-123',
        appPath: '/path/to/test.app',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App installed successfully on device test-device-123\n\nApp installation successful',
          },
        ],
      });
    });

    it('should return exact installation failure response', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Installation failed: App not found',
      });

      const result = await installAppDevice.handler({
        deviceId: 'test-device-123',
        appPath: '/path/to/nonexistent.app',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to install app: Installation failed: App not found',
          },
        ],
        isError: true,
      });
    });

    it('should return exact exception handling response', async () => {
      mockExecuteCommand.mockRejectedValue(new Error('Network error'));

      const result = await installAppDevice.handler({
        deviceId: 'test-device-123',
        appPath: '/path/to/test.app',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to install app on device: Network error',
          },
        ],
        isError: true,
      });
    });

    it('should return exact string error handling response', async () => {
      mockExecuteCommand.mockRejectedValue('String error');

      const result = await installAppDevice.handler({
        deviceId: 'test-device-123',
        appPath: '/path/to/test.app',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to install app on device: String error',
          },
        ],
        isError: true,
      });
    });
  });
});
