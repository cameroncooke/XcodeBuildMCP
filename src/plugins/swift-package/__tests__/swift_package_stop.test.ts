/**
 * Tests for swift_package_stop plugin
 * Following CLAUDE.md testing standards with pure dependency injection
 * No vitest mocking - using dependency injection pattern
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import swiftPackageStop, {
  createMockProcessManager,
  type ProcessManager,
} from '../swift_package_stop.js';

/**
 * Mock process implementation for testing
 */
class MockProcess {
  public killed = false;
  public killSignal: string | undefined;
  public exitCallback: (() => void) | undefined;
  public shouldThrowOnKill = false;
  public killError: Error | string | undefined;
  public pid: number;

  constructor(pid: number) {
    this.pid = pid;
  }

  kill(signal?: string): void {
    if (this.shouldThrowOnKill) {
      throw this.killError || new Error('Process kill failed');
    }
    this.killed = true;
    this.killSignal = signal;
  }

  on(event: string, callback: () => void): void {
    if (event === 'exit') {
      this.exitCallback = callback;
    }
  }

  // Simulate immediate exit for test control
  simulateExit(): void {
    if (this.exitCallback) {
      this.exitCallback();
    }
  }
}

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

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact error for process not found', async () => {
      const mockProcessManager = createMockProcessManager({
        getProcess: () => undefined,
      });

      const result = await swiftPackageStop.handler({ pid: 99999 }, mockProcessManager);

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
      const mockProcess = new MockProcess(12345);
      const startedAt = new Date('2023-01-01T10:00:00.000Z');

      const mockProcessManager = createMockProcessManager({
        getProcess: (pid: number) =>
          pid === 12345
            ? {
                process: mockProcess,
                startedAt: startedAt,
              }
            : undefined,
        removeProcess: () => true,
      });

      // Set up the process to exit immediately when exit handler is registered
      const originalOn = mockProcess.on.bind(mockProcess);
      mockProcess.on = (event: string, callback: () => void) => {
        originalOn(event, callback);
        if (event === 'exit') {
          // Simulate immediate graceful exit
          setImmediate(() => callback());
        }
      };

      const result = await swiftPackageStop.handler(
        { pid: 12345 },
        mockProcessManager,
        10, // Very short timeout for testing
      );

      expect(mockProcess.killed).toBe(true);
      expect(mockProcess.killSignal).toBe('SIGTERM');
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
      const mockProcess = new MockProcess(67890);
      const startedAt = new Date('2023-02-15T14:30:00.000Z');

      const mockProcessManager = createMockProcessManager({
        getProcess: (pid: number) =>
          pid === 67890
            ? {
                process: mockProcess,
                startedAt: startedAt,
              }
            : undefined,
        removeProcess: () => true,
      });

      // Mock the process to NOT exit gracefully (no callback invocation)
      const killCalls: string[] = [];
      const originalKill = mockProcess.kill.bind(mockProcess);
      mockProcess.kill = (signal?: string) => {
        killCalls.push(signal || 'default');
        originalKill(signal);
      };

      // Set up timeout to trigger SIGKILL after SIGTERM
      const originalOn = mockProcess.on.bind(mockProcess);
      mockProcess.on = (event: string, callback: () => void) => {
        originalOn(event, callback);
        // Do NOT call the callback to simulate hanging process
      };

      const result = await swiftPackageStop.handler(
        { pid: 67890 },
        mockProcessManager,
        10, // Very short timeout for testing
      );

      expect(killCalls).toEqual(['SIGTERM', 'SIGKILL']);
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
      const mockProcess = new MockProcess(54321);
      const startedAt = new Date('2023-03-20T09:15:00.000Z');

      // Configure process to throw error on kill
      mockProcess.shouldThrowOnKill = true;
      mockProcess.killError = new Error('ESRCH: No such process');

      const mockProcessManager = createMockProcessManager({
        getProcess: (pid: number) =>
          pid === 54321
            ? {
                process: mockProcess,
                startedAt: startedAt,
              }
            : undefined,
      });

      const result = await swiftPackageStop.handler({ pid: 54321 }, mockProcessManager);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Failed to stop process\nDetails: ESRCH: No such process',
          },
        ],
        isError: true,
      });
    });

    it('should handle non-Error exception in catch block', async () => {
      const mockProcess = new MockProcess(11111);
      const startedAt = new Date('2023-04-10T16:45:00.000Z');

      // Configure process to throw non-Error object
      mockProcess.shouldThrowOnKill = true;
      mockProcess.killError = 'Process termination failed';

      const mockProcessManager = createMockProcessManager({
        getProcess: (pid: number) =>
          pid === 11111
            ? {
                process: mockProcess,
                startedAt: startedAt,
              }
            : undefined,
      });

      const result = await swiftPackageStop.handler({ pid: 11111 }, mockProcessManager);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Failed to stop process\nDetails: Process termination failed',
          },
        ],
        isError: true,
      });
    });

    it('should handle process found but exit event never fires and timeout occurs', async () => {
      const mockProcess = new MockProcess(22222);
      const startedAt = new Date('2023-05-05T12:00:00.000Z');

      const mockProcessManager = createMockProcessManager({
        getProcess: (pid: number) =>
          pid === 22222
            ? {
                process: mockProcess,
                startedAt: startedAt,
              }
            : undefined,
        removeProcess: () => true,
      });

      const killCalls: string[] = [];
      const originalKill = mockProcess.kill.bind(mockProcess);
      mockProcess.kill = (signal?: string) => {
        killCalls.push(signal || 'default');
        originalKill(signal);
      };

      // Mock process.on to register the exit handler but never call it (timeout scenario)
      const originalOn = mockProcess.on.bind(mockProcess);
      mockProcess.on = (event: string, callback: () => void) => {
        originalOn(event, callback);
        // Handler is registered but callback never called (simulates hanging process)
      };

      const result = await swiftPackageStop.handler(
        { pid: 22222 },
        mockProcessManager,
        10, // Very short timeout for testing
      );

      expect(killCalls).toEqual(['SIGTERM', 'SIGKILL']);
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
      const mockProcessManager = createMockProcessManager({
        getProcess: () => undefined,
      });

      const result = await swiftPackageStop.handler({ pid: 0 }, mockProcessManager);

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
      const mockProcessManager = createMockProcessManager({
        getProcess: () => undefined,
      });

      const result = await swiftPackageStop.handler({ pid: -1 }, mockProcessManager);

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
      const mockProcess = new MockProcess(33333);
      const startedAt = new Date('2023-06-01T08:30:00.000Z');

      const mockProcessManager = createMockProcessManager({
        getProcess: (pid: number) =>
          pid === 33333
            ? {
                process: mockProcess,
                startedAt: startedAt,
              }
            : undefined,
        removeProcess: () => true,
      });

      const killCalls: string[] = [];
      const originalKill = mockProcess.kill.bind(mockProcess);
      mockProcess.kill = (signal?: string) => {
        killCalls.push(signal || 'default');
        originalKill(signal);
      };

      // Set up the process to exit immediately when exit handler is registered
      const originalOn = mockProcess.on.bind(mockProcess);
      mockProcess.on = (event: string, callback: () => void) => {
        originalOn(event, callback);
        if (event === 'exit') {
          // Simulate immediate graceful exit
          setImmediate(() => callback());
        }
      };

      const result = await swiftPackageStop.handler(
        { pid: 33333 },
        mockProcessManager,
        10, // Very short timeout for testing
      );

      expect(killCalls).toEqual(['SIGTERM']); // Should not call SIGKILL
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
      const mockProcessManager = createMockProcessManager({
        getProcess: () => undefined,
      });

      const result = await swiftPackageStop.handler({}, mockProcessManager);

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
