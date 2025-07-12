/**
 * Tests for stop_app_device plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createMockExecutor } from '../../../utils/command.js';
import stopAppDevice from '../stop_app_device.ts';

describe('stop_app_device plugin', () => {
  describe('Export Field Validation (Literal)', () => {
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

    it('should validate schema correctly', () => {
      // Test required fields
      expect(stopAppDevice.schema.deviceId.safeParse('test-device-123').success).toBe(true);
      expect(stopAppDevice.schema.processId.safeParse(12345).success).toBe(true);

      // Test invalid inputs
      expect(stopAppDevice.schema.deviceId.safeParse(null).success).toBe(false);
      expect(stopAppDevice.schema.deviceId.safeParse(123).success).toBe(false);
      expect(stopAppDevice.schema.processId.safeParse(null).success).toBe(false);
      expect(stopAppDevice.schema.processId.safeParse('not-number').success).toBe(false);
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact successful stop response', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'App terminated successfully',
      });

      const result = await stopAppDevice.handler(
        {
          deviceId: 'test-device-123',
          processId: 12345,
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App stopped successfully\n\nApp terminated successfully',
          },
        ],
      });
    });

    it('should return exact stop failure response', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Terminate failed: Process not found',
      });

      const result = await stopAppDevice.handler(
        {
          deviceId: 'test-device-123',
          processId: 99999,
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to stop app: Terminate failed: Process not found',
          },
        ],
        isError: true,
      });
    });

    it('should return exact exception handling response', async () => {
      const mockExecutor = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await stopAppDevice.handler(
        {
          deviceId: 'test-device-123',
          processId: 12345,
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to stop app on device: Network error',
          },
        ],
        isError: true,
      });
    });

    it('should return exact string error handling response', async () => {
      const mockExecutor = vi.fn().mockRejectedValue('String error');

      const result = await stopAppDevice.handler(
        {
          deviceId: 'test-device-123',
          processId: 12345,
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to stop app on device: String error',
          },
        ],
        isError: true,
      });
    });

    it('should verify command generation with mock executor', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({
        success: true,
        output: 'App terminated successfully',
        error: undefined,
        process: { pid: 12345 },
      });

      await stopAppDevice.handler(
        {
          deviceId: 'test-device-123',
          processId: 12345,
        },
        mockExecutor,
      );

      expect(mockExecutor).toHaveBeenCalledWith(
        [
          'xcrun',
          'devicectl',
          'device',
          'process',
          'terminate',
          '--device',
          'test-device-123',
          '--pid',
          '12345',
        ],
        'Stop app on device',
        true,
        undefined,
      );
    });
  });
});
