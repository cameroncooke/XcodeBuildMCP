/**
 * Tests for reset_network_condition plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor, CommandExecutor } from '../../../utils/command.js';
import resetNetworkConditionPlugin, {
  reset_network_conditionLogic,
} from '../reset_network_condition.ts';

describe('reset_network_condition plugin', () => {
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
    it('should verify command generation with mock executor', async () => {
      const executorCalls: Array<{
        command: string[];
        description: string;
        silent: boolean;
        cwd: string | undefined;
      }> = [];

      const mockExecutor: CommandExecutor = async (command, description, silent, cwd) => {
        executorCalls.push({ command, description, silent, cwd });
        return {
          success: true,
          output: 'Network condition reset successfully',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await reset_network_conditionLogic(
        {
          simulatorUuid: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(executorCalls).toHaveLength(1);
      expect(executorCalls[0]).toEqual({
        command: ['xcrun', 'simctl', 'status_bar', 'test-uuid-123', 'clear'],
        description: 'Reset Network Condition',
        silent: true,
        cwd: undefined,
      });
    });

    it('should successfully reset network condition', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Network condition reset successfully',
      });

      const result = await reset_network_conditionLogic(
        {
          simulatorUuid: 'test-uuid-123',
        },
        mockExecutor,
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
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Command failed',
      });

      const result = await reset_network_conditionLogic(
        {
          simulatorUuid: 'test-uuid-123',
        },
        mockExecutor,
      );

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
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
      });

      const result = await reset_network_conditionLogic({ simulatorUuid: undefined }, mockExecutor);

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
      const mockExecutor: CommandExecutor = async () => {
        throw new Error('Network error');
      };

      const result = await reset_network_conditionLogic(
        {
          simulatorUuid: 'test-uuid-123',
        },
        mockExecutor,
      );

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
      const executorCalls: Array<{
        command: string[];
        description: string;
        silent: boolean;
        cwd: string | undefined;
      }> = [];

      const mockExecutor: CommandExecutor = async (command, description, silent, cwd) => {
        executorCalls.push({ command, description, silent, cwd });
        return {
          success: true,
          output: 'Network condition reset successfully',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await reset_network_conditionLogic(
        {
          simulatorUuid: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(executorCalls).toHaveLength(1);
      expect(executorCalls[0]).toEqual({
        command: ['xcrun', 'simctl', 'status_bar', 'test-uuid-123', 'clear'],
        description: 'Reset Network Condition',
        silent: true,
        cwd: undefined,
      });
    });
  });
});
