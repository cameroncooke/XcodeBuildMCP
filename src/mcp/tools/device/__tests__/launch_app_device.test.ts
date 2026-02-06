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
import {
  createMockExecutor,
  createMockFileSystemExecutor,
} from '../../../../test-utils/mock-executors.ts';
import { schema, handler, launch_app_deviceLogic } from '../launch_app_device.ts';
import { sessionStore } from '../../../../utils/session-store.ts';

describe('launch_app_device plugin (device-shared)', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have handler function', () => {
      expect(typeof handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      const schemaObj = z.strictObject(schema);
      expect(schemaObj.safeParse({}).success).toBe(true);
      expect(schemaObj.safeParse({ bundleId: 'com.example.app' }).success).toBe(false);
      expect(Object.keys(schema).sort()).toEqual(['env']);
    });

    it('should validate schema with invalid inputs', () => {
      const schemaObj = z.strictObject(schema);
      expect(schemaObj.safeParse({ bundleId: null }).success).toBe(false);
      expect(schemaObj.safeParse({ bundleId: 123 }).success).toBe(false);
    });
  });

  describe('Handler Requirements', () => {
    it('should require deviceId and bundleId when not provided', async () => {
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('Provide deviceId and bundleId');
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
        opts?: { env?: Record<string, string> },
        _detached?: boolean,
      ) => {
        calls.push({ command, logPrefix, useShell, env: opts?.env });
        return mockExecutor(command, logPrefix, useShell, opts, _detached);
      };

      await launch_app_deviceLogic(
        {
          deviceId: 'test-device-123',
          bundleId: 'com.example.app',
        },
        trackingExecutor,
        createMockFileSystemExecutor(),
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
      expect(calls[0].useShell).toBe(false);
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
        createMockFileSystemExecutor(),
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

    it('should append --environment-variables flags before bundleId when env is provided', async () => {
      const calls: any[] = [];
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'App launched successfully',
        process: { pid: 12345 },
      });

      const trackingExecutor = async (command: string[]) => {
        calls.push({ command });
        return mockExecutor(command);
      };

      await launch_app_deviceLogic(
        {
          deviceId: 'test-device-123',
          bundleId: 'com.example.app',
          env: { STAGING_ENABLED: '1', DEBUG: 'true' },
        },
        trackingExecutor,
        createMockFileSystemExecutor(),
      );

      expect(calls).toHaveLength(1);
      const cmd = calls[0].command;
      // bundleId should be the last element
      expect(cmd[cmd.length - 1]).toBe('com.example.app');
      // --environment-variables flags should appear before bundleId
      const envIdx1 = cmd.indexOf('--environment-variables');
      expect(envIdx1).toBeGreaterThan(-1);
      expect(cmd[envIdx1 + 1]).toBe('STAGING_ENABLED=1');
      const envIdx2 = cmd.indexOf('--environment-variables', envIdx1 + 1);
      expect(envIdx2).toBeGreaterThan(-1);
      expect(cmd[envIdx2 + 1]).toBe('DEBUG=true');
    });

    it('should not include --environment-variables when env is not provided', async () => {
      const calls: any[] = [];
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'App launched successfully',
        process: { pid: 12345 },
      });

      const trackingExecutor = async (command: string[]) => {
        calls.push({ command });
        return mockExecutor(command);
      };

      await launch_app_deviceLogic(
        {
          deviceId: 'test-device-123',
          bundleId: 'com.example.app',
        },
        trackingExecutor,
        createMockFileSystemExecutor(),
      );

      expect(calls[0].command).not.toContain('--environment-variables');
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
        createMockFileSystemExecutor(),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App launched successfully\n\nApp launched successfully',
          },
        ],
        nextSteps: [],
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
        createMockFileSystemExecutor(),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App launched successfully\n\nLaunch succeeded with detailed output',
          },
        ],
        nextSteps: [],
      });
    });

    it('should handle successful launch with process ID information', async () => {
      const mockFileSystem = createMockFileSystemExecutor({
        readFile: async () =>
          JSON.stringify({
            result: {
              process: {
                processIdentifier: 12345,
              },
            },
          }),
        rm: async () => {},
      });

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
        mockFileSystem,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App launched successfully\n\nApp launched successfully\n\nProcess ID: 12345\n\nInteract with your app on the device.',
          },
        ],
        nextSteps: [
          {
            tool: 'stop_app_device',
            label: 'Stop the app',
            params: { deviceId: 'test-device-123', processId: 12345 },
            priority: 1,
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
        createMockFileSystemExecutor(),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App launched successfully\n\nApp "com.example.app" launched on device "test-device-123"',
          },
        ],
        nextSteps: [],
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
        createMockFileSystemExecutor(),
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
        createMockFileSystemExecutor(),
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
        createMockFileSystemExecutor(),
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
        createMockFileSystemExecutor(),
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
