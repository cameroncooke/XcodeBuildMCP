/**
 * Vitest tests for stop_mac_app Plugin
 *
 * Tests the plugin interface and functionality for the stop_mac_app tool.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { exec } from 'child_process';
import stopMacApp from './stop_mac_app.js';

// Mock Node.js APIs directly
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
}));

// Mock logger to prevent real logging during tests
vi.mock('../../utils/logger.js', () => ({
  log: vi.fn(),
}));

describe('stop_mac_app Plugin', () => {
  let mockExec: MockedFunction<typeof exec>;

  beforeEach(() => {
    mockExec = vi.mocked(exec);

    // Mock exec to resolve successfully by default
    mockExec.mockImplementation(
      (
        command: string,
        callback: (error: Error | null, stdout: string, stderr: string) => void,
      ) => {
        callback(null, '', '');
      },
    );

    vi.clearAllMocks();
  });

  describe('plugin structure', () => {
    it('should have correct plugin structure', () => {
      expect(stopMacApp.name).toBe('stop_mac_app');
      expect(stopMacApp.description).toContain('Stops a running macOS application');
      expect(stopMacApp.schema).toBeDefined();
      expect(stopMacApp.handler).toBeDefined();
      expect(typeof stopMacApp.handler).toBe('function');
    });
  });

  describe('parameter validation', () => {
    it('should reject when neither appName nor processId is provided', async () => {
      const result = await stopMacApp.handler({});

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: 'text', text: 'Either appName or processId must be provided.' },
      ]);
      expect(mockExec).not.toHaveBeenCalled();
    });

    it('should accept appName only', async () => {
      const params = {
        appName: 'Calculator',
      };

      const result = await stopMacApp.handler(params);

      expect(result.isError || false).toBe(false);
      expect(mockExec).toHaveBeenCalledTimes(1);
    });

    it('should accept processId only', async () => {
      const params = {
        processId: 1234,
      };

      const result = await stopMacApp.handler(params);

      expect(result.isError || false).toBe(false);
      expect(mockExec).toHaveBeenCalledTimes(1);
    });

    it('should accept both appName and processId (processId takes precedence)', async () => {
      const params = {
        appName: 'Calculator',
        processId: 1234,
      };

      const result = await stopMacApp.handler(params);

      expect(result.isError || false).toBe(false);
      expect(mockExec).toHaveBeenCalledTimes(1);
      // Should use processId command
      expect(mockExec).toHaveBeenCalledWith('kill 1234', expect.any(Function));
    });
  });

  describe('response formatting', () => {
    it('should return success response when stopping by app name succeeds', async () => {
      const params = {
        appName: 'Calculator',
      };

      const result = await stopMacApp.handler(params);

      expect(result.isError || false).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ macOS app stopped successfully: Calculator' },
      ]);
    });

    it('should return success response when stopping by process ID succeeds', async () => {
      const params = {
        processId: 1234,
      };

      const result = await stopMacApp.handler(params);

      expect(result.isError || false).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ macOS app stopped successfully: PID 1234' },
      ]);
    });

    it('should return error response when stop fails', async () => {
      // Mock failed stop
      mockExec.mockImplementation(
        (
          command: string,
          callback: (error: Error | null, stdout: string, stderr: string) => void,
        ) => {
          callback(new Error('No such process'), '', 'No such process');
        },
      );

      const params = {
        processId: 9999,
      };

      const result = await stopMacApp.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: 'text', text: '❌ Stop macOS app operation failed: No such process' },
      ]);
    });
  });

  describe('command generation', () => {
    it('should generate kill command for processId', async () => {
      const params = {
        processId: 1234,
      };

      await stopMacApp.handler(params);

      expect(mockExec).toHaveBeenCalledWith('kill 1234', expect.any(Function));
    });

    it('should generate pkill/osascript fallback command for app name', async () => {
      const params = {
        appName: 'Calculator',
      };

      await stopMacApp.handler(params);

      expect(mockExec).toHaveBeenCalledWith(
        'pkill -f "Calculator" || osascript -e \'tell application "Calculator" to quit\'',
        expect.any(Function),
      );
    });

    it('should handle app names with spaces', async () => {
      const params = {
        appName: 'My App With Spaces',
      };

      await stopMacApp.handler(params);

      expect(mockExec).toHaveBeenCalledWith(
        'pkill -f "My App With Spaces" || osascript -e \'tell application "My App With Spaces" to quit\'',
        expect.any(Function),
      );
    });

    it('should prioritize processId over appName when both provided', async () => {
      const params = {
        appName: 'Calculator',
        processId: 5678,
      };

      await stopMacApp.handler(params);

      expect(mockExec).toHaveBeenCalledWith('kill 5678', expect.any(Function));
    });
  });

  describe('error handling', () => {
    it('should handle stop tool errors gracefully', async () => {
      mockExec.mockImplementation(
        (
          command: string,
          callback: (error: Error | null, stdout: string, stderr: string) => void,
        ) => {
          callback(new Error('Operation not permitted'), '', '');
        },
      );

      const params = {
        processId: 1,
      };

      const result = await stopMacApp.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        { type: 'text', text: '❌ Stop macOS app operation failed: Operation not permitted' },
      ]);
    });
  });
});