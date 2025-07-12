/**
 * Tests for open_sim plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../utils/command.js';
import openSim from './open_sim.ts';

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

      expect(schema.safeParse({}).success).toBe(true);

      expect(
        schema.safeParse({
          extraField: 'ignored',
        }).success,
      ).toBe(true);
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should successfully open simulator', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
      });

      const result = await openSim.handler({}, mockExecutor);

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
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Command failed',
      });

      const result = await openSim.handler({}, mockExecutor);

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
      const mockExecutor = vi.fn().mockRejectedValue(new Error('Test error'));

      const result = await openSim.handler({}, mockExecutor);

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
      const mockExecutor = vi.fn().mockRejectedValue('String error');

      const result = await openSim.handler({}, mockExecutor);

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
      const mockExecutor = vi.fn().mockResolvedValue({
        success: true,
        output: '',
        error: undefined,
        process: { pid: 12345 },
      });

      await openSim.handler({}, mockExecutor);

      expect(mockExecutor).toHaveBeenCalledWith(
        ['open', '-a', 'Simulator'],
        'Open Simulator',
        true,
        undefined,
      );
    });
  });
});
