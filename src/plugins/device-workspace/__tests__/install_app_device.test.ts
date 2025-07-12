/**
 * Tests for install_app_device plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createMockExecutor } from '../../../utils/command.js';
import installAppDevice from '../install_app_device.ts';

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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact successful installation response', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'App installation successful',
      });

      const result = await installAppDevice.handler(
        {
          deviceId: 'test-device-123',
          appPath: '/path/to/test.app',
        },
        mockExecutor,
      );

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
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Installation failed: App not found',
      });

      const result = await installAppDevice.handler(
        {
          deviceId: 'test-device-123',
          appPath: '/path/to/nonexistent.app',
        },
        mockExecutor,
      );

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
      const mockExecutor = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await installAppDevice.handler(
        {
          deviceId: 'test-device-123',
          appPath: '/path/to/test.app',
        },
        mockExecutor,
      );

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
      const mockExecutor = vi.fn().mockRejectedValue('String error');

      const result = await installAppDevice.handler(
        {
          deviceId: 'test-device-123',
          appPath: '/path/to/test.app',
        },
        mockExecutor,
      );

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

    it('should verify command generation with mock executor', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({
        success: true,
        output: 'App installation successful',
        error: undefined,
        process: { pid: 12345 },
      });

      await installAppDevice.handler(
        {
          deviceId: 'test-device-123',
          appPath: '/path/to/test.app',
        },
        mockExecutor,
      );

      expect(mockExecutor).toHaveBeenCalledWith(
        [
          'xcrun',
          'devicectl',
          'device',
          'install',
          'app',
          '--device',
          'test-device-123',
          '/path/to/test.app',
        ],
        'Install app on device',
        true,
        undefined,
      );
    });
  });
});
