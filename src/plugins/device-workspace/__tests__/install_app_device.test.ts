/**
 * Tests for install_app_device plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import installAppDevice from '../install_app_device.ts';

// Mock child_process at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
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
    it('should generate correct devicectl install command', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'App installation successful');
        mockProcess.emit('close', 0);
      }, 0);

      const resultPromise = installAppDevice.handler({
        deviceId: 'test-device-123',
        appPath: '/path/to/test.app',
      });

      const result = await resultPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        ['-c', 'xcrun devicectl device install app --device test-device-123 /path/to/test.app'],
        expect.objectContaining({
          stdio: ['ignore', 'pipe', 'pipe'],
        }),
      );
    });

    it('should return exact successful installation response', async () => {
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'App installation successful');
        mockProcess.emit('close', 0);
      }, 0);

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
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Installation failed: App not found');
        mockProcess.emit('close', 1);
      }, 0);

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
      setTimeout(() => {
        mockProcess.emit('error', new Error('Network error'));
      }, 0);

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
      setTimeout(() => {
        mockProcess.emit('error', 'String error');
      }, 0);

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
