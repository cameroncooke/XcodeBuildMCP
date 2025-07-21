/**
 * Tests for reset_simulator_location plugin (re-exported from simulator-shared)
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import resetSimulatorLocationPlugin, {
  reset_simulator_locationLogic,
} from '../../simulator-shared/reset_simulator_location.js';

describe('reset_simulator_location plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(resetSimulatorLocationPlugin.name).toBe('reset_simulator_location');
    });

    it('should have correct description field', () => {
      expect(resetSimulatorLocationPlugin.description).toBe(
        "Resets the simulator's location to default.",
      );
    });

    it('should have handler function', () => {
      expect(typeof resetSimulatorLocationPlugin.handler).toBe('function');
    });

    it('should have correct schema validation', () => {
      const schema = z.object(resetSimulatorLocationPlugin.schema);

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

  describe('Command Generation', () => {
    it('should call correct command with valid parameters', async () => {
      // Track command calls via the executor
      const commandCalls: any[] = [];
      const mockExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        commandCalls.push({ command, logPrefix, useShell, env });
        return {
          success: true,
          output: 'Location reset successfully',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const result = await reset_simulator_locationLogic(
        {
          simulatorUuid: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(commandCalls).toHaveLength(1);
      expect(commandCalls[0].command).toEqual([
        'xcrun',
        'simctl',
        'location',
        'test-uuid-123',
        'clear',
      ]);
      expect(commandCalls[0].logPrefix).toBe('Reset Simulator Location');
      expect(result.isError).toBe(undefined); // Success case doesn't set isError
    });
  });

  describe('Response Processing', () => {
    it('should successfully reset simulator location', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Location reset successfully',
      });

      const result = await reset_simulator_locationLogic(
        {
          simulatorUuid: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Successfully reset simulator test-uuid-123 location.',
          },
        ],
      });
    });

    it('should handle command failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Command failed',
      });

      const result = await reset_simulator_locationLogic(
        {
          simulatorUuid: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to reset simulator location: Command failed',
          },
        ],
      });
    });

    it('should handle missing simulatorUuid', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Location reset successfully',
      });

      const result = await reset_simulator_locationLogic({}, mockExecutor);

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
      const mockExecutor = createMockExecutor(new Error('Network error'));

      const result = await reset_simulator_locationLogic(
        {
          simulatorUuid: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to reset simulator location: Network error',
          },
        ],
      });
    });
  });
});
