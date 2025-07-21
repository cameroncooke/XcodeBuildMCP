/**
 * Tests for open_sim plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor, CommandExecutor } from '../../../utils/command.js';
import openSim, { open_simLogic } from '../open_sim.ts';

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

      // Schema is empty, so any object should pass
      expect(schema.safeParse({}).success).toBe(true);

      expect(
        schema.safeParse({
          anyProperty: 'value',
        }).success,
      ).toBe(true);

      // Empty schema should accept anything
      expect(
        schema.safeParse({
          enabled: true,
        }).success,
      ).toBe(true);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact successful open simulator response', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
      });

      const result = await open_simLogic({}, mockExecutor);

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

    it('should return exact command failure response', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Command failed',
      });

      const result = await open_simLogic({}, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Open simulator operation failed: Command failed',
          },
        ],
      });
    });

    it('should return exact exception handling response', async () => {
      const mockExecutor: CommandExecutor = async () => {
        throw new Error('Test error');
      };

      const result = await open_simLogic({}, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Open simulator operation failed: Test error',
          },
        ],
      });
    });

    it('should return exact string error handling response', async () => {
      const mockExecutor: CommandExecutor = async () => {
        throw 'String error';
      };

      const result = await open_simLogic({}, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Open simulator operation failed: String error',
          },
        ],
      });
    });

    it('should verify command generation with mock executor', async () => {
      const calls: Array<{
        command: string[];
        description: string;
        hideOutput: boolean;
        workingDirectory: string | undefined;
      }> = [];

      const mockExecutor: CommandExecutor = async (
        command,
        description,
        hideOutput,
        workingDirectory,
      ) => {
        calls.push({ command, description, hideOutput, workingDirectory });
        return {
          success: true,
          output: '',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await open_simLogic({}, mockExecutor);

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({
        command: ['open', '-a', 'Simulator'],
        description: 'Open Simulator',
        hideOutput: true,
        workingDirectory: undefined,
      });
    });
  });
});
