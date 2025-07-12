import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { EventEmitter } from 'events';
import resetNetworkConditionPlugin from './reset_network_condition.ts';

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

describe('reset_network_condition plugin', () => {
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
      expect(resetNetworkConditionPlugin.name).toBe('reset_network_condition');
    });

    it('should have correct description field', () => {
      expect(resetNetworkConditionPlugin.description).toBe(
        'Resets network conditions to default in the simulator.',
      );
    });

    it('should have handler function', () => {
      expect(typeof resetNetworkConditionPlugin.handler).toBe('function');
    });

    it('should have correct schema validation', () => {
      const schema = z.object(resetNetworkConditionPlugin.schema);

      expect(
        schema.safeParse({
          simulatorUuid: 'abc123',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          simulatorUuid: 123,
        }).success,
      ).toBe(false);

      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should successfully reset network condition', async () => {
      // Set up successful command execution
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Network condition reset successfully');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await resetNetworkConditionPlugin.handler({
        simulatorUuid: 'test-uuid-123',
      });

      // Verify command was called correctly
      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        ['-c', 'xcrun simctl status_bar test-uuid-123 clear'],
        expect.any(Object),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Successfully reset simulator test-uuid-123 network conditions.',
          },
        ],
      });
    });

    it('should handle command failure', async () => {
      // Set up command failure
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Command failed');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await resetNetworkConditionPlugin.handler({
        simulatorUuid: 'test-uuid-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to reset network condition: Command failed',
          },
        ],
      });
    });

    it('should handle missing simulatorUuid', async () => {
      const result = await resetNetworkConditionPlugin.handler({ simulatorUuid: undefined });

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

    it('should handle exception during execution', async () => {
      // Set up spawn error
      setTimeout(() => {
        mockProcess.emit('error', new Error('Network error'));
      }, 0);

      const result = await resetNetworkConditionPlugin.handler({
        simulatorUuid: 'test-uuid-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to reset network condition: Network error',
          },
        ],
      });
    });

    it('should call correct command', async () => {
      // Set up successful command execution
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Network condition reset successfully');
        mockProcess.emit('close', 0);
      }, 0);

      await resetNetworkConditionPlugin.handler({
        simulatorUuid: 'test-uuid-123',
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        ['-c', 'xcrun simctl status_bar test-uuid-123 clear'],
        expect.any(Object),
      );
    });
  });
});
