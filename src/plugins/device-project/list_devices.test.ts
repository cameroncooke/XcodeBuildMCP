/**
 * Tests for list_devices plugin (device-project re-export)
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import listDevices from './list_devices.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  executeCommand: vi.fn(),
}));

vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    unlink: vi.fn(),
  },
}));

vi.mock('os', () => ({
  tmpdir: vi.fn().mockReturnValue('/tmp'),
}));

vi.mock('path', () => ({
  join: vi.fn().mockReturnValue('/tmp/devicectl-123.json'),
}));

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

  let mockExecuteCommand: MockedFunction<any>;
  let mockReadFile: MockedFunction<any>;
  let mockUnlink: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');
    const fs = await import('fs');

    mockExecuteCommand = utils.executeCommand as MockedFunction<any>;
    mockReadFile = fs.promises.readFile as MockedFunction<any>;
    mockUnlink = fs.promises.unlink as MockedFunction<any>;

    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
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

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: '',
        error: '',
      });
      mockReadFile.mockResolvedValue(JSON.stringify(devicectlJson));
      mockUnlink.mockResolvedValue(undefined);

      const result = await listDevices.handler({});

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
      mockExecuteCommand
        .mockResolvedValueOnce({
          success: false,
          output: '',
          error: 'devicectl failed',
        })
        .mockResolvedValueOnce({
          success: true,
          output: 'iPhone 15 (12345678-1234-1234-1234-123456789012)',
          error: '',
        });

      const result = await listDevices.handler({});

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
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Command failed',
      });

      const result = await listDevices.handler({});

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

      // Mock first call (devicectl) - succeeds but no devices
      // Mock second call (xctrace fallback) - succeeds with empty output
      mockExecuteCommand
        .mockResolvedValueOnce({
          success: true,
          output: '',
          error: '',
        })
        .mockResolvedValueOnce({
          success: true,
          output: '',
          error: '',
        });
      mockReadFile.mockResolvedValue(JSON.stringify(devicectlJson));
      mockUnlink.mockResolvedValue(undefined);

      const result = await listDevices.handler({});

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
      mockExecuteCommand.mockRejectedValue(new Error('Unexpected error'));

      const result = await listDevices.handler({});

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
