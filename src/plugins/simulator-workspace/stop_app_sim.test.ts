import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { EventEmitter } from 'events';
import plugin from './stop_app_sim.ts';

// Mock only child_process at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

// Mock child process class
class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
}

describe('stop_app_sim plugin', () => {
  let mockSpawn: Record<string, unknown>;
  let mockProcess: MockChildProcess;

  beforeEach(async () => {
    const { spawn } = await import('child_process');
    mockSpawn = vi.mocked(spawn);
    mockProcess = new MockChildProcess();
    mockSpawn.mockReturnValue(mockProcess);

    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(plugin.name).toBe('stop_app_sim');
    });

    it('should have correct description field', () => {
      expect(plugin.description).toBe(
        'Stops an app running in an iOS simulator. Requires simulatorUuid and bundleId.',
      );
    });

    it('should have handler function', () => {
      expect(typeof plugin.handler).toBe('function');
    });

    it('should have correct schema validation', () => {
      const schema = z.object(plugin.schema);

      expect(
        schema.safeParse({
          simulatorUuid: 'abc123',
          bundleId: 'com.example.app',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          simulatorUuid: 123,
          bundleId: 'com.example.app',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          simulatorUuid: 'abc123',
          bundleId: 123,
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          simulatorUuid: 'abc123',
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should stop app successfully', async () => {
      // Set up successful command execution
      setTimeout(() => {
        mockProcess.stdout.emit('data', '');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await plugin.handler({
        simulatorUuid: 'test-uuid',
        bundleId: 'com.example.App',
      });

      // Verify command was called correctly
      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        ['-c', 'xcrun simctl terminate test-uuid com.example.App'],
        expect.any(Object),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App com.example.App stopped successfully in simulator test-uuid',
          },
        ],
      });
    });

    it('should handle command failure', async () => {
      // Set up command failure
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Simulator not found');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await plugin.handler({
        simulatorUuid: 'invalid-uuid',
        bundleId: 'com.example.App',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Stop app in simulator operation failed: Simulator not found',
          },
        ],
        isError: true,
      });
    });

    it('should handle missing simulatorUuid', async () => {
      const result = await plugin.handler({
        simulatorUuid: undefined,
        bundleId: 'com.example.App',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'simulatorUuid' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle missing bundleId', async () => {
      const result = await plugin.handler({ simulatorUuid: 'test-uuid', bundleId: undefined });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'bundleId' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle exception during execution', async () => {
      // Set up spawn error
      setTimeout(() => {
        mockProcess.emit('error', new Error('Unexpected error'));
      }, 0);

      const result = await plugin.handler({
        simulatorUuid: 'test-uuid',
        bundleId: 'com.example.App',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Stop app in simulator operation failed: Unexpected error',
          },
        ],
        isError: true,
      });
    });

    it('should call correct command', async () => {
      // Set up successful command execution
      setTimeout(() => {
        mockProcess.stdout.emit('data', '');
        mockProcess.emit('close', 0);
      }, 0);

      await plugin.handler({
        simulatorUuid: 'test-uuid',
        bundleId: 'com.example.App',
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        ['-c', 'xcrun simctl terminate test-uuid com.example.App'],
        expect.any(Object),
      );
    });
  });
});
