/**
 * Vitest tests for launch_app_device tool
 *
 * Tests the launch_app_device tool from device/index.ts
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

// Import the plugin
import launchAppDevice from './launch_app_device.js';

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

describe('launch_app_device tool', () => {
  describe('plugin structure', () => {
    it('should export plugin with correct structure', () => {
      expect(launchAppDevice).toBeDefined();
      expect(launchAppDevice.name).toBe('launch_app_device');
      expect(launchAppDevice.description).toBe('Launches an app on a physical Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). Requires deviceId and bundleId.');
      expect(launchAppDevice.schema).toBeDefined();
      expect(launchAppDevice.schema.deviceId).toBeDefined();
      expect(launchAppDevice.schema.bundleId).toBeDefined();
      expect(launchAppDevice.handler).toBeDefined();
      expect(typeof launchAppDevice.handler).toBe('function');
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
      expect(launchAppDevice.name).toBe('launch_app_device');
      expect(launchAppDevice.description).toBe('Launches an app on a physical Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). Requires deviceId and bundleId.');
      expect(launchAppDevice.schema.deviceId).toBeDefined();
      expect(launchAppDevice.schema.bundleId).toBeDefined();
      expect(typeof launchAppDevice.handler).toBe('function');
    });

    it('should handle successful app launch with process ID', async () => {
      // Test plugin handler directly

      // Mock filesystem operations
      const { promises: fs } = await import('fs');
      const mockReadFile = fs.readFile as MockedFunction<any>;
      const mockUnlink = fs.unlink as MockedFunction<any>;

      mockReadFile.mockResolvedValue(JSON.stringify({
        result: {
          process: {
            processIdentifier: 12345
          }
        }
      }));
      
      mockUnlink.mockResolvedValue(undefined);

      // Mock successful devicectl execution
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'App launched successfully',
        error: '',
      });

      // ✅ Test plugin handler with successful launch
      const result = await launchAppDevice.handler({
        deviceId: 'test-device-123',
        bundleId: 'com.example.MyApp'
      });

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        expect.arrayContaining([
          'xcrun', 'devicectl', 'device', 'process', 'launch',
          '--device', 'test-device-123',
          '--json-output', expect.any(String),
          '--terminate-existing',
          'com.example.MyApp'
        ]),
        'Launch app on device',
      );
      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: expect.stringContaining('✅ App launched successfully')
        }
      ]);
      expect(result.content[0].text).toContain('Process ID: 12345');
      expect(result.content[0].text).toContain('stop_app_device');
      expect(result.isError).toBeUndefined();
    });

    it('should handle successful app launch without process ID', async () => {
      // Test plugin handler directly

      // Mock filesystem operations
      const { promises: fs } = await import('fs');
      const mockReadFile = fs.readFile as MockedFunction<any>;
      const mockUnlink = fs.unlink as MockedFunction<any>;

      mockReadFile.mockResolvedValue(JSON.stringify({
        result: {}
      }));
      
      mockUnlink.mockResolvedValue(undefined);

      // Mock successful devicectl execution
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'App launched successfully',
        error: '',
      });

      // ✅ Test plugin handler with successful launch but no process ID
      const result = await launchAppDevice.handler({
        deviceId: 'test-device-123',
        bundleId: 'com.example.MyApp'
      });

      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: expect.stringContaining('✅ App launched successfully')
        }
      ]);
      expect(result.content[0].text).not.toContain('Process ID:');
      expect(result.isError).toBeUndefined();
    });

    it('should handle launch failure', async () => {
      // Test plugin handler directly

      // Mock failed devicectl execution
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Failed to launch app: App not installed',
      });

      // ✅ Test plugin handler with launch failure
      const result = await launchAppDevice.handler({
        deviceId: 'test-device-123',
        bundleId: 'com.example.MyApp'
      });

      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: 'Failed to launch app: Failed to launch app: App not installed'
        }
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle JSON parsing errors gracefully', async () => {
      // Test plugin handler directly

      // Mock filesystem operations
      const { promises: fs } = await import('fs');
      const mockReadFile = fs.readFile as MockedFunction<any>;
      const mockUnlink = fs.unlink as MockedFunction<any>;

      mockReadFile.mockRejectedValue(new Error('File read error'));
      mockUnlink.mockResolvedValue(undefined);

      // Mock successful devicectl execution
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'App launched successfully',
        error: '',
      });

      // ✅ Test plugin handler with JSON parsing error
      const result = await launchAppDevice.handler({
        deviceId: 'test-device-123',
        bundleId: 'com.example.MyApp'
      });

      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: expect.stringContaining('✅ App launched successfully')
        }
      ]);
      expect(result.content[0].text).not.toContain('Process ID:');
      expect(result.isError).toBeUndefined();
    });

    it('should handle unexpected errors', async () => {
      // Test plugin handler directly

      // Mock executeCommand to throw an error
      mockExecuteCommand.mockRejectedValue(new Error('Unexpected error'));

      // ✅ Test plugin handler with unexpected error
      const result = await launchAppDevice.handler({
        deviceId: 'test-device-123',
        bundleId: 'com.example.MyApp'
      });

      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: 'Failed to launch app on device: Unexpected error'
        }
      ]);
      expect(result.isError).toBe(true);
    });
  });
});