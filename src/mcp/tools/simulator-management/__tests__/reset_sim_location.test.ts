import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import resetSimLocationPlugin, { reset_sim_locationLogic } from '../reset_sim_location.ts';
import { createMockExecutor } from '../../../../test-utils/mock-executors.js';

describe('reset_sim_location plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(resetSimLocationPlugin.name).toBe('reset_sim_location');
    });

    it('should have correct description field', () => {
      expect(resetSimLocationPlugin.description).toBe(
        "Resets the simulator's location to default.",
      );
    });

    it('should have handler function', () => {
      expect(typeof resetSimLocationPlugin.handler).toBe('function');
    });

    it('should have correct schema validation', () => {
      const schema = z.object(resetSimLocationPlugin.schema);

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
    it('should successfully reset simulator location', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Location reset successfully',
      });

      const result = await reset_sim_locationLogic(
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

      const result = await reset_sim_locationLogic(
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

    it('should handle exception during execution', async () => {
      const mockExecutor = createMockExecutor(new Error('Network error'));

      const result = await reset_sim_locationLogic(
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

    it('should call correct command', async () => {
      let capturedCommand: string[] = [];
      let capturedLogPrefix: string | undefined;

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Location reset successfully',
      });

      // Create a wrapper to capture the command arguments
      const capturingExecutor = async (command: string[], logPrefix?: string) => {
        capturedCommand = command;
        capturedLogPrefix = logPrefix;
        return mockExecutor(command, logPrefix);
      };

      await reset_sim_locationLogic(
        {
          simulatorUuid: 'test-uuid-123',
        },
        capturingExecutor,
      );

      expect(capturedCommand).toEqual(['xcrun', 'simctl', 'location', 'test-uuid-123', 'clear']);
      expect(capturedLogPrefix).toBe('Reset Simulator Location');
    });
  });
});
