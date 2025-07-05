/**
 * Tests for stop_app_device plugin (device-project re-export)
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import stopAppDevice from './stop_app_device.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  executeCommand: vi.fn(),
}));

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
      expect(stopAppDevice.schema.deviceId.safeParse(123).success).toBe(false);
      expect(stopAppDevice.schema.processId.safeParse('invalid').success).toBe(false);
    });
  });

  let mockExecuteCommand: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');

    mockExecuteCommand = utils.executeCommand as MockedFunction<any>;

    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact successful termination response', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Process terminated successfully',
        error: '',
      });

      const result = await stopAppDevice.handler({
        deviceId: 'test-device-123',
        processId: 12345,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App stopped successfully\n\nProcess terminated successfully',
          },
        ],
      });
    });

    it('should return exact termination failure response', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Process not found',
      });

      const result = await stopAppDevice.handler({
        deviceId: 'test-device-123',
        processId: 12345,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to stop app: Process not found',
          },
        ],
        isError: true,
      });
    });

    it('should return exact exception handling response', async () => {
      mockExecuteCommand.mockRejectedValue(new Error('Unexpected error'));

      const result = await stopAppDevice.handler({
        deviceId: 'test-device-123',
        processId: 12345,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to stop app on device: Unexpected error',
          },
        ],
        isError: true,
      });
    });

    it('should return exact string error handling response', async () => {
      mockExecuteCommand.mockRejectedValue('String error');

      const result = await stopAppDevice.handler({
        deviceId: 'test-device-123',
        processId: 12345,
      });

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
  });
});
