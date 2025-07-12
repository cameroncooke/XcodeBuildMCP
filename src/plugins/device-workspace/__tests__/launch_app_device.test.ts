/**
 * Tests for launch_app_device plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import launchAppDevice from '../launch_app_device.ts';

// Mock child_process at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

// Mock fs/promises
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

  class MockChildProcess extends EventEmitter {
    stdout = new EventEmitter();
    stderr = new EventEmitter();
    pid = 12345;
  }

  let mockSpawn: Record<string, unknown>;
  let mockProcess: MockChildProcess;

  beforeEach(async () => {
    const { spawn } = await import('child_process');
    mockSpawn = vi.mocked(spawn);
    mockProcess = new MockChildProcess();
    mockSpawn.mockReturnValue(mockProcess);

    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should generate correct devicectl launch command', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'App launched successfully');
        mockProcess.emit('close', 0);
      }, 0);

      const resultPromise = launchAppDevice.handler({
        deviceId: 'test-device-123',
        bundleId: 'com.example.app',
      });

      const result = await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        [
          '-c',
          expect.stringMatching(
            /xcrun devicectl device process launch --device test-device-123 --json-output .* --terminate-existing com.example.app/,
          ),
        ],
        expect.objectContaining({
          stdio: ['ignore', 'pipe', 'pipe'],
        }),
      );
    });

    it('should return exact successful launch response', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'App launched successfully');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await launchAppDevice.handler({
        deviceId: 'test-device-123',
        bundleId: 'com.example.app',
      });

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
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Launch failed: App not found');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await launchAppDevice.handler({
        deviceId: 'test-device-123',
        bundleId: 'com.nonexistent.app',
      });

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
      setTimeout(() => {
        mockProcess.emit('error', new Error('Network error'));
      }, 0);

      const result = await launchAppDevice.handler({
        deviceId: 'test-device-123',
        bundleId: 'com.example.app',
      });

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
      setTimeout(() => {
        mockProcess.emit('error', 'String error');
      }, 0);

      const result = await launchAppDevice.handler({
        deviceId: 'test-device-123',
        bundleId: 'com.example.app',
      });

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
