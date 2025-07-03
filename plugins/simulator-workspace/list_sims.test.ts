/**
 * Vitest tests for list_sims tool
 *
 * Tests the list_sims tool from simulator/index.ts
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

// Import the plugin
import listSims from './list_sims.js';


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

describe('list_sims tool', () => {
  describe('plugin structure', () => {
    it('should export plugin with correct structure', () => {
      expect(listSims).toBeDefined();
      expect(listSims.name).toBe('list_sims');
      expect(listSims.description).toBe('Lists available iOS simulators with their UUIDs. ');
      expect(listSims.schema).toBeDefined();
      expect(listSims.handler).toBeDefined();
      expect(typeof listSims.handler).toBe('function');
    });
  });

  let mockExecuteCommand: MockedFunction<any>;

  beforeEach(async () => {
    // Mock executeCommand
    const { executeCommand } = await import('../../src/utils/command.js');
    mockExecuteCommand = executeCommand as MockedFunction<any>;
    mockExecuteCommand.mockResolvedValue({
      success: true,
      output: JSON.stringify({
        devices: {
          'iOS 17.0': [
            {
              name: 'iPhone 15',
              udid: 'test-uuid-123',
              isAvailable: true,
              state: 'Shutdown'
            }
          ]
        }
      }),
      error: '',
    });

    vi.clearAllMocks();
  });

  describe('plugin handler', () => {
    it('should handle successful simulator listing', async () => {
      // Mock successful execution with simulator data
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: JSON.stringify({
          devices: {
            'iOS 17.0': [
              {
                name: 'iPhone 15',
                udid: 'test-uuid-123',
                isAvailable: true,
                state: 'Shutdown'
              }
            ]
          }
        }),
        error: '',
      });

      // ✅ Test actual production handler with successful listing
      const result = await listSims.handler();

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        ['xcrun', 'simctl', 'list', 'devices', 'available', '--json'],
        'List Simulators',
      );
      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: expect.stringContaining('Available iOS Simulators:')
        }
      ]);
      expect(result.content[0].text).toContain('iPhone 15 (test-uuid-123)');
      expect(result.isError).toBeUndefined();
    });

    it('should handle list failure', async () => {
      // Mock failed execution
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Command failed',
      });

      // ✅ Test actual production handler with list failure
      const result = await listSims.handler();

      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: 'Failed to list simulators: Command failed'
        }
      ]);
    });
  });

});