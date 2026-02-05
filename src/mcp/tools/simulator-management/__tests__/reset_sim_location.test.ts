import { describe, it, expect } from 'vitest';
import * as z from 'zod';
import { schema, reset_sim_locationLogic } from '../reset_sim_location.ts';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';

describe('reset_sim_location plugin', () => {
  describe('Schema Validation', () => {
    it('should hide simulatorId from public schema', () => {
      const schemaObj = z.object(schema);

      expect(schemaObj.safeParse({}).success).toBe(true);

      const withSimId = schemaObj.safeParse({ simulatorId: 'abc123' });
      expect(withSimId.success).toBe(true);
      expect('simulatorId' in (withSimId.data as any)).toBe(false);
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
          simulatorId: 'test-uuid-123',
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
          simulatorId: 'test-uuid-123',
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
          simulatorId: 'test-uuid-123',
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
          simulatorId: 'test-uuid-123',
        },
        capturingExecutor,
      );

      expect(capturedCommand).toEqual(['xcrun', 'simctl', 'location', 'test-uuid-123', 'clear']);
      expect(capturedLogPrefix).toBe('Reset Simulator Location');
    });
  });
});
