/**
 * Vitest tests for stop_app_device tool
 *
 * Tests the stop_app_device tool from device/index.ts
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

// Import the plugin
import stopAppDevice from './stop_app_device.js';

// Import production registration function for compatibility
import { registerStopAppDeviceTool } from '../../src/tools/device/index.js';

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

// ✅ CORRECT: Mock common tools utilities
vi.mock('../../src/tools/common/index.js', () => ({
  createTextContent: vi.fn(),
  registerTool: vi.fn(),
}));

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

  describe('registerStopAppDeviceTool', () => {
    it('should register the stop app device tool correctly', async () => {
      // Mock registerTool
      const { registerTool } = await import('../../src/tools/common/index.js');
      const mockRegisterTool = registerTool as MockedFunction<any>;

      // ✅ Test actual production function
      registerStopAppDeviceTool(mockServer);

      // ✅ Verify production function called registerTool correctly
      expect(mockRegisterTool).toHaveBeenCalledWith(
        mockServer,
        'stop_app_device',
        'Stops an app running on a physical Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). Requires deviceId and processId.',
        {
          deviceId: expect.any(Object),
          processId: expect.any(Object),
        },
        expect.any(Function),
      );
    });

    it('should handle successful app termination', async () => {
      // Test handler directly from exports
      const { stopAppDeviceToolHandler } = await import('../../src/tools/device/index.js');

      // Mock successful devicectl execution
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Process terminated successfully',
        error: '',
      });

      // ✅ Test actual production handler with successful termination
      const result = await stopAppDeviceToolHandler({
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
      // Test handler directly from exports
      const { stopAppDeviceToolHandler } = await import('../../src/tools/device/index.js');

      // Mock devicectl failure
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Process not found',
      });

      // ✅ Test actual production handler with failure
      const result = await stopAppDeviceToolHandler({
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
      // Test handler directly from exports
      const { stopAppDeviceToolHandler } = await import('../../src/tools/device/index.js');

      // Mock executeCommand to throw an error
      mockExecuteCommand.mockRejectedValue(new Error('Unexpected error'));

      // ✅ Test actual production handler with unexpected error
      const result = await stopAppDeviceToolHandler({
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
      // Test handler directly from exports
      const { stopAppDeviceToolHandler } = await import('../../src/tools/device/index.js');

      // Mock successful execution
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Process terminated',
        error: '',
      });

      // ✅ Test with numeric processId
      await stopAppDeviceToolHandler({
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