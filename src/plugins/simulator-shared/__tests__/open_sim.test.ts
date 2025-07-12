import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { EventEmitter } from 'events';
import openSim from '../open_sim.ts';

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

describe('open_sim tool', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(openSim.name).toBe('open_sim');
    });

    it('should have correct description field', () => {
      expect(openSim.description).toBe('Opens the iOS Simulator app.');
    });

    it('should have handler function', () => {
      expect(typeof openSim.handler).toBe('function');
    });

    it('should have correct schema validation', () => {
      const schema = z.object(openSim.schema);

      expect(
        schema.safeParse({
          enabled: true,
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          enabled: false,
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          enabled: 'yes',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          enabled: 123,
        }).success,
      ).toBe(false);
    });
  });

  let mockSpawn: Record<string, unknown>;
  let mockProcess: MockChildProcess;

  beforeEach(async () => {
    const { spawn } = await import('child_process');
    mockSpawn = vi.mocked(spawn);
    mockProcess = new MockChildProcess();
    mockSpawn.mockReturnValue(mockProcess);

    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should successfully open simulator', async () => {
      // Set up successful command execution
      setTimeout(() => {
        mockProcess.stdout.emit('data', '');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await openSim.handler();

      // Verify command was called correctly
      expect(mockSpawn).toHaveBeenCalledWith('sh', ['-c', 'open -a Simulator'], expect.any(Object));

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Simulator app opened successfully',
          },
          {
            type: 'text',
            text: `Next Steps:
1. Boot a simulator if needed: boot_sim({ simulatorUuid: 'UUID_FROM_LIST_SIMULATORS' })
2. Launch your app and interact with it
3. Log capture options:
   - Option 1: Capture structured logs only (app continues running):
     start_sim_log_cap({ simulatorUuid: 'UUID', bundleId: 'YOUR_APP_BUNDLE_ID' })
   - Option 2: Capture both console and structured logs (app will restart):
     start_sim_log_cap({ simulatorUuid: 'UUID', bundleId: 'YOUR_APP_BUNDLE_ID', captureConsole: true })
   - Option 3: Launch app with logs in one step:
     launch_app_logs_sim({ simulatorUuid: 'UUID', bundleId: 'YOUR_APP_BUNDLE_ID' })`,
          },
        ],
      });
    });

    it('should handle executeCommand failure', async () => {
      // Set up command failure
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Command failed');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await openSim.handler();

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
      // Set up spawn error
      setTimeout(() => {
        mockProcess.emit('error', new Error('Test error'));
      }, 0);

      const result = await openSim.handler();

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
      // Set up spawn error with string
      setTimeout(() => {
        mockProcess.emit('error', 'String error');
      }, 0);

      const result = await openSim.handler();

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Open simulator operation failed: String error',
          },
        ],
      });
    });

    it('should call correct command', async () => {
      // Set up successful command execution
      setTimeout(() => {
        mockProcess.stdout.emit('data', '');
        mockProcess.emit('close', 0);
      }, 0);

      await openSim.handler();

      expect(mockSpawn).toHaveBeenCalledWith('sh', ['-c', 'open -a Simulator'], expect.any(Object));
    });
  });
});
