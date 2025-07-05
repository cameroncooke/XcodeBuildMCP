import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import openSim from './open_sim.ts';

vi.mock('../../src/utils/command.ts', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

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

  let mockExecuteCommand: MockedFunction<any>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { executeCommand } = await vi.importMock('../../src/utils/command.ts');
    mockExecuteCommand = executeCommand as MockedFunction<any>;
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should successfully open simulator', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
      });

      const result = await openSim.handler();

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
      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Command failed',
        stdout: '',
        stderr: '',
      });

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
      const testError = new Error('Test error');
      mockExecuteCommand.mockRejectedValue(testError);

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
      mockExecuteCommand.mockRejectedValue('String error');

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
      mockExecuteCommand.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
      });

      await openSim.handler();

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        ['open', '-a', 'Simulator'],
        'Open Simulator',
      );
    });
  });
});
