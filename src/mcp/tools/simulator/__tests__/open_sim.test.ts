/**
 * Tests for open_sim plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect } from 'vitest';
import * as z from 'zod';
import {
  createMockCommandResponse,
  createMockExecutor,
  type CommandExecutor,
} from '../../../../test-utils/mock-executors.ts';
import openSim, { open_simLogic } from '../open_sim.ts';

describe('open_sim tool', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(openSim.name).toBe('open_sim');
    });

    it('should have correct description field', () => {
      expect(openSim.description).toBe('Open Simulator app.');
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
            text: 'Simulator app opened successfully.',
          },
        ],
        nextSteps: [
          {
            tool: 'boot_sim',
            label: 'Boot a simulator if needed',
            params: { simulatorId: 'UUID_FROM_LIST_SIMS' },
            priority: 1,
          },
          {
            tool: 'start_sim_log_cap',
            label: 'Capture structured logs (app continues running)',
            params: { simulatorId: 'UUID', bundleId: 'YOUR_APP_BUNDLE_ID' },
            priority: 2,
          },
          {
            tool: 'start_sim_log_cap',
            label: 'Capture console + structured logs (app restarts)',
            params: { simulatorId: 'UUID', bundleId: 'YOUR_APP_BUNDLE_ID', captureConsole: true },
            priority: 3,
          },
          {
            tool: 'launch_app_logs_sim',
            label: 'Launch app with logs in one step',
            params: { simulatorId: 'UUID', bundleId: 'YOUR_APP_BUNDLE_ID' },
            priority: 4,
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
        description?: string;
        hideOutput?: boolean;
        opts?: { cwd?: string };
      }> = [];

      const mockExecutor: CommandExecutor = async (
        command,
        description,
        hideOutput,
        opts,
        detached,
      ) => {
        calls.push({ command, description, hideOutput, opts });
        void detached;
        return createMockCommandResponse({
          success: true,
          output: '',
          error: undefined,
        });
      };

      await open_simLogic({}, mockExecutor);

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({
        command: ['open', '-a', 'Simulator'],
        description: 'Open Simulator',
        hideOutput: false,
        opts: undefined,
      });
    });
  });
});
