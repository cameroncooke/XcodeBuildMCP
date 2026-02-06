/**
 * Tests for install_app_device plugin (device-shared)
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as z from 'zod';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';
import { schema, handler, install_app_deviceLogic } from '../install_app_device.ts';
import { sessionStore } from '../../../../utils/session-store.ts';

describe('install_app_device plugin', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Handler Requirements', () => {
    it('should require deviceId when session defaults are missing', async () => {
      const result = await handler({
        appPath: '/path/to/test.app',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('deviceId is required');
    });
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have handler function', () => {
      expect(typeof handler).toBe('function');
    });

    it('should require appPath in public schema', () => {
      const schemaObj = z.strictObject(schema);
      expect(schemaObj.safeParse({ appPath: '/path/to/test.app' }).success).toBe(true);
      expect(schemaObj.safeParse({}).success).toBe(false);
      expect(schemaObj.safeParse({ deviceId: 'test-device-123' }).success).toBe(false);

      expect(Object.keys(schema)).toEqual(['appPath']);
    });
  });

  describe('Command Generation', () => {
    it('should generate correct devicectl command with basic parameters', async () => {
      let capturedCommand: string[] = [];
      let capturedDescription: string = '';
      let capturedUseShell: boolean = false;
      let capturedEnv: Record<string, string> | undefined = undefined;

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'App installation successful',
        process: { pid: 12345 },
      });

      const trackingExecutor = async (
        command: string[],
        description?: string,
        useShell?: boolean,
        opts?: { env?: Record<string, string> },
        _detached?: boolean,
      ) => {
        capturedCommand = command;
        capturedDescription = description ?? '';
        capturedUseShell = !!useShell;
        capturedEnv = opts?.env;
        return mockExecutor(command, description, useShell, opts, _detached);
      };

      await install_app_deviceLogic(
        {
          deviceId: 'test-device-123',
          appPath: '/path/to/test.app',
        },
        trackingExecutor,
      );

      expect(capturedCommand).toEqual([
        'xcrun',
        'devicectl',
        'device',
        'install',
        'app',
        '--device',
        'test-device-123',
        '/path/to/test.app',
      ]);
      expect(capturedDescription).toBe('Install app on device');
      expect(capturedUseShell).toBe(false);
      expect(capturedEnv).toBe(undefined);
    });

    it('should generate correct command with different device ID', async () => {
      let capturedCommand: string[] = [];

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'App installation successful',
        process: { pid: 12345 },
      });

      const trackingExecutor = async (command: string[]) => {
        capturedCommand = command;
        return mockExecutor(command);
      };

      await install_app_deviceLogic(
        {
          deviceId: 'different-device-uuid',
          appPath: '/apps/MyApp.app',
        },
        trackingExecutor,
      );

      expect(capturedCommand).toEqual([
        'xcrun',
        'devicectl',
        'device',
        'install',
        'app',
        '--device',
        'different-device-uuid',
        '/apps/MyApp.app',
      ]);
    });

    it('should generate correct command with paths containing spaces', async () => {
      let capturedCommand: string[] = [];

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'App installation successful',
        process: { pid: 12345 },
      });

      const trackingExecutor = async (command: string[]) => {
        capturedCommand = command;
        return mockExecutor(command);
      };

      await install_app_deviceLogic(
        {
          deviceId: 'test-device-123',
          appPath: '/path/to/My App.app',
        },
        trackingExecutor,
      );

      expect(capturedCommand).toEqual([
        'xcrun',
        'devicectl',
        'device',
        'install',
        'app',
        '--device',
        'test-device-123',
        '/path/to/My App.app',
      ]);
    });
  });

  describe('Success Path Tests', () => {
    it('should return successful installation response', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'App installation successful',
      });

      const result = await install_app_deviceLogic(
        {
          deviceId: 'test-device-123',
          appPath: '/path/to/test.app',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App installed successfully on device test-device-123\n\nApp installation successful',
          },
        ],
      });
    });

    it('should return successful installation with detailed output', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output:
          'Installing app...\nApp bundle: /path/to/test.app\nInstallation completed successfully',
      });

      const result = await install_app_deviceLogic(
        {
          deviceId: 'device-456',
          appPath: '/apps/TestApp.app',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App installed successfully on device device-456\n\nInstalling app...\nApp bundle: /path/to/test.app\nInstallation completed successfully',
          },
        ],
      });
    });

    it('should return successful installation with empty output', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
      });

      const result = await install_app_deviceLogic(
        {
          deviceId: 'empty-output-device',
          appPath: '/path/to/app.app',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App installed successfully on device empty-output-device\n\n',
          },
        ],
      });
    });
  });

  describe('Error Handling', () => {
    it('should return installation failure response', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Installation failed: App not found',
      });

      const result = await install_app_deviceLogic(
        {
          deviceId: 'test-device-123',
          appPath: '/path/to/nonexistent.app',
        },
        mockExecutor,
      );

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

    it('should return exception handling response', async () => {
      const mockExecutor = createMockExecutor(new Error('Network error'));

      const result = await install_app_deviceLogic(
        {
          deviceId: 'test-device-123',
          appPath: '/path/to/test.app',
        },
        mockExecutor,
      );

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

    it('should return string error handling response', async () => {
      const mockExecutor = createMockExecutor('String error');

      const result = await install_app_deviceLogic(
        {
          deviceId: 'test-device-123',
          appPath: '/path/to/test.app',
        },
        mockExecutor,
      );

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
