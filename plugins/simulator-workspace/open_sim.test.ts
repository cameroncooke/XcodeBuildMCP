/**
 * Vitest tests for open_sim tool
 *
 * Tests the open_sim tool from simulator/index.ts
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

// Import the plugin
import openSim from './open_sim.js';


// ✅ CORRECT: Mock executeCommand utility
vi.mock('../../src/utils/command.js', () => ({
  executeCommand: vi.fn(),
}));

// ✅ CORRECT: Mock logger to prevent real logging
vi.mock('../../src/utils/logger.js', () => ({
  log: vi.fn(),
}));

describe('open_sim tool', () => {
  describe('plugin structure', () => {
    it('should export plugin with correct structure', () => {
      expect(openSim).toBeDefined();
      expect(openSim.name).toBe('open_sim');
      expect(openSim.description).toBe('Opens the iOS Simulator app.');
      expect(openSim.schema).toBeDefined();
      expect(openSim.handler).toBeDefined();
      expect(typeof openSim.handler).toBe('function');
    });
  });

  let mockExecuteCommand: MockedFunction<any>;
  let mockLog: MockedFunction<any>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get fresh mock instances
    const { executeCommand } = await vi.importMock('../../src/utils/command.js');
    const { log } = await vi.importMock('../../src/utils/logger.js');
    
    mockExecuteCommand = executeCommand as MockedFunction<any>;
    mockLog = log as MockedFunction<any>;
  });

  describe('successful operation', () => {
    it('should successfully open simulator', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
      });

      const result = await openSim.handler();

      expect(mockLog).toHaveBeenCalledWith('info', 'Starting open simulator request');
      expect(mockExecuteCommand).toHaveBeenCalledWith(['open', '-a', 'Simulator'], 'Open Simulator');
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Simulator app opened successfully',
          },
          {
            type: 'text',
            text: expect.stringContaining('Next Steps:'),
          },
        ],
      });
    });

    it('should include comprehensive next steps in success response', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
      });

      const result = await openSim.handler();

      const nextStepsText = result.content[1].text;
      expect(nextStepsText).toContain('Next Steps:');
      expect(nextStepsText).toContain('boot_sim');
      expect(nextStepsText).toContain('start_sim_log_cap');
      expect(nextStepsText).toContain('launch_app_logs_sim');
      expect(nextStepsText).toContain('captureConsole: true');
    });
  });

  describe('error handling', () => {
    it('should handle executeCommand failure', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Command failed',
        stdout: '',
        stderr: '',
      });

      const result = await openSim.handler();

      expect(mockLog).toHaveBeenCalledWith('info', 'Starting open simulator request');
      expect(mockExecuteCommand).toHaveBeenCalledWith(['open', '-a', 'Simulator'], 'Open Simulator');
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Open simulator operation failed: Command failed',
          },
        ],
      });
    });

    it('should handle thrown errors', async () => {
      const testError = new Error('Test error');
      mockExecuteCommand.mockRejectedValue(testError);

      const result = await openSim.handler();

      expect(mockLog).toHaveBeenCalledWith('info', 'Starting open simulator request');
      expect(mockLog).toHaveBeenCalledWith('error', 'Error during open simulator operation: Test error');
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Open simulator operation failed: Test error',
          },
        ],
      });
    });

    it('should handle non-Error thrown objects', async () => {
      mockExecuteCommand.mockRejectedValue('String error');

      const result = await openSim.handler();

      expect(mockLog).toHaveBeenCalledWith('info', 'Starting open simulator request');
      expect(mockLog).toHaveBeenCalledWith('error', 'Error during open simulator operation: String error');
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Open simulator operation failed: String error',
          },
        ],
      });
    });
  });

});