import { describe, it, expect } from 'vitest';
import * as z from 'zod';
import setSimAppearancePlugin, { set_sim_appearanceLogic } from '../set_sim_appearance.ts';
import {
  createMockCommandResponse,
  createMockExecutor,
} from '../../../../test-utils/mock-executors.ts';

describe('set_sim_appearance plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(setSimAppearancePlugin.name).toBe('set_sim_appearance');
    });

    it('should have correct description field', () => {
      expect(setSimAppearancePlugin.description).toBe('Set sim appearance.');
    });

    it('should have handler function', () => {
      expect(typeof setSimAppearancePlugin.handler).toBe('function');
    });

    it('should expose public schema without simulatorId field', () => {
      const schema = z.object(setSimAppearancePlugin.schema);

      expect(schema.safeParse({ mode: 'dark' }).success).toBe(true);
      expect(schema.safeParse({ mode: 'light' }).success).toBe(true);
      expect(schema.safeParse({ mode: 'invalid' }).success).toBe(false);

      const withSimId = schema.safeParse({ simulatorId: 'abc123', mode: 'dark' });
      expect(withSimId.success).toBe(true);
      expect('simulatorId' in (withSimId.data as any)).toBe(false);
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
      const result = await setSimAppearancePlugin.handler({ mode: 'dark' });

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
          true,
          undefined,
        ],
      ]);
    });
  });
});
