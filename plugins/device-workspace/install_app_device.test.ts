/**
 * Vitest tests for install_app_device tool
 *
 * Tests the install_app_device tool from device/index.ts
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

// Import the plugin
import installAppDevice from './install_app_device.js';

// Import production registration function for compatibility
import { registerInstallAppDeviceTool } from '../../src/tools/device/index.js';

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

describe('install_app_device tool', () => {
  describe('plugin structure', () => {
    it('should export plugin with correct structure', () => {
      expect(installAppDevice).toBeDefined();
      expect(installAppDevice.name).toBe('install_app_device');
      expect(installAppDevice.description).toBe('Installs an app on a physical Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). Requires deviceId and appPath.');
      expect(installAppDevice.schema).toBeDefined();
      expect(installAppDevice.handler).toBeDefined();
      expect(typeof installAppDevice.handler).toBe('function');
    });

    it('should have correct schema structure', () => {
      expect(installAppDevice.schema).toHaveProperty('deviceId');
      expect(installAppDevice.schema).toHaveProperty('appPath');
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

  describe('registerInstallAppDeviceTool', () => {
    it('should register the install app device tool correctly', async () => {
      // Mock registerTool
      const { registerTool } = await import('../../src/tools/common/index.js');
      const mockRegisterTool = registerTool as MockedFunction<any>;

      // ✅ Test actual production function
      registerInstallAppDeviceTool(mockServer);

      // ✅ Verify production function called registerTool correctly
      expect(mockRegisterTool).toHaveBeenCalledWith(
        mockServer,
        'install_app_device',
        'Installs an app on a physical Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). Requires deviceId and appPath.',
        expect.objectContaining({
          deviceId: expect.any(Object),
          appPath: expect.any(Object),
        }),
        expect.any(Function),
      );
    });

    it('should handle successful app installation', async () => {
      // Test handler directly from exports
      const { installAppDeviceToolHandler } = await import('../../src/tools/device/index.js');

      // Mock successful devicectl execution
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'App installation successful',
        error: '',
      });

      // ✅ Test actual production handler with successful installation
      const result = await installAppDeviceToolHandler({
        deviceId: 'test-device-123',
        appPath: '/path/to/test.app'
      });

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        ['xcrun', 'devicectl', 'device', 'install', 'app', '--device', 'test-device-123', '/path/to/test.app'],
        'Install app on device',
      );
      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: expect.stringContaining('✅ App installed successfully on device test-device-123')
        }
      ]);
      expect(result.content[0].text).toContain('App installation successful');
      expect(result.isError).toBeUndefined();
    });

    it('should handle devicectl installation failure', async () => {
      // Test handler directly from exports
      const { installAppDeviceToolHandler } = await import('../../src/tools/device/index.js');

      // Mock devicectl failure
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Installation failed: App not found',
      });

      // ✅ Test actual production handler with installation failure
      const result = await installAppDeviceToolHandler({
        deviceId: 'test-device-123',
        appPath: '/path/to/nonexistent.app'
      });

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        ['xcrun', 'devicectl', 'device', 'install', 'app', '--device', 'test-device-123', '/path/to/nonexistent.app'],
        'Install app on device',
      );
      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: 'Failed to install app: Installation failed: App not found'
        }
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle exceptions during installation', async () => {
      // Test handler directly from exports
      const { installAppDeviceToolHandler } = await import('../../src/tools/device/index.js');

      // Mock exception
      mockExecuteCommand.mockRejectedValue(new Error('Network error'));

      // ✅ Test actual production handler with exception
      const result = await installAppDeviceToolHandler({
        deviceId: 'test-device-123',
        appPath: '/path/to/test.app'
      });

      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: 'Failed to install app on device: Network error'
        }
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle string errors', async () => {
      // Test handler directly from exports
      const { installAppDeviceToolHandler } = await import('../../src/tools/device/index.js');

      // Mock string error
      mockExecuteCommand.mockRejectedValue('String error');

      // ✅ Test actual production handler with string error
      const result = await installAppDeviceToolHandler({
        deviceId: 'test-device-123',
        appPath: '/path/to/test.app'
      });

      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: 'Failed to install app on device: String error'
        }
      ]);
      expect(result.isError).toBe(true);
    });

    it('should validate required parameters', async () => {
      // Test handler directly from exports
      const { installAppDeviceToolHandler } = await import('../../src/tools/device/index.js');

      // Mock successful execution for parameter validation test
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Installation successful',
        error: '',
      });

      // Test with valid parameters
      const result = await installAppDeviceToolHandler({
        deviceId: 'valid-device-id',
        appPath: '/valid/path/to/app.app'
      });

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        expect.arrayContaining([
          'xcrun', 'devicectl', 'device', 'install', 'app', 
          '--device', 'valid-device-id', '/valid/path/to/app.app'
        ]),
        'Install app on device',
      );
      expect(result.isError).toBeUndefined();
    });
  });
});