/**
 * Tests for list_sims plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import listSims from '../list_sims.ts';

describe('list_sims plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(listSims.name).toBe('list_sims');
    });

    it('should have correct description', () => {
      expect(listSims.description).toBe('Lists available iOS simulators with their UUIDs. ');
    });

    it('should have handler function', () => {
      expect(typeof listSims.handler).toBe('function');
    });

    it('should have correct schema with enabled boolean field', () => {
      const schema = z.object(listSims.schema);

      // Valid inputs
      expect(schema.safeParse({ enabled: true }).success).toBe(true);
      expect(schema.safeParse({ enabled: false }).success).toBe(true);
      expect(schema.safeParse({ enabled: undefined }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(true);

      // Invalid inputs
      expect(schema.safeParse({ enabled: 'yes' }).success).toBe(false);
      expect(schema.safeParse({ enabled: 1 }).success).toBe(false);
      expect(schema.safeParse({ enabled: null }).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle successful simulator listing', async () => {
      const mockOutput = JSON.stringify({
        devices: {
          'iOS 17.0': [
            {
              name: 'iPhone 15',
              udid: 'test-uuid-123',
              isAvailable: true,
              state: 'Shutdown',
            },
          ],
        },
      });

      const mockExecutor = createMockExecutor({
        success: true,
        output: mockOutput,
      });

      const result = await listSims.handler({ enabled: true }, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Available iOS Simulators:

iOS 17.0:
- iPhone 15 (test-uuid-123)

Next Steps:
1. Boot a simulator: boot_sim({ simulatorUuid: 'UUID_FROM_ABOVE' })
2. Open the simulator UI: open_sim({ enabled: true })
3. Build for simulator: build_ios_sim_id_proj({ scheme: 'YOUR_SCHEME', simulatorId: 'UUID_FROM_ABOVE' })
4. Get app path: get_sim_app_path_id_proj({ scheme: 'YOUR_SCHEME', platform: 'iOS Simulator', simulatorId: 'UUID_FROM_ABOVE' })`,
          },
        ],
      });
    });

    it('should handle successful listing with booted simulator', async () => {
      const mockOutput = JSON.stringify({
        devices: {
          'iOS 17.0': [
            {
              name: 'iPhone 15',
              udid: 'test-uuid-123',
              isAvailable: true,
              state: 'Booted',
            },
          ],
        },
      });

      const mockExecutor = createMockExecutor({
        success: true,
        output: mockOutput,
      });

      const result = await listSims.handler({ enabled: true }, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Available iOS Simulators:

iOS 17.0:
- iPhone 15 (test-uuid-123) [Booted]

Next Steps:
1. Boot a simulator: boot_sim({ simulatorUuid: 'UUID_FROM_ABOVE' })
2. Open the simulator UI: open_sim({ enabled: true })
3. Build for simulator: build_ios_sim_id_proj({ scheme: 'YOUR_SCHEME', simulatorId: 'UUID_FROM_ABOVE' })
4. Get app path: get_sim_app_path_id_proj({ scheme: 'YOUR_SCHEME', platform: 'iOS Simulator', simulatorId: 'UUID_FROM_ABOVE' })`,
          },
        ],
      });
    });

    it('should handle command failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Command failed',
      });

      const result = await listSims.handler({ enabled: true }, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to list simulators: Command failed',
          },
        ],
      });
    });

    it('should handle JSON parse failure', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'invalid json',
      });

      const result = await listSims.handler({ enabled: true }, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'invalid json',
          },
        ],
      });
    });

    it('should handle exception with Error object', async () => {
      const mockExecutor = async () => {
        throw new Error('Command execution failed');
      };

      const result = await listSims.handler({ enabled: true }, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to list simulators: Command execution failed',
          },
        ],
      });
    });

    it('should handle exception with string error', async () => {
      const mockExecutor = async () => {
        throw 'String error';
      };

      const result = await listSims.handler({ enabled: true }, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to list simulators: String error',
          },
        ],
      });
    });

    it('should verify command generation with mock executor', async () => {
      const mockOutput = JSON.stringify({
        devices: {
          'iOS 17.0': [
            {
              name: 'iPhone 15',
              udid: 'test-uuid-123',
              isAvailable: true,
              state: 'Shutdown',
            },
          ],
        },
      });

      const executorCalls: any[] = [];
      const mockExecutor = async (...args: any[]) => {
        executorCalls.push(args);
        return {
          success: true,
          output: mockOutput,
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await listSims.handler({ enabled: true }, mockExecutor);

      expect(executorCalls).toHaveLength(1);
      expect(executorCalls[0]).toEqual([
        ['xcrun', 'simctl', 'list', 'devices', 'available', '--json'],
        'List Simulators',
        true,
        undefined,
      ]);
    });
  });
});
