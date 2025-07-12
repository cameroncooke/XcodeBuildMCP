import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { EventEmitter } from 'events';

// Import the plugin
import bootSim from '../boot_sim.ts';

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

describe('boot_sim tool', () => {
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
    it('should have correct name', () => {
      expect(bootSim.name).toBe('boot_sim');
    });

    it('should have correct description', () => {
      expect(bootSim.description).toBe(
        "Boots an iOS simulator. IMPORTANT: You MUST provide the simulatorUuid parameter. Example: boot_sim({ simulatorUuid: 'YOUR_UUID_HERE' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof bootSim.handler).toBe('function');
    });

    it('should have correct schema with simulatorUuid string field', () => {
      const schema = z.object(bootSim.schema);

      // Valid inputs
      expect(schema.safeParse({ simulatorUuid: 'test-uuid-123' }).success).toBe(true);
      expect(schema.safeParse({ simulatorUuid: 'ABC123-DEF456' }).success).toBe(true);

      // Invalid inputs
      expect(schema.safeParse({ simulatorUuid: 123 }).success).toBe(false);
      expect(schema.safeParse({ simulatorUuid: null }).success).toBe(false);
      expect(schema.safeParse({ simulatorUuid: undefined }).success).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle successful boot', async () => {
      // Set up successful command execution
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Simulator booted successfully');
        mockProcess.emit('close', 0);
      }, 0);

      const result = await bootSim.handler({ simulatorUuid: 'test-uuid-123' });

      // Verify command was called correctly
      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        ['-c', 'xcrun simctl boot test-uuid-123'],
        expect.any(Object),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Simulator booted successfully. Next steps:
1. Open the Simulator app: open_sim({ enabled: true })
2. Install an app: install_app_sim({ simulatorUuid: "test-uuid-123", appPath: "PATH_TO_YOUR_APP" })
3. Launch an app: launch_app_sim({ simulatorUuid: "test-uuid-123", bundleId: "YOUR_APP_BUNDLE_ID" })
4. Log capture options:
   - Option 1: Capture structured logs only (app continues running):
     start_sim_log_cap({ simulatorUuid: "test-uuid-123", bundleId: "YOUR_APP_BUNDLE_ID" })
   - Option 2: Capture both console and structured logs (app will restart):
     start_sim_log_cap({ simulatorUuid: "test-uuid-123", bundleId: "YOUR_APP_BUNDLE_ID", captureConsole: true })
   - Option 3: Launch app with logs in one step:
     launch_app_logs_sim({ simulatorUuid: "test-uuid-123", bundleId: "YOUR_APP_BUNDLE_ID" })`,
          },
        ],
      });
    });

    it('should handle validation failure', async () => {
      const result = await bootSim.handler({ simulatorUuid: undefined });

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

    it('should handle command failure', async () => {
      // Set up command failure
      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Simulator not found');
        mockProcess.emit('close', 1);
      }, 0);

      const result = await bootSim.handler({ simulatorUuid: 'invalid-uuid' });

      // Verify command was called correctly
      expect(mockSpawn).toHaveBeenCalledWith(
        'sh',
        ['-c', 'xcrun simctl boot invalid-uuid'],
        expect.any(Object),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Boot simulator operation failed: Simulator not found',
          },
        ],
      });
    });

    it('should handle exception with Error object', async () => {
      // Set up spawn error
      setTimeout(() => {
        mockProcess.emit('error', new Error('Connection failed'));
      }, 0);

      const result = await bootSim.handler({ simulatorUuid: 'test-uuid-123' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Boot simulator operation failed: Connection failed',
          },
        ],
      });
    });

    it('should handle exception with string error', async () => {
      // Set up spawn error with string
      setTimeout(() => {
        mockProcess.emit('error', 'String error');
      }, 0);

      const result = await bootSim.handler({ simulatorUuid: 'test-uuid-123' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Boot simulator operation failed: String error',
          },
        ],
      });
    });
  });
});
