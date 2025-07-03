/**
 * Vitest tests for swift_package_stop tool
 *
 * Tests the swift_package_stop tool from run-swift-package.ts
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { spawn, ChildProcess } from 'child_process';

// Import the plugin
import swiftPackageStop from './swift_package_stop.js';

// Test the plugin directly - no registration function needed

// ✅ CORRECT: Mock external dependencies only
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

// Mock fs/promises for clean operations
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
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
  createTextResponse: vi.fn(),
  validateRequiredParam: vi.fn(),
}));

// ✅ CORRECT: Mock error utilities
vi.mock('../../src/utils/errors.js', () => ({
  createErrorResponse: vi.fn(),
}));

// ✅ CORRECT: Mock common tools utilities
// Mock removed - no longer needed for plugin testing

describe('swift_package_stop tool', () => {
  describe('plugin structure', () => {
    it('should export plugin with correct structure', () => {
      expect(swiftPackageStop).toBeDefined();
      expect(swiftPackageStop.name).toBe('swift_package_stop');
      expect(swiftPackageStop.description).toBe('Stops a running Swift Package executable started with swift_package_run');
      expect(swiftPackageStop.schema).toBeDefined();
      expect(swiftPackageStop.handler).toBeDefined();
      expect(typeof swiftPackageStop.handler).toBe('function');
    });
  });
  let mockSpawn: MockedFunction<any>;
  let mockChildProcess: Partial<ChildProcess>;
  let mockExecuteCommand: MockedFunction<any>;
  let mockCreateTextResponse: MockedFunction<any>;
  let mockValidateRequiredParam: MockedFunction<any>;
  let mockCreateErrorResponse: MockedFunction<any>;
  let mockServer: any;

  beforeEach(async () => {
    // Get the mocked function from node:child_process since that's what the tools import
    const { spawn: nodeSpawn } = await import('node:child_process');
    mockSpawn = nodeSpawn as MockedFunction<any>;

    // Mock executeCommand
    const { executeCommand } = await import('../../src/utils/command.js');
    mockExecuteCommand = executeCommand as MockedFunction<any>;
    mockExecuteCommand.mockResolvedValue({
      success: true,
      output: 'Build complete! (2.34s)',
      error: '',
    });

    // Mock validation utilities
    const validationModule = await import('../../src/utils/validation.js');
    mockCreateTextResponse = validationModule.createTextResponse as MockedFunction<any>;
    mockValidateRequiredParam = validationModule.validateRequiredParam as MockedFunction<any>;

    // Mock error utilities
    const errorModule = await import('../../src/utils/errors.js');
    mockCreateErrorResponse = errorModule.createErrorResponse as MockedFunction<any>;


    // Create mock child process with typical Swift build output
    mockChildProcess = {
      pid: 12345,
      stdout: {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback(`Building for debugging...
[1/3] Compiling MyLibrary MyLibrary.swift
[2/3] Compiling MyExecutable main.swift
[3/3] Linking MyExecutable
Build complete! (2.34s)`);
          }
        }),
      } as any,
      stderr: {
        on: vi.fn(),
      } as any,
      on: vi.fn((event, callback) => {
        if (event === 'exit') {
          callback(0); // Successful exit code
        }
      }),
      kill: vi.fn(),
    };

    // Mock server object
    mockServer = {
      addTool: vi.fn(),
    };

    // Default mock behaviors
    mockSpawn.mockReturnValue(mockChildProcess as ChildProcess);

    mockValidateRequiredParam.mockReturnValue({
      isValid: true,
      errorResponse: null,
    });

    mockCreateTextResponse.mockImplementation((text: string, isError?: boolean) => ({
      content: [{ type: 'text', text }],
      isError: isError || false,
    }));

    mockCreateErrorResponse.mockImplementation((message: string, details: string) => ({
      content: [{ type: 'text', text: `${message}: ${details}` }],
      isError: true,
    }));

    vi.clearAllMocks();
  });

  describe('plugin handler', () => {
    it('should register the swift package stop tool correctly', () => {
      // ✅ Test actual production function
      
      // ✅ Test plugin has correct structure for registration
      expect(swiftPackageStop.name).toBe('swift_package_stop');
      expect(swiftPackageStop.description).toBeDefined();
      expect(swiftPackageStop.schema).toBeDefined();
      expect(typeof swiftPackageStop.handler).toBe('function');
    });

    it('should handle missing process', async () => {
      
      // Test plugin handler directly

      // Mock createTextResponse to return expected format
      mockCreateTextResponse.mockReturnValue({
        content: [{ type: 'text', text: '⚠️ No running process found with PID 999. Use swift_package_run to check active processes.' }],
        isError: true,
      });

      // ✅ Test actual production handler with missing process
      const result = await swiftPackageStop.handler({ pid: 999 });

      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        '⚠️ No running process found with PID 999. Use swift_package_run to check active processes.',
        true,
      );
      expect(result.content).toEqual([
        { type: 'text', text: '⚠️ No running process found with PID 999. Use swift_package_run to check active processes.' }
      ]);
      expect(result.isError).toBe(true);
    });
  });

});