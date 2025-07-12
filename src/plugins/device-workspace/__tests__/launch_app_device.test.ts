/**
 * Tests for launch_app_device plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createMockExecutor } from '../../../utils/command.js';
import launchAppDevice from '../launch_app_device.ts';

// Mock fs/promises for file operations
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn().mockResolvedValue('{}'),
    unlink: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock os
vi.mock('os', () => ({
  tmpdir: vi.fn().mockReturnValue('/tmp'),
}));

// Mock path with importOriginal
vi.mock('path', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    join: vi.fn().mockReturnValue('/tmp/launch-123.json'),
  };
});

describe('launch_app_device plugin', () => {
  describe('Export Field Validation (Literal)', () => {
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

    it('should validate schema correctly', () => {
      // Test required fields
      expect(launchAppDevice.schema.deviceId.safeParse('test-device-123').success).toBe(true);
      expect(launchAppDevice.schema.bundleId.safeParse('com.example.app').success).toBe(true);

      // Test invalid inputs
      expect(launchAppDevice.schema.deviceId.safeParse(null).success).toBe(false);
      expect(launchAppDevice.schema.deviceId.safeParse(123).success).toBe(false);
      expect(launchAppDevice.schema.bundleId.safeParse(null).success).toBe(false);
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should verify command generation with mock executor', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({
        success: true,
        output: 'App launched successfully',
        error: undefined,
        process: { pid: 12345 },
      });

      await launchAppDevice.handler(
        {
          deviceId: 'test-device-123',
          bundleId: 'com.example.app',
        },
        mockExecutor,
      );

      expect(mockExecutor).toHaveBeenCalledWith(
        expect.arrayContaining([
          'xcrun',
          'devicectl',
          'device',
          'process',
          'launch',
          '--device',
          'test-device-123',
          '--json-output',
          '/tmp/launch-123.json',
          '--terminate-existing',
          'com.example.app',
        ]),
        'Launch app on device',
        true,
        undefined,
      );
    });

    it('should return exact successful launch response', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'App launched successfully',
      });

      const result = await launchAppDevice.handler(
        {
          deviceId: 'test-device-123',
          bundleId: 'com.example.app',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App launched successfully\n\nApp launched successfully',
          },
        ],
      });
    });

    it('should return exact launch failure response', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Launch failed: App not found',
      });

      const result = await launchAppDevice.handler(
        {
          deviceId: 'test-device-123',
          bundleId: 'com.nonexistent.app',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to launch app: Launch failed: App not found',
          },
        ],
        isError: true,
      });
    });

    it('should return exact exception handling response', async () => {
      const mockExecutor = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await launchAppDevice.handler(
        {
          deviceId: 'test-device-123',
          bundleId: 'com.example.app',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to launch app on device: Network error',
          },
        ],
        isError: true,
      });
    });

    it('should return exact string error handling response', async () => {
      const mockExecutor = vi.fn().mockRejectedValue('String error');

      const result = await launchAppDevice.handler(
        {
          deviceId: 'test-device-123',
          bundleId: 'com.example.app',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to launch app on device: String error',
          },
        ],
        isError: true,
      });
    });
  });
});
