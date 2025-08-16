/**
 * Tests for install_app_device plugin (device-shared)
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect } from 'vitest';
import { createMockExecutor } from '../../../../test-utils/mock-executors.js';
import installAppDevice, { install_app_deviceLogic } from '../install_app_device.ts';

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

  describe('Command Generation', () => {
    it('should generate correct devicectl command with basic parameters', async () => {
      let capturedCommand: unknown[] = [];
      let capturedDescription: string = '';
      let capturedUseShell: boolean = false;
      let capturedEnv: unknown = undefined;

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'App installation successful',
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
      expect(capturedUseShell).toBe(true);
      expect(capturedEnv).toBe(undefined);
    });

    it('should generate correct command with different device ID', async () => {
      let capturedCommand: unknown[] = [];

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'App installation successful',
        process: { pid: 12345 },
      });

      const trackingExecutor = async (command: unknown[]) => {
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
      let capturedCommand: unknown[] = [];

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'App installation successful',
        process: { pid: 12345 },
      });

      const trackingExecutor = async (command: unknown[]) => {
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
