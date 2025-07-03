/**
 * Vitest tests for launch_app_sim tool
 *
 * Tests the launch_app_sim tool from simulator/index.ts
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

// Import the plugin
import launchAppSim from './launch_app_sim.js';


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

describe('launch_app_sim tool', () => {
  describe('plugin structure', () => {
    it('should export plugin with correct structure', () => {
      expect(launchAppSim).toBeDefined();
      expect(launchAppSim.name).toBe('launch_app_sim');
      expect(launchAppSim.description).toBe("Launches an app in an iOS simulator. IMPORTANT: You MUST provide both the simulatorUuid and bundleId parameters.\n\nNote: You must install the app in the simulator before launching. The typical workflow is: build → install → launch. Example: launch_app_sim({ simulatorUuid: 'YOUR_UUID_HERE', bundleId: 'com.example.MyApp' })");
      expect(launchAppSim.schema).toBeDefined();
      expect(launchAppSim.handler).toBeDefined();
      expect(typeof launchAppSim.handler).toBe('function');
    });
  });

  let mockExecuteCommand: MockedFunction<any>;
  let mockValidateRequiredParam: MockedFunction<any>;

  beforeEach(async () => {
    // Mock executeCommand
    const { executeCommand } = await import('../../src/utils/command.js');
    mockExecuteCommand = executeCommand as MockedFunction<any>;
    mockExecuteCommand.mockResolvedValue({
      success: true,
      output: 'App launched successfully',
      error: '',
    });

    // Mock validation utilities
    const validationModule = await import('../../src/utils/validation.js');
    mockValidateRequiredParam = validationModule.validateRequiredParam as MockedFunction<any>;

    // Default mock behaviors
    mockValidateRequiredParam.mockReturnValue({
      isValid: true,
      errorResponse: null,
    });

    vi.clearAllMocks();
  });

  describe('plugin handler', () => {
    it('should handle successful app launch', async () => {
      // Mock successful execution for app container check
      mockExecuteCommand
        .mockResolvedValueOnce({
          success: true,
          output: '/path/to/app/container',
          error: '',
        })
        .mockResolvedValueOnce({
          success: true,
          output: 'App launched successfully',
          error: '',
        });

      // ✅ Test actual production handler with successful launch
      const result = await launchAppSim.handler({ 
        simulatorUuid: 'test-uuid-123', 
        bundleId: 'com.example.testapp' 
      });

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        ['xcrun', 'simctl', 'get_app_container', 'test-uuid-123', 'com.example.testapp', 'app'],
        'Check App Installed',
      );
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        ['xcrun', 'simctl', 'launch', 'test-uuid-123', 'com.example.testapp'],
        'Launch App in Simulator',
      );
      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: 'App launched successfully in simulator test-uuid-123'
        },
        {
          type: 'text',
          text: expect.stringContaining('Next Steps:')
        }
      ]);
      expect(result.isError).toBeUndefined();
    });

    it('should handle app launch with additional arguments', async () => {
      // Mock successful execution for app container check and launch
      mockExecuteCommand
        .mockResolvedValueOnce({
          success: true,
          output: '/path/to/app/container',
          error: '',
        })
        .mockResolvedValueOnce({
          success: true,
          output: 'App launched successfully',
          error: '',
        });

      // ✅ Test actual production handler with additional arguments
      const result = await launchAppSim.handler({ 
        simulatorUuid: 'test-uuid-123', 
        bundleId: 'com.example.testapp',
        args: ['--debug', '--verbose']
      });

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        ['xcrun', 'simctl', 'launch', 'test-uuid-123', 'com.example.testapp', '--debug', '--verbose'],
        'Launch App in Simulator',
      );
      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: 'App launched successfully in simulator test-uuid-123'
        },
        {
          type: 'text',
          text: expect.stringContaining('Next Steps:')
        }
      ]);
    });

    it('should handle app not installed error', async () => {
      // Mock failed execution for app container check
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'App not found',
      });

      // ✅ Test actual production handler with app not installed
      const result = await launchAppSim.handler({ 
        simulatorUuid: 'test-uuid-123', 
        bundleId: 'com.example.testapp' 
      });

      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: 'App is not installed on the simulator. Please use install_app_in_simulator before launching.\n\nWorkflow: build → install → launch.'
        }
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle app launch failure', async () => {
      // Mock successful execution for app container check but failure for launch
      mockExecuteCommand
        .mockResolvedValueOnce({
          success: true,
          output: '/path/to/app/container',
          error: '',
        })
        .mockResolvedValueOnce({
          success: false,
          output: '',
          error: 'Launch failed',
        });

      // ✅ Test actual production handler with launch failure
      const result = await launchAppSim.handler({ 
        simulatorUuid: 'test-uuid-123', 
        bundleId: 'com.example.testapp' 
      });

      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: 'Launch app in simulator operation failed: Launch failed'
        }
      ]);
    });

    it('should handle validation failures for simulatorUuid', async () => {
      // Mock validation failure for simulatorUuid
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'simulatorUuid is required' }],
          isError: true,
        },
      });

      // ✅ Test actual production handler with validation failure
      const result = await launchAppSim.handler({ 
        simulatorUuid: '', 
        bundleId: 'com.example.testapp' 
      });

      expect(result.content).toEqual([
        { type: 'text', text: 'simulatorUuid is required' }
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle validation failures for bundleId', async () => {
      // Mock validation success for simulatorUuid but failure for bundleId
      mockValidateRequiredParam
        .mockReturnValueOnce({
          isValid: true,
          errorResponse: null,
        })
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [{ type: 'text', text: 'bundleId is required' }],
            isError: true,
          },
        });

      // ✅ Test actual production handler with validation failure
      const result = await launchAppSim.handler({ 
        simulatorUuid: 'test-uuid-123', 
        bundleId: '' 
      });

      expect(result.content).toEqual([
        { type: 'text', text: 'bundleId is required' }
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle exception during app container check', async () => {
      // Mock execution that throws an exception
      mockExecuteCommand.mockRejectedValue(new Error('Network error'));

      // ✅ Test actual production handler with exception during check
      const result = await launchAppSim.handler({ 
        simulatorUuid: 'test-uuid-123', 
        bundleId: 'com.example.testapp' 
      });

      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: 'App is not installed on the simulator (check failed). Please use install_app_in_simulator before launching.\n\nWorkflow: build → install → launch.'
        }
      ]);
      expect(result.isError).toBe(true);
    });
  });

});