/**
 * Tests for list_devices plugin (re-exported from device-shared)
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect } from 'vitest';
import { createMockExecutor, createMockFileSystemExecutor } from '../../../../utils/command.js';
import listDevices, { list_devicesLogic } from '../../device-shared/list_devices.js';

describe('list_devices plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(listDevices.name).toBe('list_devices');
    });

    it('should have correct description', () => {
      expect(listDevices.description).toBe(
        'Lists connected physical Apple devices (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro) with their UUIDs, names, and connection status. Use this to discover physical devices for testing.',
      );
    });

    it('should have handler function', () => {
      expect(typeof listDevices.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Empty schema - should accept any input
      expect(Object.keys(listDevices.schema)).toEqual([]);
      // For empty schema object, test that it's an empty object
      expect(listDevices.schema).toEqual({});
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should generate correct devicectl command', async () => {
      const devicectlJson = {
        result: {
          devices: [
            {
              identifier: 'test-device-123',
              visibilityClass: 'Default',
              connectionProperties: {
                pairingState: 'paired',
                tunnelState: 'connected',
                transportType: 'USB',
              },
              deviceProperties: {
                name: 'Test iPhone',
                platformIdentifier: 'com.apple.platform.iphoneos',
                osVersionNumber: '17.0',
              },
              hardwareProperties: {
                productType: 'iPhone15,2',
              },
            },
          ],
        },
      };

      // Track command calls
      const commandCalls: Array<{
        command: string[];
        logPrefix?: string;
        useShell?: boolean;
        env?: Record<string, string>;
      }> = [];

      // Create mock executor
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
      });

      // Wrap to track calls
      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        commandCalls.push({ command, logPrefix, useShell, env });
        return mockExecutor(command, logPrefix, useShell, env);
      };

      // Create mock path dependencies
      const mockPathDeps = {
        tmpdir: () => '/tmp',
        join: (...paths: string[]) => paths.join('/'),
      };

      // Create mock filesystem with specific behavior
      const mockFsDeps = createMockFileSystemExecutor({
        readFile: async (path: string) => JSON.stringify(devicectlJson),
        unlink: async () => {},
      });

      await list_devicesLogic({}, trackingExecutor, mockPathDeps, mockFsDeps);

      expect(commandCalls).toHaveLength(1);
      expect(commandCalls[0].command).toEqual([
        'xcrun',
        'devicectl',
        'list',
        'devices',
        '--json-output',
        '/tmp/devicectl-123.json',
      ]);
      expect(commandCalls[0].logPrefix).toBe('List Devices (devicectl with JSON)');
      expect(commandCalls[0].useShell).toBe(true);
      expect(commandCalls[0].env).toBeUndefined();
    });

    it('should return exact successful devicectl response with parsed devices', async () => {
      const devicectlJson = {
        result: {
          devices: [
            {
              identifier: 'test-device-123',
              visibilityClass: 'Default',
              connectionProperties: {
                pairingState: 'paired',
                tunnelState: 'connected',
                transportType: 'USB',
              },
              deviceProperties: {
                name: 'Test iPhone',
                platformIdentifier: 'com.apple.platform.iphoneos',
                osVersionNumber: '17.0',
              },
              hardwareProperties: {
                productType: 'iPhone15,2',
              },
            },
          ],
        },
      };

      // Create mock executor
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
      });

      // Create mock path dependencies
      const mockPathDeps = {
        tmpdir: () => '/tmp',
        join: (...paths: string[]) => paths.join('/'),
      };

      // Create mock filesystem with specific behavior
      const mockFsDeps = createMockFileSystemExecutor({
        readFile: async (path: string) => JSON.stringify(devicectlJson),
        unlink: async () => {},
      });

      const result = await list_devicesLogic({}, mockExecutor, mockPathDeps, mockFsDeps);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Connected Devices:\n\n✅ Available Devices:\n\n📱 Test iPhone\n   UDID: test-device-123\n   Model: iPhone15,2\n   Product Type: iPhone15,2\n   Platform: iOS 17.0\n   Connection: USB\n\nNext Steps:\n1. Build for device: build_ios_dev_ws({ workspacePath: 'PATH', scheme: 'SCHEME' })\n2. Run tests: test_ios_dev_ws({ workspacePath: 'PATH', scheme: 'SCHEME' })\n3. Get app path: get_ios_dev_app_path_ws({ workspacePath: 'PATH', scheme: 'SCHEME' })\n\nNote: Use the device ID/UDID from above when required by other tools.\n",
          },
        ],
      });
    });

    it('should return exact xctrace fallback response', async () => {
      // Create tracking executor with call count behavior
      let callCount = 0;
      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callCount++;

        if (callCount === 1) {
          // First call fails (devicectl)
          return {
            success: false,
            output: '',
            error: 'devicectl failed',
            process: { pid: 12345 },
          };
        } else {
          // Second call succeeds (xctrace)
          return {
            success: true,
            output: 'iPhone 15 (12345678-1234-1234-1234-123456789012)',
            error: undefined,
            process: { pid: 12345 },
          };
        }
      };

      // Create mock path dependencies
      const mockPathDeps = {
        tmpdir: () => '/tmp',
        join: (...paths: string[]) => paths.join('/'),
      };

      // Create mock filesystem that throws for readFile
      const mockFsDeps = createMockFileSystemExecutor({
        readFile: async () => {
          throw new Error('File not found');
        },
        unlink: async () => {},
      });

      const result = await list_devicesLogic({}, trackingExecutor, mockPathDeps, mockFsDeps);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Device listing (xctrace output):\n\niPhone 15 (12345678-1234-1234-1234-123456789012)\n\nNote: For better device information, please upgrade to Xcode 15 or later which supports the modern devicectl command.',
          },
        ],
      });
    });

    it('should return exact failure response', async () => {
      // Create mock executor that fails both calls
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Command failed',
      });

      // Create mock path dependencies
      const mockPathDeps = {
        tmpdir: () => '/tmp',
        join: (...paths: string[]) => paths.join('/'),
      };

      // Create mock filesystem that throws for readFile
      const mockFsDeps = createMockFileSystemExecutor({
        readFile: async () => {
          throw new Error('File not found');
        },
        unlink: async () => {},
      });

      const result = await list_devicesLogic({}, mockExecutor, mockPathDeps, mockFsDeps);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to list devices: Command failed\n\nMake sure Xcode is installed and devices are connected and trusted.',
          },
        ],
        isError: true,
      });
    });

    it('should return exact no devices found response', async () => {
      const devicectlJson = {
        result: {
          devices: [],
        },
      };

      // Create tracking executor with call count behavior
      let callCount = 0;
      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callCount++;

        if (callCount === 1) {
          // First call succeeds (devicectl)
          return {
            success: true,
            output: '',
            error: undefined,
            process: { pid: 12345 },
          };
        } else {
          // Second call succeeds (xctrace) with empty output
          return {
            success: true,
            output: '',
            error: undefined,
            process: { pid: 12345 },
          };
        }
      };

      // Create mock path dependencies
      const mockPathDeps = {
        tmpdir: () => '/tmp',
        join: (...paths: string[]) => paths.join('/'),
      };

      // Create mock filesystem with empty devices response
      const mockFsDeps = createMockFileSystemExecutor({
        readFile: async () => JSON.stringify(devicectlJson),
        unlink: async () => {},
      });

      const result = await list_devicesLogic({}, trackingExecutor, mockPathDeps, mockFsDeps);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Device listing (xctrace output):\n\n\n\nNote: For better device information, please upgrade to Xcode 15 or later which supports the modern devicectl command.',
          },
        ],
      });
    });

    it('should return exact exception handling response', async () => {
      // Create mock executor that throws an error
      const mockExecutor = createMockExecutor(new Error('Unexpected error'));

      // Create mock path dependencies
      const mockPathDeps = {
        tmpdir: () => '/tmp',
        join: (...paths: string[]) => paths.join('/'),
      };

      // Create mock filesystem
      const mockFsDeps = createMockFileSystemExecutor({
        readFile: async () => {
          throw new Error('File not found');
        },
        unlink: async () => {},
      });

      const result = await list_devicesLogic({}, mockExecutor, mockPathDeps, mockFsDeps);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to list devices: Unexpected error',
          },
        ],
        isError: true,
      });
    });
  });
});
