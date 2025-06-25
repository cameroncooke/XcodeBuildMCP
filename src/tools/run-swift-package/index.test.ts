/**
 * Vitest tests for Run Swift Package Manager tools
 *
 * Tests the 4 run-swift-package.ts tools:
 * - registerRunSwiftPackageTool, registerStopSwiftPackageTool,
 * - registerListSwiftPackageTool, registerCleanSwiftPackageTool
 *
 * Follows CLAUDE.md testing principles by importing actual production functions
 * and mocking external dependencies only.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { spawn, ChildProcess } from 'child_process';

// ✅ CORRECT: Import actual production functions
import {
  registerRunSwiftPackageTool,
  registerStopSwiftPackageTool,
  registerListSwiftPackageTool,
  registerCleanSwiftPackageTool,
} from './index.js';

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
vi.mock('../../utils/command.js', () => ({
  executeCommand: vi.fn(),
}));

// ✅ CORRECT: Mock logger to prevent real logging
vi.mock('../../utils/logger.js', () => ({
  log: vi.fn(),
}));

// ✅ CORRECT: Mock validation utilities
vi.mock('../../utils/validation.js', () => ({
  createTextResponse: vi.fn(),
  validateRequiredParam: vi.fn(),
}));

// ✅ CORRECT: Mock error utilities
vi.mock('../../utils/errors.js', () => ({
  createErrorResponse: vi.fn(),
}));

// ✅ CORRECT: Mock common tools utilities
vi.mock('../common/index.js', () => ({
  registerTool: vi.fn(),
  swiftConfigurationSchema: {
    optional: () => ({ describe: () => ({}) }),
  },
  parseAsLibrarySchema: {
    optional: () => ({ describe: () => ({}) }),
  },
}));

describe('Run Swift Package Manager tools (Canonical)', () => {
  let mockSpawn: MockedFunction<any>;
  let mockChildProcess: Partial<ChildProcess>;
  let mockExecuteCommand: MockedFunction<any>;
  let mockCreateTextResponse: MockedFunction<any>;
  let mockValidateRequiredParam: MockedFunction<any>;
  let mockCreateErrorResponse: MockedFunction<any>;
  let mockRegisterTool: MockedFunction<any>;
  let mockServer: any;

  beforeEach(async () => {
    // Get the mocked function from node:child_process since that's what the tools import
    const { spawn: nodeSpawn } = await import('node:child_process');
    mockSpawn = nodeSpawn as MockedFunction<any>;

    // Mock executeCommand
    const { executeCommand } = await import('../../utils/command.js');
    mockExecuteCommand = executeCommand as MockedFunction<any>;
    mockExecuteCommand.mockResolvedValue({
      success: true,
      output: 'Build complete! (2.34s)',
      error: '',
    });

    // Mock validation utilities
    const validationModule = await import('../../utils/validation.js');
    mockCreateTextResponse = validationModule.createTextResponse as MockedFunction<any>;
    mockValidateRequiredParam = validationModule.validateRequiredParam as MockedFunction<any>;

    // Mock error utilities
    const errorModule = await import('../../utils/errors.js');
    mockCreateErrorResponse = errorModule.createErrorResponse as MockedFunction<any>;

    // Mock common tools
    const commonModule = await import('../common/index.js');
    mockRegisterTool = commonModule.registerTool as MockedFunction<any>;

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

  describe('registerRunSwiftPackageTool', () => {
    it('should register the swift package run tool correctly', () => {
      // ✅ Test actual production function
      registerRunSwiftPackageTool(mockServer);

      // ✅ Verify production function called registerTool correctly
      expect(mockRegisterTool).toHaveBeenCalledWith(
        mockServer,
        'swift_package_run',
        'Runs an executable target from a Swift Package with swift run',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should handle successful package run in foreground', async () => {
      registerRunSwiftPackageTool(mockServer);

      // Get the handler function from the registerTool call
      const handlerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'swift_package_run',
      );
      const handler = handlerCall[4];

      const params = { packagePath: '/path/to/package' };

      // Setup child process to exit immediately
      mockChildProcess.on = vi.fn((event, callback) => {
        if (event === 'exit') {
          setTimeout(() => callback(0), 10); // Exit successfully after short delay
        }
      });

      // ✅ Test actual production handler
      const result = await handler(params);

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
      registerRunSwiftPackageTool(mockServer);

      const handlerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'swift_package_run',
      );
      const handler = handlerCall[4];

      const params = { packagePath: '/path/to/package', background: true };

      // ✅ Test actual production handler with background mode
      const result = await handler(params);

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
      registerRunSwiftPackageTool(mockServer);

      const handlerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'swift_package_run',
      );
      const handler = handlerCall[4];

      // Mock validation failure
      mockValidateRequiredParam.mockReturnValue({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: "Required parameter 'packagePath' is missing." }],
          isError: true,
        },
      });

      const params = { packagePath: '' };

      // ✅ Test actual production error handling
      const result = await handler(params);

      expect(result.content).toEqual([
        { type: 'text', text: "Required parameter 'packagePath' is missing." },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle spawn errors', async () => {
      registerRunSwiftPackageTool(mockServer);

      const handlerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'swift_package_run',
      );
      const handler = handlerCall[4];

      // Mock spawn failure
      mockSpawn.mockImplementation(() => {
        throw new Error('spawn failed');
      });

      const params = { packagePath: '/path/to/package' };

      // ✅ Test actual production error handling
      const result = await handler(params);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        'Failed to execute swift run',
        'spawn failed',
        'SystemError',
      );
    });

    it('should handle executable name parameter', async () => {
      registerRunSwiftPackageTool(mockServer);

      const handlerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'swift_package_run',
      );
      const handler = handlerCall[4];

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

      // ✅ Test actual production function with executable name
      await handler(params);

      expect(mockSpawn).toHaveBeenCalledWith(
        'swift',
        expect.arrayContaining(['run', '--package-path', '/path/to/package', 'MyCustomApp']),
        expect.any(Object),
      );
    });

    it('should handle arguments parameter', async () => {
      registerRunSwiftPackageTool(mockServer);

      const handlerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'swift_package_run',
      );
      const handler = handlerCall[4];

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

      // ✅ Test actual production function with arguments
      await handler(params);

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
      registerRunSwiftPackageTool(mockServer);

      const handlerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'swift_package_run',
      );
      const handler = handlerCall[4];

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

      // ✅ Test actual production function with release configuration
      await handler(params);

      expect(mockSpawn).toHaveBeenCalledWith(
        'swift',
        expect.arrayContaining(['run', '--package-path', '/path/to/package', '-c', 'release']),
        expect.any(Object),
      );
    });
  });

  describe('registerStopSwiftPackageTool', () => {
    it('should register the swift package stop tool correctly', () => {
      // ✅ Test actual production function
      registerStopSwiftPackageTool(mockServer);

      // ✅ Verify production function called registerTool correctly
      expect(mockRegisterTool).toHaveBeenCalledWith(
        mockServer,
        'swift_package_stop',
        'Stops a running Swift Package executable started with swift_package_run',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should handle process not found', async () => {
      registerStopSwiftPackageTool(mockServer);

      const handlerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'swift_package_stop',
      );
      const handler = handlerCall[4];

      const params = { pid: 12345 };

      // ✅ Test actual production handler when process not found
      const result = await handler(params);

      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        expect.stringContaining('No running process found with PID 12345'),
        true,
      );
    });
  });

  describe('registerListSwiftPackageTool', () => {
    it('should register the swift package list tool correctly', () => {
      // ✅ Test actual production function
      registerListSwiftPackageTool(mockServer);

      // ✅ Verify production function called registerTool correctly
      expect(mockRegisterTool).toHaveBeenCalledWith(
        mockServer,
        'swift_package_list',
        'Lists currently running Swift Package processes',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should handle empty process list', async () => {
      registerListSwiftPackageTool(mockServer);

      const handlerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'swift_package_list',
      );
      const handler = handlerCall[4];

      // ✅ Test actual production handler with no processes
      const result = await handler({});

      expect(result.content).toEqual(
        expect.arrayContaining([
          { type: 'text', text: 'ℹ️ No Swift Package processes currently running.' },
          { type: 'text', text: '💡 Use swift_package_run to start an executable.' },
        ]),
      );
      expect(result.isError).toBeUndefined();
    });
  });

  describe('registerCleanSwiftPackageTool', () => {
    it('should register the swift package clean tool correctly', () => {
      // ✅ Test actual production function
      registerCleanSwiftPackageTool(mockServer);

      // ✅ Verify production function called registerTool correctly
      expect(mockRegisterTool).toHaveBeenCalledWith(
        mockServer,
        'swift_package_clean',
        'Cleans Swift Package build artifacts and derived data',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should handle successful clean', async () => {
      registerCleanSwiftPackageTool(mockServer);

      const handlerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'swift_package_clean',
      );
      const handler = handlerCall[4];

      const params = { packagePath: '/path/to/package' };

      // ✅ Test actual production handler
      const result = await handler(params);

      expect(mockValidateRequiredParam).toHaveBeenCalledWith('packagePath', params.packagePath);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        expect.arrayContaining(['swift', 'package', '--package-path', '/path/to/package', 'clean']),
        'Swift Package Clean',
      );
      expect(result.content).toEqual(
        expect.arrayContaining([{ type: 'text', text: '✅ Swift package cleaned successfully.' }]),
      );
      expect(result.isError).toBeUndefined();
    });

    it('should handle validation errors', async () => {
      registerCleanSwiftPackageTool(mockServer);

      const handlerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'swift_package_clean',
      );
      const handler = handlerCall[4];

      // Mock validation failure
      mockValidateRequiredParam.mockReturnValue({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: "Required parameter 'packagePath' is missing." }],
          isError: true,
        },
      });

      const params = { packagePath: '' };

      // ✅ Test actual production error handling
      const result = await handler(params);

      expect(result.content).toEqual([
        { type: 'text', text: "Required parameter 'packagePath' is missing." },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle clean command failures', async () => {
      registerCleanSwiftPackageTool(mockServer);

      const handlerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'swift_package_clean',
      );
      const handler = handlerCall[4];

      // Mock executeCommand failure
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Clean failed',
      });

      const params = { packagePath: '/path/to/package' };

      // ✅ Test actual production error handling
      const result = await handler(params);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        'Swift package clean failed',
        'Clean failed',
        'CleanError',
      );
    });

    it('should handle clean command exceptions', async () => {
      registerCleanSwiftPackageTool(mockServer);

      const handlerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'swift_package_clean',
      );
      const handler = handlerCall[4];

      // Mock executeCommand exception
      mockExecuteCommand.mockRejectedValue(new Error('Command execution failed'));

      const params = { packagePath: '/path/to/package' };

      // ✅ Test actual production exception handling
      const result = await handler(params);

      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        'Failed to execute swift package clean',
        'Command execution failed',
        'SystemError',
      );
    });
  });

  describe('tool integration workflows', () => {
    it('should support complete run-list-stop workflow', async () => {
      // ✅ Test actual production workflow integration
      registerRunSwiftPackageTool(mockServer);
      registerListSwiftPackageTool(mockServer);
      registerStopSwiftPackageTool(mockServer);

      const runHandler = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'swift_package_run',
      )[4];
      const listHandler = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'swift_package_list',
      )[4];

      // Start a background process
      const runParams = { packagePath: '/path/to/package', background: true };
      const runResult = await runHandler(runParams);

      expect(runResult.content[0].text).toContain(
        '🚀 Started executable in background (PID: 12345)',
      );

      // List processes - since we've started one, it should now show active processes
      const listResult = await listHandler({});
      expect(listResult.content[0].text).toContain('Active Swift Package processes');
    });
  });

  describe('error handling edge cases', () => {
    it('should handle invalid configuration values', async () => {
      registerRunSwiftPackageTool(mockServer);

      const handlerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'swift_package_run',
      );
      const handler = handlerCall[4];

      const params = {
        packagePath: '/path/to/package',
        configuration: 'invalid' as any,
      };

      // ✅ Test actual production configuration validation
      const result = await handler(params);

      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        "Invalid configuration. Use 'debug' or 'release'.",
        true,
      );
    });

    it('should handle process timeout correctly', async () => {
      registerRunSwiftPackageTool(mockServer);

      const handlerCall = mockRegisterTool.mock.calls.find(
        (call) => call[1] === 'swift_package_run',
      );
      const handler = handlerCall[4];

      // Mock a process that doesn't exit quickly
      mockChildProcess.on = vi.fn((event, callback) => {
        // Don't call exit callback to simulate hanging process
      });

      const params = {
        packagePath: '/path/to/package',
        timeout: 0.01, // Very short timeout for testing
      };

      // ✅ Test actual production timeout handling
      const result = await handler(params);

      expect(result.content[0].text).toContain('Process timed out');
    });
  });
});
