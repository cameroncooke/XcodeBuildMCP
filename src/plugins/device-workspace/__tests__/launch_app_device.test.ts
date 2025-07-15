/**
 * Pure dependency injection test for launch_app_device plugin
 *
 * Tests plugin structure and app launching functionality including parameter validation,
 * command generation, file operations, and response formatting.
 *
 * Uses createMockExecutor for command execution and manual stubs for file operations.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import launchAppDevice from '../launch_app_device.ts';

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

    it('should validate schema with valid inputs', () => {
      const schema = z.object(launchAppDevice.schema);
      expect(
        schema.safeParse({
          deviceId: 'test-device-123',
          bundleId: 'com.example.app',
        }).success,
      ).toBe(true);
      expect(
        schema.safeParse({
          deviceId: '00008030-001E14BE2288802E',
          bundleId: 'com.apple.calculator',
        }).success,
      ).toBe(true);
    });

    it('should validate schema with invalid inputs', () => {
      const schema = z.object(launchAppDevice.schema);
      expect(schema.safeParse({}).success).toBe(false);
      expect(
        schema.safeParse({
          deviceId: null,
          bundleId: 'com.example.app',
        }).success,
      ).toBe(false);
      expect(
        schema.safeParse({
          deviceId: 'test-device-123',
          bundleId: null,
        }).success,
      ).toBe(false);
      expect(
        schema.safeParse({
          deviceId: 123,
          bundleId: 'com.example.app',
        }).success,
      ).toBe(false);
    });
  });

  describe('Command Generation', () => {
    it('should generate correct devicectl command with required parameters', async () => {
      // Manual call tracking for command verification
      const calls: any[] = [];
      const mockExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        calls.push({ command, logPrefix, useShell, env });
        return {
          success: true,
          output: 'App launched successfully',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await launchAppDevice.handler(
        {
          deviceId: 'test-device-123',
          bundleId: 'com.example.app',
        },
        mockExecutor,
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
      const mockExecutor = async (command: string[]) => {
        calls.push({ command });
        return {
          success: true,
          output: 'Launch successful',
          error: undefined,
          process: { pid: 54321 },
        };
      };

      await launchAppDevice.handler(
        {
          deviceId: '00008030-001E14BE2288802E',
          bundleId: 'com.apple.mobilesafari',
        },
        mockExecutor,
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

  describe('Response Processing', () => {
    it('should return successful launch response without process ID', async () => {
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

    it('should return successful launch response with simple output format', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Launch succeeded with detailed output',
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
            text: '✅ App launched successfully\n\nLaunch succeeded with detailed output',
          },
        ],
      });
    });

    it('should return launch failure response', async () => {
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

    it('should return command failure response with specific error', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Device not found: test-device-invalid',
      });

      const result = await launchAppDevice.handler(
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
      const calls: any[] = [];
      const mockExecutor = async () => {
        calls.push('executor_called');
        throw new Error('Network error');
      };

      const result = await launchAppDevice.handler(
        {
          deviceId: 'test-device-123',
          bundleId: 'com.example.app',
        },
        mockExecutor,
      );

      expect(calls).toEqual(['executor_called']);
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
      const calls: any[] = [];
      const mockExecutor = async () => {
        calls.push('executor_called');
        throw 'String error';
      };

      const result = await launchAppDevice.handler(
        {
          deviceId: 'test-device-123',
          bundleId: 'com.example.app',
        },
        mockExecutor,
      );

      expect(calls).toEqual(['executor_called']);
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

    it('should verify temp file path pattern in command generation', async () => {
      const calls: any[] = [];
      const mockExecutor = async (command: string[]) => {
        calls.push({ command });
        return {
          success: true,
          output: 'Launch succeeded',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await launchAppDevice.handler(
        {
          deviceId: 'test-device-123',
          bundleId: 'com.example.app',
        },
        mockExecutor,
      );

      expect(calls).toHaveLength(1);
      const command = calls[0].command;
      const jsonOutputIndex = command.indexOf('--json-output');
      expect(jsonOutputIndex).toBeGreaterThan(-1);

      // Verify the temp file path follows the expected pattern
      const tempFilePath = command[jsonOutputIndex + 1];
      expect(tempFilePath).toMatch(/^\/.*\/launch-\d+\.json$/);
      expect(tempFilePath).toContain('launch-');
      expect(tempFilePath).toContain('.json');
    });
  });
});
