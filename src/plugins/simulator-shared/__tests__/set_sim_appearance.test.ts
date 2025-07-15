import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import setSimAppearancePlugin from '../set_sim_appearance.ts';
import { createMockExecutor } from '../../../utils/command.js';

describe('set_sim_appearance plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(setSimAppearancePlugin.name).toBe('set_sim_appearance');
    });

    it('should have correct description field', () => {
      expect(setSimAppearancePlugin.description).toBe(
        'Sets the appearance mode (dark/light) of an iOS simulator.',
      );
    });

    it('should have handler function', () => {
      expect(typeof setSimAppearancePlugin.handler).toBe('function');
    });

    it('should have correct schema validation', () => {
      const schema = z.object(setSimAppearancePlugin.schema);

      expect(
        schema.safeParse({
          simulatorUuid: 'abc123',
          mode: 'dark',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          simulatorUuid: 'abc123',
          mode: 'light',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          simulatorUuid: 'abc123',
          mode: 'invalid',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          simulatorUuid: 123,
          mode: 'dark',
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle successful appearance change', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
        error: '',
      });

      const result = await setSimAppearancePlugin.handler(
        {
          simulatorUuid: 'test-uuid-123',
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

      const result = await setSimAppearancePlugin.handler(
        {
          simulatorUuid: 'invalid-uuid',
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

    it('should handle missing simulatorUuid', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
        error: '',
      });

      const result = await setSimAppearancePlugin.handler({ mode: 'dark' }, mockExecutor);

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

      const result = await setSimAppearancePlugin.handler(
        {
          simulatorUuid: 'test-uuid-123',
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
        return Promise.resolve({
          success: true,
          output: '',
          error: '',
          process: { pid: 12345 },
        });
      };

      await setSimAppearancePlugin.handler(
        {
          simulatorUuid: 'test-uuid-123',
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
