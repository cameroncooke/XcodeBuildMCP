/**
 * Tests for stop_app_device plugin (device-shared)
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';
import stopAppDevice, { stop_app_deviceLogic } from '../stop_app_device.ts';
import { sessionStore } from '../../../../utils/session-store.ts';

describe('stop_app_device plugin', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(stopAppDevice.name).toBe('stop_app_device');
    });

    it('should have correct description', () => {
      expect(stopAppDevice.description).toBe('Stops a running app on a connected device.');
    });

    it('should have handler function', () => {
      expect(typeof stopAppDevice.handler).toBe('function');
    });

    it('should require processId in public schema', () => {
      const schema = z.object(stopAppDevice.schema).strict();
      expect(schema.safeParse({ processId: 12345 }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ deviceId: 'test-device-123' }).success).toBe(false);

      expect(Object.keys(stopAppDevice.schema)).toEqual(['processId']);
    });
  });

  describe('Handler Requirements', () => {
    it('should require deviceId when not provided', async () => {
      const result = await stopAppDevice.handler({ processId: 12345 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('deviceId is required');
    });
  });

  describe('Command Generation', () => {
    it('should generate correct devicectl command with basic parameters', async () => {
      let capturedCommand: unknown[] = [];
      let capturedDescription: string = '';
      let capturedUseShell: boolean = false;
      let capturedEnv: unknown = undefined;

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'App terminated successfully',
        process: { pid: 12345 },
      });

      const trackingExecutor = async (
        command: unknown[],
        description: string,
        useShell: boolean,
        env: unknown,
      ) => {
        capturedCommand = command;
        capturedDescription = description;
        capturedUseShell = useShell;
        capturedEnv = env;
        return mockExecutor(command, description, useShell, env);
      };

      await stop_app_deviceLogic(
        {
          deviceId: 'test-device-123',
          processId: 12345,
        },
        trackingExecutor,
      );

      expect(capturedCommand).toEqual([
        'xcrun',
        'devicectl',
        'device',
        'process',
        'terminate',
        '--device',
        'test-device-123',
        '--pid',
        '12345',
      ]);
      expect(capturedDescription).toBe('Stop app on device');
      expect(capturedUseShell).toBe(true);
      expect(capturedEnv).toBe(undefined);
    });

    it('should generate correct command with different device ID and process ID', async () => {
      let capturedCommand: unknown[] = [];

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Process terminated',
        process: { pid: 12345 },
      });

      const trackingExecutor = async (command: unknown[]) => {
        capturedCommand = command;
        return mockExecutor(command);
      };

      await stop_app_deviceLogic(
        {
          deviceId: 'different-device-uuid',
          processId: 99999,
        },
        trackingExecutor,
      );

      expect(capturedCommand).toEqual([
        'xcrun',
        'devicectl',
        'device',
        'process',
        'terminate',
        '--device',
        'different-device-uuid',
        '--pid',
        '99999',
      ]);
    });

    it('should generate correct command with large process ID', async () => {
      let capturedCommand: unknown[] = [];

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Process terminated',
        process: { pid: 12345 },
      });

      const trackingExecutor = async (command: unknown[]) => {
        capturedCommand = command;
        return mockExecutor(command);
      };

      await stop_app_deviceLogic(
        {
          deviceId: 'test-device-123',
          processId: 2147483647,
        },
        trackingExecutor,
      );

      expect(capturedCommand).toEqual([
        'xcrun',
        'devicectl',
        'device',
        'process',
        'terminate',
        '--device',
        'test-device-123',
        '--pid',
        '2147483647',
      ]);
    });
  });

  describe('Success Path Tests', () => {
    it('should return successful stop response', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'App terminated successfully',
      });

      const result = await stop_app_deviceLogic(
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

    it('should return successful stop with detailed output', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Terminating process...\nProcess ID: 12345\nTermination completed successfully',
      });

      const result = await stop_app_deviceLogic(
        {
          deviceId: 'device-456',
          processId: 67890,
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App stopped successfully\n\nTerminating process...\nProcess ID: 12345\nTermination completed successfully',
          },
        ],
      });
    });

    it('should return successful stop with empty output', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
      });

      const result = await stop_app_deviceLogic(
        {
          deviceId: 'empty-output-device',
          processId: 54321,
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App stopped successfully\n\n',
          },
        ],
      });
    });
  });

  describe('Error Handling', () => {
    it('should return stop failure response', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Terminate failed: Process not found',
      });

      const result = await stop_app_deviceLogic(
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

    it('should return exception handling response', async () => {
      const mockExecutor = createMockExecutor(new Error('Network error'));

      const result = await stop_app_deviceLogic(
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

    it('should return string error handling response', async () => {
      const mockExecutor = createMockExecutor('String error');

      const result = await stop_app_deviceLogic(
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
  });
});
