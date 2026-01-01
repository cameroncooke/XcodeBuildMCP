/**
 * Pure dependency injection test for launch_app_device plugin (device-shared)
 *
 * Tests plugin structure and app launching functionality including parameter validation,
 * command generation, file operations, and response formatting.
 *
 * Uses createMockExecutor for command execution and manual stubs for file operations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as z from 'zod';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';
import launchAppDevice, { launch_app_deviceLogic } from '../launch_app_device.ts';
import { sessionStore } from '../../../../utils/session-store.ts';

describe('launch_app_device plugin (device-shared)', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(launchAppDevice.name).toBe('launch_app_device');
    });

    it('should have correct description', () => {
      expect(launchAppDevice.description).toBe('Launches an app on a connected device.');
    });

    it('should have handler function', () => {
      expect(typeof launchAppDevice.handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      const schema = z.strictObject(launchAppDevice.schema);
      expect(schema.safeParse({ bundleId: 'com.example.app' }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(false);
      expect(Object.keys(launchAppDevice.schema)).toEqual(['bundleId']);
    });

    it('should validate schema with invalid inputs', () => {
      const schema = z.strictObject(launchAppDevice.schema);
      expect(schema.safeParse({ bundleId: null }).success).toBe(false);
      expect(schema.safeParse({ bundleId: 123 }).success).toBe(false);
    });
  });

  describe('Handler Requirements', () => {
    it('should require deviceId when not provided', async () => {
      const result = await launchAppDevice.handler({ bundleId: 'com.example.app' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('deviceId is required');
    });
  });

  describe('Command Generation', () => {
    it('should generate correct devicectl command with required parameters', async () => {
      const calls: any[] = [];
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'App launched successfully',
        process: { pid: 12345 },
      });

      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        calls.push({ command, logPrefix, useShell, env });
        return mockExecutor(command, logPrefix, useShell, env);
      };

      await launch_app_deviceLogic(
        {
          deviceId: 'test-device-123',
          bundleId: 'com.example.app',
        },
        trackingExecutor,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0].command).toEqual([
        'xcrun',
        'devicectl',
        'device',
        'process',
        'launch',
        '--device',
        'test-device-123',
        '--json-output',
        expect.stringMatching(/^\/.*\/launch-\d+\.json$/),
        '--terminate-existing',
        'com.example.app',
      ]);
      expect(calls[0].logPrefix).toBe('Launch app on device');
      expect(calls[0].useShell).toBe(true);
      expect(calls[0].env).toBeUndefined();
    });

    it('should generate command with different device and bundle parameters', async () => {
      const calls: any[] = [];
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Launch successful',
        process: { pid: 54321 },
      });

      const trackingExecutor = async (command: string[]) => {
        calls.push({ command });
        return mockExecutor(command);
      };

      await launch_app_deviceLogic(
        {
          deviceId: '00008030-001E14BE2288802E',
          bundleId: 'com.apple.mobilesafari',
        },
        trackingExecutor,
      );

      expect(calls[0].command).toEqual([
        'xcrun',
        'devicectl',
        'device',
        'process',
        'launch',
        '--device',
        '00008030-001E14BE2288802E',
        '--json-output',
        expect.stringMatching(/^\/.*\/launch-\d+\.json$/),
        '--terminate-existing',
        'com.apple.mobilesafari',
      ]);
    });
  });

  describe('Success Path Tests', () => {
    it('should return successful launch response without process ID', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'App launched successfully',
      });

      const result = await launch_app_deviceLogic(
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

    it('should return successful launch response with detailed output', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Launch succeeded with detailed output',
      });

      const result = await launch_app_deviceLogic(
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
            text: '✅ App launched successfully\n\nLaunch succeeded with detailed output',
          },
        ],
      });
    });

    it('should handle successful launch with process ID information', async () => {
      // Mock fs operations for JSON parsing
      const fs = await import('fs');
      const originalReadFile = fs.promises.readFile;
      const originalUnlink = fs.promises.unlink;

      const mockReadFile = (path: string) => {
        if (path.includes('launch-')) {
          return Promise.resolve(
            JSON.stringify({
              result: {
                process: {
                  processIdentifier: 12345,
                },
              },
            }),
          );
        }
        return originalReadFile(path);
      };

      const mockUnlink = () => Promise.resolve();

      // Replace fs methods
      fs.promises.readFile = mockReadFile;
      fs.promises.unlink = mockUnlink;

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'App launched successfully',
      });

      const result = await launch_app_deviceLogic(
        {
          deviceId: 'test-device-123',
          bundleId: 'com.example.app',
        },
        mockExecutor,
      );

      // Restore fs methods
      fs.promises.readFile = originalReadFile;
      fs.promises.unlink = originalUnlink;

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App launched successfully\n\nApp launched successfully\n\nProcess ID: 12345\n\nNext Steps:\n1. Interact with your app on the device\n2. Stop the app: stop_app_device({ deviceId: "test-device-123", processId: 12345 })',
          },
        ],
      });
    });

    it('should handle successful launch with command output', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'App "com.example.app" launched on device "test-device-123"',
      });

      const result = await launch_app_deviceLogic(
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
            text: '✅ App launched successfully\n\nApp "com.example.app" launched on device "test-device-123"',
          },
        ],
      });
    });
  });

  describe('Error Handling', () => {
    it('should return launch failure response', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Launch failed: App not found',
      });

      const result = await launch_app_deviceLogic(
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

    it('should return command failure response with specific error', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Device not found: test-device-invalid',
      });

      const result = await launch_app_deviceLogic(
        {
          deviceId: 'test-device-invalid',
          bundleId: 'com.example.app',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to launch app: Device not found: test-device-invalid',
          },
        ],
        isError: true,
      });
    });

    it('should handle executor exception with Error object', async () => {
      const mockExecutor = createMockExecutor(new Error('Network error'));

      const result = await launch_app_deviceLogic(
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

    it('should handle executor exception with string error', async () => {
      const mockExecutor = createMockExecutor('String error');

      const result = await launch_app_deviceLogic(
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
