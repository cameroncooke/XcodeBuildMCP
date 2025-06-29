/**
 * Vitest tests for boot_sim tool
 *
 * Tests the boot_sim tool from simulator/index.ts
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

// Import the plugin
import bootSim from './boot_sim.js';

// Import production registration function for compatibility
import { registerBootSimulatorTool } from '../../src/tools/simulator/index.js';

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

describe('boot_sim tool', () => {
  describe('plugin structure', () => {
    it('should export plugin with correct structure', () => {
      expect(bootSim).toBeDefined();
      expect(bootSim.name).toBe('boot_sim');
      expect(bootSim.description).toBe("Boots an iOS simulator. IMPORTANT: You MUST provide the simulatorUuid parameter. Example: boot_sim({ simulatorUuid: 'YOUR_UUID_HERE' })");
      expect(bootSim.schema).toBeDefined();
      expect(bootSim.handler).toBeDefined();
      expect(typeof bootSim.handler).toBe('function');
    });
  });

  let mockExecuteCommand: MockedFunction<any>;
  let mockValidateRequiredParam: MockedFunction<any>;
  let mockServer: any;

  beforeEach(async () => {
    // Mock executeCommand
    const { executeCommand } = await import('../../src/utils/command.js');
    mockExecuteCommand = executeCommand as MockedFunction<any>;
    mockExecuteCommand.mockResolvedValue({
      success: true,
      output: 'Simulator booted successfully',
      error: '',
    });

    // Mock validation utilities
    const validationModule = await import('../../src/utils/validation.js');
    mockValidateRequiredParam = validationModule.validateRequiredParam as MockedFunction<any>;

    // Mock server object with tool method
    mockServer = {
      tool: vi.fn(),
    };

    // Default mock behaviors
    mockValidateRequiredParam.mockReturnValue({
      isValid: true,
      errorResponse: null,
    });

    vi.clearAllMocks();
  });

  describe('registerBootSimulatorTool', () => {
    it('should register the boot simulator tool correctly', () => {
      // ✅ Test actual production function
      registerBootSimulatorTool(mockServer);

      // ✅ Verify production function called server.tool correctly
      expect(mockServer.tool).toHaveBeenCalledWith(
        'boot_sim',
        "Boots an iOS simulator. IMPORTANT: You MUST provide the simulatorUuid parameter. Example: boot_sim({ simulatorUuid: 'YOUR_UUID_HERE' })",
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should handle successful boot', async () => {
      registerBootSimulatorTool(mockServer);

      const handlerCall = mockServer.tool.mock.calls.find(
        (call) => call[0] === 'boot_sim',
      );
      const handler = handlerCall[3];

      // Mock successful execution
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Simulator booted successfully',
        error: '',
      });

      // ✅ Test actual production handler with successful boot
      const result = await handler({ simulatorUuid: 'test-uuid-123' });

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        ['xcrun', 'simctl', 'boot', 'test-uuid-123'],
        'Boot Simulator',
      );
      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: expect.stringContaining('Simulator booted successfully. Next steps:')
        }
      ]);
      expect(result.isError).toBeUndefined();
    });

    it('should handle boot failure', async () => {
      registerBootSimulatorTool(mockServer);

      const handlerCall = mockServer.tool.mock.calls.find(
        (call) => call[0] === 'boot_sim',
      );
      const handler = handlerCall[3];

      // Mock failed execution
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Simulator not found',
      });

      // ✅ Test actual production handler with boot failure
      const result = await handler({ simulatorUuid: 'invalid-uuid' });

      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: 'Boot simulator operation failed: Simulator not found'
        }
      ]);
    });
  });

});