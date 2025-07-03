/**
 * Vitest tests for boot_sim tool
 *
 * Tests the boot_sim tool from simulator/index.ts
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

// Import the plugin
import bootSim from './boot_sim.ts';

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

// ✅ CORRECT: Mock common tools utilities
vi.mock('../../src/tools/common/index.ts', () => ({
  createTextContent: vi.fn(),
}));

// ✅ CORRECT: Mock log capture utilities
vi.mock('../../src/utils/log_capture.ts', () => ({
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
    const { executeCommand } = await import('../../src/utils/command.ts');
    mockExecuteCommand = executeCommand as MockedFunction<any>;
    mockExecuteCommand.mockResolvedValue({
      success: true,
      output: 'Simulator booted successfully',
      error: '',
    });

    // Mock validation utilities
    const validationModule = await import('../../src/utils/validation.ts');
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

  describe('plugin handler', () => {
    it('should have correct description', () => {
      expect(bootSim.description).toBe("Boots an iOS simulator. IMPORTANT: You MUST provide the simulatorUuid parameter. Example: boot_sim({ simulatorUuid: 'YOUR_UUID_HERE' })");
    });

    it('should handle successful boot', async () => {
      // Mock successful execution
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Simulator booted successfully',
        error: '',
      });

      // Test plugin handler with successful boot
      const result = await bootSim.handler({ simulatorUuid: 'test-uuid-123' });

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
      // Mock failed execution
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Simulator not found',
      });

      // Test plugin handler with boot failure
      const result = await bootSim.handler({ simulatorUuid: 'invalid-uuid' });

      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: 'Boot simulator operation failed: Simulator not found'
        }
      ]);
    });
  });

});