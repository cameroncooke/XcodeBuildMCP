import { describe, it, expect } from 'vitest';
import * as z from 'zod';
import { schema, handler, set_sim_appearanceLogic } from '../set_sim_appearance.ts';
import {
  createMockCommandResponse,
  createMockExecutor,
} from '../../../../test-utils/mock-executors.ts';

describe('set_sim_appearance plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have handler function', () => {
      expect(typeof handler).toBe('function');
    });

    it('should expose public schema without simulatorId field', () => {
      const schemaObject = z.object(schema);

      expect(schemaObject.safeParse({ mode: 'dark' }).success).toBe(true);
      expect(schemaObject.safeParse({ mode: 'light' }).success).toBe(true);
      expect(schemaObject.safeParse({ mode: 'invalid' }).success).toBe(false);

      const withSimId = schemaObject.safeParse({ simulatorId: 'abc123', mode: 'dark' });
      expect(withSimId.success).toBe(true);
      expect('simulatorId' in (withSimId.data as object)).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle successful appearance change', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
        error: '',
      });

      const result = await set_sim_appearanceLogic(
        {
          simulatorId: 'test-uuid-123',
          mode: 'dark',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Successfully set simulator test-uuid-123 appearance to dark mode',
          },
        ],
      });
    });

    it('should handle appearance change failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Invalid device: invalid-uuid',
      });

      const result = await set_sim_appearanceLogic(
        {
          simulatorId: 'invalid-uuid',
          mode: 'light',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to set simulator appearance: Invalid device: invalid-uuid',
          },
        ],
      });
    });

    it('should surface session default requirement when simulatorId is missing', async () => {
      const result = await handler({ mode: 'dark' });

      const message = result.content?.[0]?.text ?? '';
      expect(message).toContain('Error: Missing required session defaults');
      expect(message).toContain('simulatorId is required');
      expect(result.isError).toBe(true);
    });

    it('should handle exception during execution', async () => {
      const mockExecutor = createMockExecutor(new Error('Network error'));

      const result = await set_sim_appearanceLogic(
        {
          simulatorId: 'test-uuid-123',
          mode: 'dark',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to set simulator appearance: Network error',
          },
        ],
      });
    });

    it('should call correct command', async () => {
      const commandCalls: any[] = [];
      const mockExecutor = (...args: any[]) => {
        commandCalls.push(args);
        return Promise.resolve(
          createMockCommandResponse({
            success: true,
            output: '',
            error: '',
          }),
        );
      };

      await set_sim_appearanceLogic(
        {
          simulatorId: 'test-uuid-123',
          mode: 'dark',
        },
        mockExecutor,
      );

      expect(commandCalls).toEqual([
        [
          ['xcrun', 'simctl', 'ui', 'test-uuid-123', 'appearance', 'dark'],
          'Set Simulator Appearance',
          false,
          undefined,
        ],
      ]);
    });
  });
});
