/**
 * Vitest tests for install_app_sim tool
 *
 * Tests the install_app_sim tool from simulator/index.ts
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

// Import the plugin
import installAppSim from './install_app_sim.js';

// Import production registration function for compatibility
import { registerInstallAppInSimulatorTool } from '../../src/tools/simulator/index.js';

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
}));

// ✅ CORRECT: Mock log capture utilities
vi.mock('../../src/utils/log_capture.js', () => ({
  startLogCapture: vi.fn(),
}));

describe('install_app_sim tool', () => {
  describe('plugin structure', () => {
    it('should export plugin with correct structure', () => {
      expect(installAppSim).toBeDefined();
      expect(installAppSim.name).toBe('install_app_sim');
      expect(installAppSim.description).toBe("Installs an app in an iOS simulator. IMPORTANT: You MUST provide both the simulatorUuid and appPath parameters. Example: install_app_sim({ simulatorUuid: 'YOUR_UUID_HERE', appPath: '/path/to/your/app.app' })");
      expect(installAppSim.schema).toBeDefined();
      expect(installAppSim.handler).toBeDefined();
      expect(typeof installAppSim.handler).toBe('function');
    });
  });

  let mockExecuteCommand: MockedFunction<any>;
  let mockValidateRequiredParam: MockedFunction<any>;
  let mockValidateFileExists: MockedFunction<any>;
  let mockExecSync: MockedFunction<any>;
  let mockServer: any;

  beforeEach(async () => {
    // Mock executeCommand
    const { executeCommand } = await import('../../src/utils/command.js');
    mockExecuteCommand = executeCommand as MockedFunction<any>;
    mockExecuteCommand.mockResolvedValue({
      success: true,
      output: 'App installed successfully',
      error: '',
    });

    // Mock validation utilities
    const validationModule = await import('../../src/utils/validation.js');
    mockValidateRequiredParam = validationModule.validateRequiredParam as MockedFunction<any>;
    mockValidateFileExists = validationModule.validateFileExists as MockedFunction<any>;

    // Mock child_process
    const { execSync } = await import('child_process');
    mockExecSync = execSync as MockedFunction<any>;
    mockExecSync.mockReturnValue('com.example.testapp');

    // Mock server object with tool method
    mockServer = {
      tool: vi.fn(),
    };

    // Default mock behaviors
    mockValidateRequiredParam.mockReturnValue({
      isValid: true,
      errorResponse: null,
    });

    mockValidateFileExists.mockReturnValue({
      isValid: true,
      errorResponse: null,
    });

    vi.clearAllMocks();
  });

  describe('registerInstallAppInSimulatorTool', () => {
    it('should register the install app in simulator tool correctly', () => {
      // ✅ Test actual production function
      registerInstallAppInSimulatorTool(mockServer);

      // ✅ Verify production function called server.tool correctly
      expect(mockServer.tool).toHaveBeenCalledWith(
        'install_app_sim',
        "Installs an app in an iOS simulator. IMPORTANT: You MUST provide both the simulatorUuid and appPath parameters. Example: install_app_sim({ simulatorUuid: 'YOUR_UUID_HERE', appPath: '/path/to/your/app.app' })",
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should handle successful app installation', async () => {
      registerInstallAppInSimulatorTool(mockServer);

      const handlerCall = mockServer.tool.mock.calls.find(
        (call) => call[0] === 'install_app_sim',
      );
      const handler = handlerCall[3];

      // Mock successful execution
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'App installed successfully',
        error: '',
      });

      // ✅ Test actual production handler with successful installation
      const result = await handler({ 
        simulatorUuid: 'test-uuid-123', 
        appPath: '/path/to/test.app' 
      });

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        ['xcrun', 'simctl', 'install', 'test-uuid-123', '/path/to/test.app'],
        'Install App in Simulator',
      );
      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: 'App installed successfully in simulator test-uuid-123'
        },
        {
          type: 'text',
          text: expect.stringContaining('Next Steps:')
        }
      ]);
      expect(result.isError).toBeUndefined();
    });

    it('should handle app installation failure', async () => {
      registerInstallAppInSimulatorTool(mockServer);

      const handlerCall = mockServer.tool.mock.calls.find(
        (call) => call[0] === 'install_app_sim',
      );
      const handler = handlerCall[3];

      // Mock failed execution
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Installation failed',
      });

      // ✅ Test actual production handler with installation failure
      const result = await handler({ 
        simulatorUuid: 'test-uuid-123', 
        appPath: '/path/to/test.app' 
      });

      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: 'Install app in simulator operation failed: Installation failed'
        }
      ]);
    });

    it('should handle validation failures for simulatorUuid', async () => {
      registerInstallAppInSimulatorTool(mockServer);

      const handlerCall = mockServer.tool.mock.calls.find(
        (call) => call[0] === 'install_app_sim',
      );
      const handler = handlerCall[3];

      // Mock validation failure for simulatorUuid
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'simulatorUuid is required' }],
          isError: true,
        },
      });

      // ✅ Test actual production handler with validation failure
      const result = await handler({ 
        simulatorUuid: '', 
        appPath: '/path/to/test.app' 
      });

      expect(result.content).toEqual([
        { type: 'text', text: 'simulatorUuid is required' }
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle validation failures for appPath', async () => {
      registerInstallAppInSimulatorTool(mockServer);

      const handlerCall = mockServer.tool.mock.calls.find(
        (call) => call[0] === 'install_app_sim',
      );
      const handler = handlerCall[3];

      // Mock validation success for simulatorUuid but failure for appPath
      mockValidateRequiredParam
        .mockReturnValueOnce({
          isValid: true,
          errorResponse: null,
        })
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [{ type: 'text', text: 'appPath is required' }],
            isError: true,
          },
        });

      // ✅ Test actual production handler with validation failure
      const result = await handler({ 
        simulatorUuid: 'test-uuid-123', 
        appPath: '' 
      });

      expect(result.content).toEqual([
        { type: 'text', text: 'appPath is required' }
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle file existence validation failures', async () => {
      registerInstallAppInSimulatorTool(mockServer);

      const handlerCall = mockServer.tool.mock.calls.find(
        (call) => call[0] === 'install_app_sim',
      );
      const handler = handlerCall[3];

      // Mock validation success for required params but failure for file existence
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockValidateFileExists.mockReturnValue({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'App file does not exist' }],
          isError: true,
        },
      });

      // ✅ Test actual production handler with file existence failure
      const result = await handler({ 
        simulatorUuid: 'test-uuid-123', 
        appPath: '/path/to/nonexistent.app' 
      });

      expect(result.content).toEqual([
        { type: 'text', text: 'App file does not exist' }
      ]);
      expect(result.isError).toBe(true);
    });
  });

});