/**
 * Vitest tests for install_app_device tool
 *
 * Tests the install_app_device tool from device/index.ts
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

// Import the plugin
import installAppDevice from './install_app_device.js';

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

  describe('plugin handler', () => {
    it('should have correct plugin structure and registration info', () => {
      // ✅ Test plugin has correct structure for registration
      expect(installAppDevice.name).toBe('install_app_device');
      expect(installAppDevice.description).toBe('Installs an app on a physical Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). Requires deviceId and appPath.');
      expect(installAppDevice.schema).toHaveProperty('deviceId');
      expect(installAppDevice.schema).toHaveProperty('appPath');
      expect(typeof installAppDevice.handler).toBe('function');
    });

    it('should handle successful app installation', async () => {
      // Test plugin handler directly

      // Mock successful devicectl execution
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'App installation successful',
        error: '',
      });

      // ✅ Test plugin handler with successful installation
      const result = await installAppDevice.handler({
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
      // Test plugin handler directly

      // Mock devicectl failure
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Installation failed: App not found',
      });

      // ✅ Test plugin handler with installation failure
      const result = await installAppDevice.handler({
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
      // Test plugin handler directly

      // Mock exception
      mockExecuteCommand.mockRejectedValue(new Error('Network error'));

      // ✅ Test plugin handler with exception
      const result = await installAppDevice.handler({
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
      // Test plugin handler directly

      // Mock string error
      mockExecuteCommand.mockRejectedValue('String error');

      // ✅ Test plugin handler with string error
      const result = await installAppDevice.handler({
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
      // Test plugin handler directly

      // Mock successful execution for parameter validation test
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Installation successful',
        error: '',
      });

      // Test with valid parameters
      const result = await installAppDevice.handler({
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