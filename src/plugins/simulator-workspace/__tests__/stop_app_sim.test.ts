import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor, CommandExecutor } from '../../../utils/command.js';
import plugin from '../stop_app_sim.ts';

describe('stop_app_sim plugin', () => {
  let mockExecutor: CommandExecutor;

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(plugin.name).toBe('stop_app_sim');
    });

    it('should have correct description field', () => {
      expect(plugin.description).toBe(
        'Stops an app running in an iOS simulator. Requires simulatorUuid and bundleId.',
      );
    });

    it('should have handler function', () => {
      expect(typeof plugin.handler).toBe('function');
    });

    it('should have correct schema validation', () => {
      const schema = z.object(plugin.schema);

      expect(
        schema.safeParse({
          simulatorUuid: 'abc123',
          bundleId: 'com.example.app',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          simulatorUuid: 123,
          bundleId: 'com.example.app',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          simulatorUuid: 'abc123',
          bundleId: 123,
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          simulatorUuid: 'abc123',
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should stop app successfully', async () => {
      mockExecutor = createMockExecutor({
        success: true,
        output: '',
      });

      const result = await plugin.handler(
        {
          simulatorUuid: 'test-uuid',
          bundleId: 'com.example.App',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App com.example.App stopped successfully in simulator test-uuid',
          },
        ],
      });
    });

    it('should handle command failure', async () => {
      mockExecutor = createMockExecutor({
        success: false,
        error: 'Simulator not found',
      });

      const result = await plugin.handler(
        {
          simulatorUuid: 'invalid-uuid',
          bundleId: 'com.example.App',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Stop app in simulator operation failed: Simulator not found',
          },
        ],
        isError: true,
      });
    });

    it('should handle missing simulatorUuid', async () => {
      mockExecutor = createMockExecutor({ success: true });

      const result = await plugin.handler(
        {
          simulatorUuid: undefined,
          bundleId: 'com.example.App',
        },
        mockExecutor,
      );

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

    it('should handle missing bundleId', async () => {
      mockExecutor = createMockExecutor({ success: true });

      const result = await plugin.handler(
        { simulatorUuid: 'test-uuid', bundleId: undefined },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'bundleId' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle exception during execution', async () => {
      mockExecutor = async () => {
        throw new Error('Unexpected error');
      };

      const result = await plugin.handler(
        {
          simulatorUuid: 'test-uuid',
          bundleId: 'com.example.App',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Stop app in simulator operation failed: Unexpected error',
          },
        ],
        isError: true,
      });
    });

    it('should call correct command', async () => {
      const executorCalls: any[] = [];
      mockExecutor = async (command, description, suppressOutput, workingDirectory) => {
        executorCalls.push([command, description, suppressOutput, workingDirectory]);
        return {
          success: true,
          output: '',
        };
      };

      await plugin.handler(
        {
          simulatorUuid: 'test-uuid',
          bundleId: 'com.example.App',
        },
        mockExecutor,
      );

      expect(executorCalls).toEqual([
        [
          ['xcrun', 'simctl', 'terminate', 'test-uuid', 'com.example.App'],
          'Stop App in Simulator',
          true,
          undefined,
        ],
      ]);
    });
  });
});
