/**
 * Vitest tests for list_devices tool
 *
 * Tests the list_devices tool from device/index.ts
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

// Import the plugin
import listDevices from './list_devices.js';

// Test the plugin directly - no registration function needed

// ✅ CORRECT: Mock external dependencies only
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

// ✅ CORRECT: Mock executeCommand utility
vi.mock('../../src/utils/command.js', () => ({
  executeCommand: vi.fn(),
}));

// ✅ CORRECT: Mock logger to prevent real logging
vi.mock('../../src/utils/logger.js', () => ({
  log: vi.fn(),
}));

// ✅ CORRECT: Mock validation utilities
vi.mock('../../src/utils/validation.js', () => ({
  validateRequiredParam: vi.fn(),
  validateFileExists: vi.fn(),
}));

// Mock removed - no longer needed for plugin testing

// ✅ CORRECT: Mock filesystem operations for JSON files
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    unlink: vi.fn(),
  },
}));

describe('list_devices tool', () => {
  describe('plugin structure', () => {
    it('should export plugin with correct structure', () => {
      expect(listDevices).toBeDefined();
      expect(listDevices.name).toBe('list_devices');
      expect(listDevices.description).toBe('Lists connected physical Apple devices (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro) with their UUIDs, names, and connection status. Use this to discover physical devices for testing.');
      expect(listDevices.schema).toBeDefined();
      expect(listDevices.handler).toBeDefined();
      expect(typeof listDevices.handler).toBe('function');
    });
  });

  let mockExecuteCommand: MockedFunction<any>;
  let mockServer: any;

  beforeEach(async () => {
    // Mock executeCommand
    const { executeCommand } = await import('../../src/utils/command.js');
    mockExecuteCommand = executeCommand as MockedFunction<any>;
    mockExecuteCommand.mockResolvedValue({
      success: true,
      output: '',
      error: '',
    });

    // Mock server object with tool method
    mockServer = {
      tool: vi.fn(),
    };

    vi.clearAllMocks();
  });

  describe('plugin handler', () => {
    it('should have correct plugin structure and registration info', () => {
      // ✅ Test plugin has correct structure for registration
      expect(listDevices.name).toBe('list_devices');
      expect(listDevices.description).toBe('Lists connected physical Apple devices (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro) with their UUIDs, names, and connection status. Use this to discover physical devices for testing.');
      expect(listDevices.schema).toEqual({});
      expect(typeof listDevices.handler).toBe('function');
    });

    it('should handle successful devicectl listing', async () => {
      // Test plugin handler directly

      // Mock filesystem operations
      const { promises: fs } = await import('fs');
      const mockReadFile = fs.readFile as MockedFunction<any>;
      const mockUnlink = fs.unlink as MockedFunction<any>;

      mockReadFile.mockResolvedValue(JSON.stringify({
        result: {
          devices: [
            {
              identifier: 'test-device-123',
              visibilityClass: 'Default',
              connectionProperties: {
                pairingState: 'paired',
                tunnelState: 'connected',
                transportType: 'USB'
              },
              deviceProperties: {
                name: 'Test iPhone',
                platformIdentifier: 'com.apple.platform.iphoneos',
                osVersionNumber: '17.0'
              },
              hardwareProperties: {
                productType: 'iPhone15,2'
              }
            }
          ]
        }
      }));
      
      mockUnlink.mockResolvedValue(undefined);

      // Mock successful devicectl execution
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: '',
        error: '',
      });

      // ✅ Test plugin handler with successful listing
      const result = await listDevices.handler({});

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        expect.arrayContaining(['xcrun', 'devicectl', 'list', 'devices', '--json-output']),
        'List Devices (devicectl with JSON)',
      );
      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: expect.stringContaining('Connected Devices:')
        }
      ]);
      expect(result.content[0].text).toContain('Test iPhone');
      expect(result.isError).toBeUndefined();
    });

    it('should handle devicectl failure and fallback to xctrace', async () => {
      // Test plugin handler directly

      // Mock devicectl failure and xctrace success
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

      // ✅ Test plugin handler with devicectl failure and xctrace fallback
      const result = await listDevices.handler({});

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        expect.arrayContaining(['xcrun', 'devicectl', 'list', 'devices', '--json-output']),
        'List Devices (devicectl with JSON)',
      );
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        ['xcrun', 'xctrace', 'list', 'devices'],
        'List Devices (xctrace)',
      );
      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: expect.stringContaining('Device listing (xctrace output):')
        }
      ]);
      expect(result.content[0].text).toContain('iPhone 15');
      expect(result.isError).toBeUndefined();
    });

    it('should handle complete failure', async () => {
      // Test plugin handler directly

      // Mock both devicectl and xctrace failure
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Command failed',
      });

      // ✅ Test plugin handler with complete failure
      const result = await listDevices.handler({});

      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: expect.stringContaining('Failed to list devices: Command failed')
        }
      ]);
      expect(result.isError).toBe(true);
    });
  });

});