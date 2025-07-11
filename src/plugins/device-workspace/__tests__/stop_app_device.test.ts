/**
 * Tests for stop_app_device plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import stopAppDevice from '../stop_app_device.ts';

// Mock child_process at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
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
      expect(stopAppDevice.schema.deviceId.safeParse(null).success).toBe(false);
      expect(stopAppDevice.schema.deviceId.safeParse(123).success).toBe(false);
      expect(stopAppDevice.schema.processId.safeParse(null).success).toBe(false);
      expect(stopAppDevice.schema.processId.safeParse('not-number').success).toBe(false);
    });
  });

  class MockChildProcess extends EventEmitter {
    stdout = new EventEmitter();
    stderr = new EventEmitter();
    pid = 12345;
  }

  let mockSpawn: any;
  let mockProcess: MockChildProcess;

  beforeEach(async () => {
    const { spawn } = await import('child_process');
    mockSpawn = vi.mocked(spawn);
    mockProcess = new MockChildProcess();
    mockSpawn.mockReturnValue(mockProcess);

    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should generate correct devicectl terminate command', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'App terminated successfully');
        mockProcess.emit('close', 0);
      }, 0);

      const resultPromise = stopAppDevice.handler({
        deviceId: 'test-device-123',
        processId: 12345,
      });

      const result = await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        ['-c', 'xcrun devicectl device process terminate --device test-device-123 --pid 12345'],
        expect.objectContaining({
          stdio: ['ignore', 'pipe', 'pipe'],
        }),
      );
    });

    it('should return exact successful stop response', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'App terminated successfully');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await stopAppDevice.handler({
        deviceId: 'test-device-123',
        processId: 12345,
      });

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
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Terminate failed: Process not found');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await stopAppDevice.handler({
        deviceId: 'test-device-123',
        processId: 99999,
      });

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
      setTimeout(() => {
        mockProcess.emit('error', new Error('Network error'));
      }, 0);

      const result = await stopAppDevice.handler({
        deviceId: 'test-device-123',
        processId: 12345,
      });

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
      setTimeout(() => {
        mockProcess.emit('error', 'String error');
      }, 0);

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
