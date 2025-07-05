/**
 * Tests for swift_package_stop plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach, afterEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import swiftPackageStop from './swift_package_stop.js';

// Mock the utility functions
vi.mock('../../src/utils/index.js', () => ({
  createTextResponse: vi.fn(),
  createErrorResponse: vi.fn(),
}));

// Mock the active-processes module
vi.mock('./active-processes.js', () => ({
  getProcess: vi.fn(),
  removeProcess: vi.fn(),
}));

describe('swift_package_stop plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(swiftPackageStop.name).toBe('swift_package_stop');
    });

    it('should have correct description', () => {
      expect(swiftPackageStop.description).toBe(
        'Stops a running Swift Package executable started with swift_package_run',
      );
    });

    it('should have handler function', () => {
      expect(typeof swiftPackageStop.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test valid inputs
      expect(swiftPackageStop.schema.pid.safeParse(12345).success).toBe(true);
      expect(swiftPackageStop.schema.pid.safeParse(0).success).toBe(true);
      expect(swiftPackageStop.schema.pid.safeParse(-1).success).toBe(true);

      // Test invalid inputs
      expect(swiftPackageStop.schema.pid.safeParse('not-a-number').success).toBe(false);
      expect(swiftPackageStop.schema.pid.safeParse(null).success).toBe(false);
      expect(swiftPackageStop.schema.pid.safeParse(undefined).success).toBe(false);
      expect(swiftPackageStop.schema.pid.safeParse({}).success).toBe(false);
      expect(swiftPackageStop.schema.pid.safeParse([]).success).toBe(false);
    });
  });

  let mockCreateTextResponse: MockedFunction<any>;
  let mockCreateErrorResponse: MockedFunction<any>;
  let mockGetProcess: MockedFunction<any>;
  let mockRemoveProcess: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');
    const activeProcesses = await import('./active-processes.js');

    mockCreateTextResponse = utils.createTextResponse as MockedFunction<any>;
    mockCreateErrorResponse = utils.createErrorResponse as MockedFunction<any>;
    mockGetProcess = activeProcesses.getProcess as MockedFunction<any>;
    mockRemoveProcess = activeProcesses.removeProcess as MockedFunction<any>;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact error for process not found', async () => {
      mockGetProcess.mockReturnValue(undefined);
      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: '⚠️ No running process found with PID 99999. Use swift_package_run to check active processes.',
          },
        ],
        isError: true,
      });

      const result = await swiftPackageStop.handler({
        pid: 99999,
      });

      expect(mockGetProcess).toHaveBeenCalledWith(99999);
      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        '⚠️ No running process found with PID 99999. Use swift_package_run to check active processes.',
        true,
      );
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '⚠️ No running process found with PID 99999. Use swift_package_run to check active processes.',
          },
        ],
        isError: true,
      });
    });

    it('should successfully stop a process that exits gracefully', async () => {
      vi.useFakeTimers();

      const mockProcess = {
        kill: vi.fn(),
        on: vi.fn(),
        pid: 12345,
      };

      const startedAt = new Date('2023-01-01T10:00:00.000Z');
      const processInfo = {
        process: mockProcess,
        startedAt: startedAt,
      };

      mockGetProcess.mockReturnValue(processInfo);
      mockRemoveProcess.mockReturnValue(true);

      // Mock the process.on call to immediately trigger the exit callback
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'exit') {
          // Simulate immediate exit
          setTimeout(() => callback(), 0);
        }
      });

      const resultPromise = swiftPackageStop.handler({
        pid: 12345,
      });

      // Advance timers to trigger the immediate exit callback
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(mockGetProcess).toHaveBeenCalledWith(12345);
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockProcess.on).toHaveBeenCalledWith('exit', expect.any(Function));
      expect(mockRemoveProcess).toHaveBeenCalledWith(12345);
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Stopped executable (was running since 2023-01-01T10:00:00.000Z)',
          },
          {
            type: 'text',
            text: '💡 Process terminated. You can now run swift_package_run again if needed.',
          },
        ],
      });
    });

    it('should force kill process if graceful termination fails', async () => {
      vi.useFakeTimers();

      const mockProcess = {
        kill: vi.fn(),
        on: vi.fn(),
        pid: 67890,
      };

      const startedAt = new Date('2023-02-15T14:30:00.000Z');
      const processInfo = {
        process: mockProcess,
        startedAt: startedAt,
      };

      mockGetProcess.mockReturnValue(processInfo);
      mockRemoveProcess.mockReturnValue(true);

      // Mock the process.on call to NOT trigger the exit callback (hanging process)
      mockProcess.on.mockImplementation((event, callback) => {
        // Don't call the callback to simulate hanging process
      });

      const resultPromise = swiftPackageStop.handler({
        pid: 67890,
      });

      // Advance timers to trigger the timeout (5000ms)
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(mockGetProcess).toHaveBeenCalledWith(67890);
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
      expect(mockProcess.on).toHaveBeenCalledWith('exit', expect.any(Function));
      expect(mockRemoveProcess).toHaveBeenCalledWith(67890);
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Stopped executable (was running since 2023-02-15T14:30:00.000Z)',
          },
          {
            type: 'text',
            text: '💡 Process terminated. You can now run swift_package_run again if needed.',
          },
        ],
      });
    });

    it('should handle process kill error and return error response', async () => {
      const mockProcess = {
        kill: vi.fn(),
        on: vi.fn(),
        pid: 54321,
      };

      const startedAt = new Date('2023-03-20T09:15:00.000Z');
      const processInfo = {
        process: mockProcess,
        startedAt: startedAt,
      };

      mockGetProcess.mockReturnValue(processInfo);
      mockCreateErrorResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Error: Failed to stop process',
          },
        ],
        isError: true,
      });

      // Mock process.kill to throw an error
      const killError = new Error('ESRCH: No such process');
      mockProcess.kill.mockImplementation(() => {
        throw killError;
      });

      const result = await swiftPackageStop.handler({
        pid: 54321,
      });

      expect(mockGetProcess).toHaveBeenCalledWith(54321);
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        'Failed to stop process',
        'ESRCH: No such process',
        'SystemError',
      );
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Failed to stop process',
          },
        ],
        isError: true,
      });
    });

    it('should handle non-Error exception in catch block', async () => {
      const mockProcess = {
        kill: vi.fn(),
        on: vi.fn(),
        pid: 11111,
      };

      const startedAt = new Date('2023-04-10T16:45:00.000Z');
      const processInfo = {
        process: mockProcess,
        startedAt: startedAt,
      };

      mockGetProcess.mockReturnValue(processInfo);
      mockCreateErrorResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Error: Failed to stop process',
          },
        ],
        isError: true,
      });

      // Mock process.kill to throw a non-Error object
      const stringError = 'Process termination failed';
      mockProcess.kill.mockImplementation(() => {
        throw stringError;
      });

      const result = await swiftPackageStop.handler({
        pid: 11111,
      });

      expect(mockGetProcess).toHaveBeenCalledWith(11111);
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        'Failed to stop process',
        'Process termination failed',
        'SystemError',
      );
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Failed to stop process',
          },
        ],
        isError: true,
      });
    });

    it('should handle process found but exit event never fires and timeout occurs', async () => {
      vi.useFakeTimers();

      const mockProcess = {
        kill: vi.fn(),
        on: vi.fn(),
        pid: 22222,
      };

      const startedAt = new Date('2023-05-05T12:00:00.000Z');
      const processInfo = {
        process: mockProcess,
        startedAt: startedAt,
      };

      mockGetProcess.mockReturnValue(processInfo);
      mockRemoveProcess.mockReturnValue(true);

      // Mock process.on to register the exit handler but never call it
      mockProcess.on.mockImplementation((event, callback) => {
        // Handler is registered but callback never called
      });

      const resultPromise = swiftPackageStop.handler({
        pid: 22222,
      });

      // Fast forward past the 5000ms timeout
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(mockGetProcess).toHaveBeenCalledWith(22222);
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');
      expect(mockProcess.on).toHaveBeenCalledWith('exit', expect.any(Function));
      expect(mockRemoveProcess).toHaveBeenCalledWith(22222);
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Stopped executable (was running since 2023-05-05T12:00:00.000Z)',
          },
          {
            type: 'text',
            text: '💡 Process terminated. You can now run swift_package_run again if needed.',
          },
        ],
      });
    });

    it('should handle edge case with pid 0', async () => {
      mockGetProcess.mockReturnValue(undefined);
      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: '⚠️ No running process found with PID 0. Use swift_package_run to check active processes.',
          },
        ],
        isError: true,
      });

      const result = await swiftPackageStop.handler({
        pid: 0,
      });

      expect(mockGetProcess).toHaveBeenCalledWith(0);
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '⚠️ No running process found with PID 0. Use swift_package_run to check active processes.',
          },
        ],
        isError: true,
      });
    });

    it('should handle edge case with negative pid', async () => {
      mockGetProcess.mockReturnValue(undefined);
      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: '⚠️ No running process found with PID -1. Use swift_package_run to check active processes.',
          },
        ],
        isError: true,
      });

      const result = await swiftPackageStop.handler({
        pid: -1,
      });

      expect(mockGetProcess).toHaveBeenCalledWith(-1);
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '⚠️ No running process found with PID -1. Use swift_package_run to check active processes.',
          },
        ],
        isError: true,
      });
    });

    it('should handle process that exits after first SIGTERM call', async () => {
      vi.useFakeTimers();

      const mockProcess = {
        kill: vi.fn(),
        on: vi.fn(),
        pid: 33333,
      };

      const startedAt = new Date('2023-06-01T08:30:00.000Z');
      const processInfo = {
        process: mockProcess,
        startedAt: startedAt,
      };

      mockGetProcess.mockReturnValue(processInfo);
      mockRemoveProcess.mockReturnValue(true);

      // Mock process.on to trigger exit callback after a short delay
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'exit') {
          setTimeout(() => callback(), 100);
        }
      });

      const resultPromise = swiftPackageStop.handler({
        pid: 33333,
      });

      // Advance timers to trigger exit callback before timeout
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(mockGetProcess).toHaveBeenCalledWith(33333);
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockProcess.kill).toHaveBeenCalledTimes(1); // Should not call SIGKILL
      expect(mockProcess.on).toHaveBeenCalledWith('exit', expect.any(Function));
      expect(mockRemoveProcess).toHaveBeenCalledWith(33333);
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Stopped executable (was running since 2023-06-01T08:30:00.000Z)',
          },
          {
            type: 'text',
            text: '💡 Process terminated. You can now run swift_package_run again if needed.',
          },
        ],
      });
    });

    it('should handle undefined pid parameter', async () => {
      mockGetProcess.mockReturnValue(undefined);
      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: '⚠️ No running process found with PID undefined. Use swift_package_run to check active processes.',
          },
        ],
        isError: true,
      });

      const result = await swiftPackageStop.handler({});

      expect(mockGetProcess).toHaveBeenCalledWith(undefined);
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '⚠️ No running process found with PID undefined. Use swift_package_run to check active processes.',
          },
        ],
        isError: true,
      });
    });
  });
});
