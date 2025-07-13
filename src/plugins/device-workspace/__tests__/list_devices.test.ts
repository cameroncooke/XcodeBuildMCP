/**
 * Tests for list_devices plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createMockExecutor } from '../../../utils/command.js';
import listDevices from '../list_devices.ts';

// Mock fs for file operations
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    unlink: vi.fn(),
  },
}));

// Mock os for tmpdir
vi.mock('os', () => ({
  tmpdir: vi.fn().mockReturnValue('/tmp'),
}));

// Mock path with importOriginal
vi.mock('path', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    join: vi.fn().mockReturnValue('/tmp/devicectl-123.json'),
  };
});

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

  let mockReadFile: Record<string, unknown>;
  let mockUnlink: Record<string, unknown>;

  beforeEach(async () => {
    const fs = await import('fs');

    mockReadFile = vi.mocked(fs.promises.readFile);
    mockUnlink = vi.mocked(fs.promises.unlink);

    vi.clearAllMocks();
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

      mockReadFile.mockResolvedValue(JSON.stringify(devicectlJson));
      mockUnlink.mockResolvedValue(undefined);

      const mockExecutor = vi.fn().mockResolvedValue({
        success: true,
        output: '',
        error: undefined,
        process: { pid: 12345 },
      });

      await listDevices.handler({}, mockExecutor);

      expect(mockExecutor).toHaveBeenCalledWith(
        ['xcrun', 'devicectl', 'list', 'devices', '--json-output', '/tmp/devicectl-123.json'],
        'List Devices (devicectl with JSON)',
        true,
        undefined,
      );
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

      mockReadFile.mockResolvedValue(JSON.stringify(devicectlJson));
      mockUnlink.mockResolvedValue(undefined);

      const mockExecutor = vi.fn().mockResolvedValue({
        success: true,
        output: '',
        error: undefined,
        process: { pid: 12345 },
      });

      const result = await listDevices.handler({}, mockExecutor);

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
      // First call fails (devicectl), second call succeeds (xctrace)
      let callCount = 0;
      const mockExecutor = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call fails (devicectl)
          return Promise.resolve({
            success: false,
            output: '',
            error: 'devicectl failed',
            process: { pid: 12345 },
          });
        } else {
          // Second call succeeds (xctrace)
          return Promise.resolve({
            success: true,
            output: 'iPhone 15 (12345678-1234-1234-1234-123456789012)',
            error: undefined,
            process: { pid: 12345 },
          });
        }
      });

      const result = await listDevices.handler({}, mockExecutor);

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
      // Both calls fail
      const mockExecutor = vi.fn().mockResolvedValue({
        success: false,
        output: '',
        error: 'Command failed',
        process: { pid: 12345 },
      });

      const result = await listDevices.handler({}, mockExecutor);

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

      mockReadFile.mockResolvedValue(JSON.stringify(devicectlJson));
      mockUnlink.mockResolvedValue(undefined);

      // First call (devicectl) succeeds but no devices
      // Second call (xctrace fallback) succeeds with empty output
      let callCount = 0;
      const mockExecutor = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call succeeds (devicectl)
          return Promise.resolve({
            success: true,
            output: '',
            error: undefined,
            process: { pid: 12345 },
          });
        } else {
          // Second call succeeds (xctrace) with empty output
          return Promise.resolve({
            success: true,
            output: '',
            error: undefined,
            process: { pid: 12345 },
          });
        }
      });

      const result = await listDevices.handler({}, mockExecutor);

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
      const mockExecutor = vi.fn().mockRejectedValue(new Error('Unexpected error'));

      const result = await listDevices.handler({}, mockExecutor);

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
