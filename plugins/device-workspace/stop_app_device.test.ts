/**
 * Vitest tests for stop_app_device tool
 *
 * Tests the stop_app_device tool from device/index.ts
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

// Import the plugin
import stopAppDevice from './stop_app_device.ts';

// Test the plugin directly - no registration function needed

// ✅ CORRECT: Mock external dependencies only
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

// ✅ CORRECT: Mock executeCommand utility
vi.mock('../../src/utils/command.ts', () => ({
  executeCommand: vi.fn(),
}));

// ✅ CORRECT: Mock logger to prevent real logging
vi.mock('../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

// ✅ CORRECT: Mock validation utilities
vi.mock('../../src/utils/validation.ts', () => ({
  validateRequiredParam: vi.fn(),
  validateFileExists: vi.fn(),
}));

// Mock removed - no longer needed for plugin testing

describe('stop_app_device tool', () => {
  describe('plugin structure', () => {
    it('should export plugin with correct structure', () => {
      expect(stopAppDevice).toBeDefined();
      expect(stopAppDevice.name).toBe('stop_app_device');
      expect(stopAppDevice.description).toBe('Stops an app running on a physical Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). Requires deviceId and processId.');
      expect(stopAppDevice.schema).toBeDefined();
      expect(stopAppDevice.handler).toBeDefined();
      expect(typeof stopAppDevice.handler).toBe('function');
    });

    it('should have correct schema structure', () => {
      expect(stopAppDevice.schema).toHaveProperty('deviceId');
      expect(stopAppDevice.schema).toHaveProperty('processId');
    });
  });

  let mockExecuteCommand: MockedFunction<any>;
  let mockServer: any;

  beforeEach(async () => {
    // Mock executeCommand
    const { executeCommand } = await import('../../src/utils/command.ts');
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
      expect(stopAppDevice.name).toBe('stop_app_device');
      expect(stopAppDevice.description).toBe('Stops an app running on a physical Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). Requires deviceId and processId.');
      expect(stopAppDevice.schema).toHaveProperty('deviceId');
      expect(stopAppDevice.schema).toHaveProperty('processId');
      expect(typeof stopAppDevice.handler).toBe('function');
    });

    it('should handle successful app termination', async () => {
      // Test plugin handler directly

      // Mock successful devicectl execution
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Process terminated successfully',
        error: '',
      });

      // ✅ Test plugin handler with successful termination
      const result = await stopAppDevice.handler({
        deviceId: 'test-device-123',
        processId: 12345,
      });

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        [
          'xcrun',
          'devicectl',
          'device',
          'process',
          'terminate',
          '--device',
          'test-device-123',
          '--pid',
          '12345',
        ],
        'Stop app on device',
      );
      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: '✅ App stopped successfully\n\nProcess terminated successfully'
        }
      ]);
      expect(result.isError).toBeUndefined();
    });

    it('should handle devicectl failure', async () => {
      // Test plugin handler directly

      // Mock devicectl failure
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Process not found',
      });

      // ✅ Test plugin handler with failure
      const result = await stopAppDevice.handler({
        deviceId: 'test-device-123',
        processId: 12345,
      });

      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: 'Failed to stop app: Process not found'
        }
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle unexpected errors', async () => {
      // Test plugin handler directly

      // Mock executeCommand to throw an error
      mockExecuteCommand.mockRejectedValue(new Error('Unexpected error'));

      // ✅ Test plugin handler with unexpected error
      const result = await stopAppDevice.handler({
        deviceId: 'test-device-123',
        processId: 12345,
      });

      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: 'Failed to stop app on device: Unexpected error'
        }
      ]);
      expect(result.isError).toBe(true);
    });

    it('should convert processId to string for command', async () => {
      // Test plugin handler directly

      // Mock successful execution
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Process terminated',
        error: '',
      });

      // ✅ Test with numeric processId
      await stopAppDevice.handler({
        deviceId: 'test-device-123',
        processId: 9999,
      });

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        expect.arrayContaining(['--pid', '9999']),
        'Stop app on device',
      );
    });
  });
});