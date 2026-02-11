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
import { schema, handler, open_simLogic } from '../open_sim.ts';

describe('open_sim tool', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have handler function', () => {
      expect(typeof handler).toBe('function');
    });

    it('should have correct schema validation', () => {
      const schemaObj = z.object(schema);

      // Schema is empty, so any object should pass
      expect(schemaObj.safeParse({}).success).toBe(true);

      expect(
        schemaObj.safeParse({
          anyProperty: 'value',
        }).success,
      ).toBe(true);

      // Empty schema should accept anything
      expect(
        schemaObj.safeParse({
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
        nextStepParams: {
          boot_sim: { simulatorId: 'UUID_FROM_LIST_SIMS' },
          start_sim_log_cap: [
            { simulatorId: 'UUID', bundleId: 'YOUR_APP_BUNDLE_ID' },
            { simulatorId: 'UUID', bundleId: 'YOUR_APP_BUNDLE_ID', captureConsole: true },
          ],
          launch_app_logs_sim: { simulatorId: 'UUID', bundleId: 'YOUR_APP_BUNDLE_ID' },
        },
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
