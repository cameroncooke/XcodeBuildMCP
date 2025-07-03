/**
 * Vitest tests for swift_package_run tool
 *
 * Tests the swift_package_run tool from run-swift-package.ts
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { spawn, ChildProcess } from 'child_process';

// Import the plugin
import swiftPackageRun from './swift_package_run.js';

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

// Mock removed - no longer needed for plugin testing

describe('swift_package_run tool', () => {
  describe('plugin structure', () => {
    it('should export plugin with correct structure', () => {
      expect(swiftPackageRun).toBeDefined();
      expect(swiftPackageRun.name).toBe('swift_package_run');
      expect(swiftPackageRun.description).toBe('Runs an executable target from a Swift Package with swift run');
      expect(swiftPackageRun.schema).toBeDefined();
      expect(swiftPackageRun.handler).toBeDefined();
      expect(typeof swiftPackageRun.handler).toBe('function');
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
    it('should have correct plugin structure and registration info', () => {
      // ✅ Test plugin has correct structure for registration
      expect(swiftPackageRun.name).toBe('swift_package_run');
      expect(swiftPackageRun.description).toBe('Runs an executable target from a Swift Package with swift run');
      expect(swiftPackageRun.schema).toBeDefined();
      expect(typeof swiftPackageRun.handler).toBe('function');
    });

    it('should handle successful package run in foreground', async () => {
      // Test plugin handler directly

      const params = { packagePath: '/path/to/package' };

      // Setup child process to exit immediately
      mockChildProcess.on = vi.fn((event, callback) => {
        if (event === 'exit') {
          setTimeout(() => callback(0), 10); // Exit successfully after short delay
        }
      });

      // ✅ Test plugin handler
      const result = await swiftPackageRun.handler(params);

      expect(mockValidateRequiredParam).toHaveBeenCalledWith('packagePath', params.packagePath);
      expect(mockSpawn).toHaveBeenCalledWith(
        'swift',
        expect.arrayContaining(['run', '--package-path']),
        expect.any(Object),
      );
      expect(result.content).toEqual(
        expect.arrayContaining([
          { type: 'text', text: '✅ Swift executable completed successfully.' },
        ]),
      );
      expect(result.isError).toBeUndefined();
    });

    it('should handle successful package run in background', async () => {
      // Test plugin handler directly

      const params = { packagePath: '/path/to/package', background: true };

      // ✅ Test plugin handler with background mode
      const result = await swiftPackageRun.handler(params);

      expect(result.content).toEqual(
        expect.arrayContaining([
          {
            type: 'text',
            text: expect.stringContaining('🚀 Started executable in background (PID: 12345)'),
          },
        ]),
      );
      expect(result.isError).toBeUndefined();
    });

    it('should handle validation errors', async () => {
      // Test plugin handler directly

      // Mock validation failure
      mockValidateRequiredParam.mockReturnValue({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: "Required parameter 'packagePath' is missing." }],
          isError: true,
        },
      });

      const params = { packagePath: '' };

      // ✅ Test plugin error handling
      const result = await swiftPackageRun.handler(params);

      expect(result.content).toEqual([
        { type: 'text', text: "Required parameter 'packagePath' is missing." },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle spawn errors', async () => {
      // Test plugin handler directly

      // Mock spawn failure
      mockSpawn.mockImplementation(() => {
        throw new Error('spawn failed');
      });

      const params = { packagePath: '/path/to/package' };

      // ✅ Test plugin error handling
      const result = await swiftPackageRun.handler(params);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        'Failed to execute swift run',
        'spawn failed',
        'SystemError',
      );
    });

    it('should handle executable name parameter', async () => {
      // Test plugin handler directly

      const params = {
        packagePath: '/path/to/package',
        executableName: 'MyCustomApp',
      };

      // Setup child process to exit immediately
      mockChildProcess.on = vi.fn((event, callback) => {
        if (event === 'exit') {
          setTimeout(() => callback(0), 10);
        }
      });

      // ✅ Test plugin function with executable name
      await swiftPackageRun.handler(params);

      expect(mockSpawn).toHaveBeenCalledWith(
        'swift',
        expect.arrayContaining(['run', '--package-path', '/path/to/package', 'MyCustomApp']),
        expect.any(Object),
      );
    });

    it('should handle arguments parameter', async () => {
      // Test plugin handler directly

      const params = {
        packagePath: '/path/to/package',
        arguments: ['arg1', 'arg2', '--flag'],
      };

      // Setup child process to exit immediately
      mockChildProcess.on = vi.fn((event, callback) => {
        if (event === 'exit') {
          setTimeout(() => callback(0), 10);
        }
      });

      // ✅ Test plugin function with arguments
      await swiftPackageRun.handler(params);

      expect(mockSpawn).toHaveBeenCalledWith(
        'swift',
        expect.arrayContaining([
          'run',
          '--package-path',
          '/path/to/package',
          '--',
          'arg1',
          'arg2',
          '--flag',
        ]),
        expect.any(Object),
      );
    });

    it('should handle configuration parameter', async () => {
      // Test plugin handler directly

      const params = {
        packagePath: '/path/to/package',
        configuration: 'release' as const,
      };

      // Setup child process to exit immediately
      mockChildProcess.on = vi.fn((event, callback) => {
        if (event === 'exit') {
          setTimeout(() => callback(0), 10);
        }
      });

      // ✅ Test plugin function with release configuration
      await swiftPackageRun.handler(params);

      expect(mockSpawn).toHaveBeenCalledWith(
        'swift',
        expect.arrayContaining(['run', '--package-path', '/path/to/package', '-c', 'release']),
        expect.any(Object),
      );
    });
  });
});
