import { describe, it, expect, beforeEach } from 'vitest';
import * as z from 'zod';
import {
  createMockExecutor,
  createMockCommandResponse,
} from '../../../../test-utils/mock-executors.ts';
import type { CommandExecutor } from '../../../../utils/execution/index.ts';
import { sessionStore } from '../../../../utils/session-store.ts';
import plugin, { stop_app_simLogic } from '../stop_app_sim.ts';

describe('stop_app_sim tool', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should expose correct metadata', () => {
      expect(plugin.name).toBe('stop_app_sim');
      expect(plugin.description).toBe('Stop sim app.');
    });

    it('should expose public schema with only bundleId', () => {
      const schema = z.object(plugin.schema);

      expect(schema.safeParse({ bundleId: 'com.example.app' }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ bundleId: 42 }).success).toBe(false);
      expect(Object.keys(plugin.schema)).toEqual(['bundleId']);

      const withSessionDefaults = schema.safeParse({
        simulatorId: 'SIM-UUID',
        simulatorName: 'iPhone 16',
        bundleId: 'com.example.app',
      });
      expect(withSessionDefaults.success).toBe(true);
      const parsed = withSessionDefaults.data as Record<string, unknown>;
      expect(parsed.simulatorId).toBeUndefined();
      expect(parsed.simulatorName).toBeUndefined();
    });
  });

  describe('Handler Requirements', () => {
    it('should require simulator identifier when not provided', async () => {
      const result = await plugin.handler({ bundleId: 'com.example.app' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('Provide simulatorId or simulatorName');
      expect(result.content[0].text).toContain('session-set-defaults');
    });

    it('should validate bundleId when simulatorId default exists', async () => {
      sessionStore.setDefaults({ simulatorId: 'SIM-UUID' });

      const result = await plugin.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain(
        'bundleId: Invalid input: expected string, received undefined',
      );
    });

    it('should reject mutually exclusive simulator parameters', async () => {
      const result = await plugin.handler({
        simulatorId: 'SIM-UUID',
        simulatorName: 'iPhone 16',
        bundleId: 'com.example.app',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Mutually exclusive parameters provided');
      expect(result.content[0].text).toContain('simulatorId');
      expect(result.content[0].text).toContain('simulatorName');
    });
  });

  describe('Logic Behavior (Literal Returns)', () => {
    it('should stop app successfully with simulatorId', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: '' });

      const result = await stop_app_simLogic(
        {
          simulatorId: 'test-uuid',
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

    it('should stop app successfully when resolving simulatorName', async () => {
      let callCount = 0;
      const sequencedExecutor = async (command: string[]) => {
        callCount++;
        if (callCount === 1) {
          return {
            success: true,
            output: JSON.stringify({
              devices: {
                'iOS 17.0': [
                  { name: 'iPhone 16', udid: 'resolved-uuid', isAvailable: true, state: 'Booted' },
                ],
              },
            }),
            error: '',
            process: {} as any,
          };
        }
        return {
          success: true,
          output: '',
          error: '',
          process: {} as any,
        };
      };

      const result = await stop_app_simLogic(
        {
          simulatorName: 'iPhone 16',
          bundleId: 'com.example.App',
        },
        sequencedExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App com.example.App stopped successfully in simulator "iPhone 16" (resolved-uuid)',
          },
        ],
      });
    });

    it('should surface error when simulator name is missing', async () => {
      const result = await stop_app_simLogic(
        {
          simulatorName: 'Missing Simulator',
          bundleId: 'com.example.App',
        },
        async () => ({
          success: true,
          output: JSON.stringify({ devices: {} }),
          error: '',
          process: {} as any,
        }),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Simulator named "Missing Simulator" not found. Use list_sims to see available simulators.',
          },
        ],
        isError: true,
      });
    });

    it('should handle simulator list command failure', async () => {
      const listExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'simctl list failed',
      });

      const result = await stop_app_simLogic(
        {
          simulatorName: 'iPhone 16',
          bundleId: 'com.example.App',
        },
        listExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to list simulators: simctl list failed',
          },
        ],
        isError: true,
      });
    });

    it('should surface terminate failures', async () => {
      const terminateExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Simulator not found',
      });

      const result = await stop_app_simLogic(
        {
          simulatorId: 'invalid-uuid',
          bundleId: 'com.example.App',
        },
        terminateExecutor,
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

    it('should handle unexpected exceptions', async () => {
      const throwingExecutor = async () => {
        throw new Error('Unexpected error');
      };

      const result = await stop_app_simLogic(
        {
          simulatorId: 'test-uuid',
          bundleId: 'com.example.App',
        },
        throwingExecutor,
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

    it('should call correct terminate command', async () => {
      const calls: Array<{
        command: string[];
        logPrefix?: string;
        useShell?: boolean;
        opts?: { env?: Record<string, string>; cwd?: string };
        detached?: boolean;
      }> = [];

      const trackingExecutor: CommandExecutor = async (
        command,
        logPrefix,
        useShell,
        opts,
        detached,
      ) => {
        calls.push({ command, logPrefix, useShell, opts, detached });
        return createMockCommandResponse({
          success: true,
          output: '',
          error: undefined,
        });
      };

      await stop_app_simLogic(
        {
          simulatorId: 'test-uuid',
          bundleId: 'com.example.App',
        },
        trackingExecutor,
      );

      expect(calls).toEqual([
        {
          command: ['xcrun', 'simctl', 'terminate', 'test-uuid', 'com.example.App'],
          logPrefix: 'Stop App in Simulator',
          useShell: true,
          opts: undefined,
          detached: undefined,
        },
      ]);
    });
  });
});
