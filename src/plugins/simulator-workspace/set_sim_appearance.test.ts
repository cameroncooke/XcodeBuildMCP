import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../utils/command.js';

// Import the plugin
import setSimAppearancePlugin from './set_sim_appearance.ts';

describe('set_sim_appearance plugin', () => {
  // Clean setup for each test

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

  describe('Input Validation', () => {
    it('should handle missing simulatorUuid parameter', async () => {
      const result = await setSimAppearancePlugin.handler({
        mode: 'dark',
      });

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

    it('should handle undefined simulatorUuid parameter', async () => {
      const result = await setSimAppearancePlugin.handler({
        simulatorUuid: undefined,
        mode: 'dark',
      });

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

    it('should handle null simulatorUuid parameter', async () => {
      const result = await setSimAppearancePlugin.handler({
        simulatorUuid: null,
        mode: 'dark',
      });

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

    it('should handle empty string simulatorUuid parameter', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Invalid device: empty string',
      });

      const result = await setSimAppearancePlugin.handler(
        {
          simulatorUuid: '',
          mode: 'dark',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to set simulator appearance: Invalid device: empty string',
          },
        ],
      });
    });
  });

  describe('Command Generation', () => {
    it('should generate correct command for dark mode', async () => {
      const executorCalls: any[] = [];
      const mockExecutor = (...args: any[]) => {
        executorCalls.push(args);
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

      expect(executorCalls).toEqual([
        [
          ['xcrun', 'simctl', 'ui', 'test-uuid-123', 'appearance', 'dark'],
          'Set Simulator Appearance',
          true,
          undefined,
        ],
      ]);
    });

    it('should generate correct command for light mode', async () => {
      const executorCalls: any[] = [];
      const mockExecutor = (...args: any[]) => {
        executorCalls.push(args);
        return Promise.resolve({
          success: true,
          output: '',
          error: '',
          process: { pid: 12345 },
        });
      };

      await setSimAppearancePlugin.handler(
        {
          simulatorUuid: 'ABC123-DEF456',
          mode: 'light',
        },
        mockExecutor,
      );

      expect(executorCalls).toEqual([
        [
          ['xcrun', 'simctl', 'ui', 'ABC123-DEF456', 'appearance', 'light'],
          'Set Simulator Appearance',
          true,
          undefined,
        ],
      ]);
    });

    it('should generate correct command with different UUID formats', async () => {
      const executorCalls: any[] = [];
      const mockExecutor = (...args: any[]) => {
        executorCalls.push(args);
        return Promise.resolve({
          success: true,
          output: '',
          error: '',
          process: { pid: 12345 },
        });
      };

      await setSimAppearancePlugin.handler(
        {
          simulatorUuid: 'ABCD1234-5678-9012-3456-789012345678',
          mode: 'dark',
        },
        mockExecutor,
      );

      expect(executorCalls).toEqual([
        [
          ['xcrun', 'simctl', 'ui', 'ABCD1234-5678-9012-3456-789012345678', 'appearance', 'dark'],
          'Set Simulator Appearance',
          true,
          undefined,
        ],
      ]);
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

    it('should handle successful appearance change with light mode', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
        error: '',
      });

      const result = await setSimAppearancePlugin.handler(
        {
          simulatorUuid: 'ABC123-DEF456',
          mode: 'light',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Successfully set simulator ABC123-DEF456 appearance to light mode',
          },
        ],
      });
    });

    it('should handle different error messages', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Device not found',
      });

      const result = await setSimAppearancePlugin.handler(
        {
          simulatorUuid: 'missing-uuid',
          mode: 'dark',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to set simulator appearance: Device not found',
          },
        ],
      });
    });
  });
});
