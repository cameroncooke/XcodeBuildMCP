/**
 * Tests for list_devices plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using pure dependency injection for deterministic testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMockExecutor } from '../../../utils/command.js';
import listDevices from '../list_devices.ts';

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

  // Mock state tracking
  let commandCalls: Array<{
    command: string[];
    logPrefix?: string;
    useShell?: boolean;
    env?: Record<string, string>;
  }> = [];
  let readFileCalls: string[] = [];
  let unlinkCalls: string[] = [];
  let mockReadFileData: string | null = null;

  // Reset state
  commandCalls = [];
  readFileCalls = [];
  unlinkCalls = [];
  mockReadFileData = null;

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

      mockReadFileData = JSON.stringify(devicectlJson);

      // Create tracking executor
      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        commandCalls.push({ command, logPrefix, useShell, env });
        return {
          success: true,
          output: '',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      // Create mock path dependencies
      const mockPathDeps = {
        tmpdir: () => '/tmp',
        join: (...paths: string[]) => paths.join('/'),
      };

      // Create mock fs dependencies
      const mockFsDeps = {
        readFile: async (path: string, encoding?: string) => {
          readFileCalls.push(path);
          if (mockReadFileData === null) {
            throw new Error('No mock data set');
          }
          return mockReadFileData;
        },
        unlink: async (path: string) => {
          unlinkCalls.push(path);
        },
      };

      await listDevices.handler({}, trackingExecutor, mockPathDeps, mockFsDeps);

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

      mockReadFileData = JSON.stringify(devicectlJson);

      // Create tracking executor
      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        commandCalls.push({ command, logPrefix, useShell, env });
        return {
          success: true,
          output: '',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      // Create mock path dependencies
      const mockPathDeps = {
        tmpdir: () => '/tmp',
        join: (...paths: string[]) => paths.join('/'),
      };

      // Create mock fs dependencies
      const mockFsDeps = {
        readFile: async (path: string, encoding?: string) => {
          readFileCalls.push(path);
          if (mockReadFileData === null) {
            throw new Error('No mock data set');
          }
          return mockReadFileData;
        },
        unlink: async (path: string) => {
          unlinkCalls.push(path);
        },
      };

      const result = await listDevices.handler({}, trackingExecutor, mockPathDeps, mockFsDeps);

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
        commandCalls.push({ command, logPrefix, useShell, env });

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

      // Create mock fs dependencies
      const mockFsDeps = {
        readFile: async (path: string, encoding?: string) => {
          readFileCalls.push(path);
          throw new Error('File not found');
        },
        unlink: async (path: string) => {
          unlinkCalls.push(path);
        },
      };

      const result = await listDevices.handler({}, trackingExecutor, mockPathDeps, mockFsDeps);

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
      // Create tracking executor that fails both calls
      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        commandCalls.push({ command, logPrefix, useShell, env });
        return {
          success: false,
          output: '',
          error: 'Command failed',
          process: { pid: 12345 },
        };
      };

      // Create mock path dependencies
      const mockPathDeps = {
        tmpdir: () => '/tmp',
        join: (...paths: string[]) => paths.join('/'),
      };

      // Create mock fs dependencies
      const mockFsDeps = {
        readFile: async (path: string, encoding?: string) => {
          readFileCalls.push(path);
          throw new Error('File not found');
        },
        unlink: async (path: string) => {
          unlinkCalls.push(path);
        },
      };

      const result = await listDevices.handler({}, trackingExecutor, mockPathDeps, mockFsDeps);

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

      mockReadFileData = JSON.stringify(devicectlJson);

      // Create tracking executor with call count behavior
      let callCount = 0;
      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callCount++;
        commandCalls.push({ command, logPrefix, useShell, env });

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

      // Create mock fs dependencies
      const mockFsDeps = {
        readFile: async (path: string, encoding?: string) => {
          readFileCalls.push(path);
          if (mockReadFileData === null) {
            throw new Error('No mock data set');
          }
          return mockReadFileData;
        },
        unlink: async (path: string) => {
          unlinkCalls.push(path);
        },
      };

      const result = await listDevices.handler({}, trackingExecutor, mockPathDeps, mockFsDeps);

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
      // Create tracking executor that throws an error
      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        commandCalls.push({ command, logPrefix, useShell, env });
        throw new Error('Unexpected error');
      };

      // Create mock path dependencies
      const mockPathDeps = {
        tmpdir: () => '/tmp',
        join: (...paths: string[]) => paths.join('/'),
      };

      // Create mock fs dependencies
      const mockFsDeps = {
        readFile: async (path: string, encoding?: string) => {
          readFileCalls.push(path);
          throw new Error('File not found');
        },
        unlink: async (path: string) => {
          unlinkCalls.push(path);
        },
      };

      const result = await listDevices.handler({}, trackingExecutor, mockPathDeps, mockFsDeps);

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
