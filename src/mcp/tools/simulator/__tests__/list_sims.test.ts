import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  createMockExecutor,
  createMockFileSystemExecutor,
} from '../../../../test-utils/mock-executors.ts';

// Import the plugin and logic function
import listSims, { list_simsLogic } from '../list_sims.ts';

describe('list_sims tool', () => {
  let callHistory: Array<{
    command: string[];
    logPrefix?: string;
    useShell?: boolean;
    env?: Record<string, string>;
  }>;

  callHistory = [];

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
      const mockJsonOutput = JSON.stringify({
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

      const mockTextOutput = `== Devices ==
-- iOS 17.0 --
    iPhone 15 (test-uuid-123) (Shutdown)`;

      // Create a mock executor that returns different outputs based on command
      const mockExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command, logPrefix, useShell, env });

        // Return JSON output for JSON command
        if (command.includes('--json')) {
          return {
            success: true,
            output: mockJsonOutput,
            error: undefined,
            process: { pid: 12345 },
          };
        }

        // Return text output for text command
        return {
          success: true,
          output: mockTextOutput,
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const result = await list_simsLogic({ enabled: true }, mockExecutor);

      // Verify both commands were called
      expect(callHistory).toHaveLength(2);
      expect(callHistory[0]).toEqual({
        command: ['xcrun', 'simctl', 'list', 'devices', '--json'],
        logPrefix: 'List Simulators (JSON)',
        useShell: true,
        env: undefined,
      });
      expect(callHistory[1]).toEqual({
        command: ['xcrun', 'simctl', 'list', 'devices'],
        logPrefix: 'List Simulators (Text)',
        useShell: true,
        env: undefined,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Available iOS Simulators:

iOS 17.0:
- iPhone 15 (test-uuid-123)

Next Steps:
1. Boot a simulator: boot_sim({ simulatorId: 'UUID_FROM_ABOVE' })
2. Open the simulator UI: open_sim({})
3. Build for simulator: build_sim({ scheme: 'YOUR_SCHEME', simulatorId: 'UUID_FROM_ABOVE' })
4. Get app path: get_sim_app_path({ scheme: 'YOUR_SCHEME', platform: 'iOS Simulator', simulatorId: 'UUID_FROM_ABOVE' })`,
          },
        ],
      });
    });

    it('should handle successful listing with booted simulator', async () => {
      const mockJsonOutput = JSON.stringify({
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

      const mockTextOutput = `== Devices ==
-- iOS 17.0 --
    iPhone 15 (test-uuid-123) (Booted)`;

      const mockExecutor = async (command: string[]) => {
        if (command.includes('--json')) {
          return {
            success: true,
            output: mockJsonOutput,
            error: undefined,
            process: { pid: 12345 },
          };
        }
        return {
          success: true,
          output: mockTextOutput,
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const result = await list_simsLogic({ enabled: true }, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Available iOS Simulators:

iOS 17.0:
- iPhone 15 (test-uuid-123) [Booted]

Next Steps:
1. Boot a simulator: boot_sim({ simulatorId: 'UUID_FROM_ABOVE' })
2. Open the simulator UI: open_sim({})
3. Build for simulator: build_sim({ scheme: 'YOUR_SCHEME', simulatorId: 'UUID_FROM_ABOVE' })
4. Get app path: get_sim_app_path({ scheme: 'YOUR_SCHEME', platform: 'iOS Simulator', simulatorId: 'UUID_FROM_ABOVE' })`,
          },
        ],
      });
    });

    it('should merge devices from text that are missing from JSON', async () => {
      const mockJsonOutput = JSON.stringify({
        devices: {
          'iOS 18.6': [
            {
              name: 'iPhone 15',
              udid: 'json-uuid-123',
              isAvailable: true,
              state: 'Shutdown',
            },
          ],
        },
      });

      const mockTextOutput = `== Devices ==
-- iOS 18.6 --
    iPhone 15 (json-uuid-123) (Shutdown)
-- iOS 26.0 --
    iPhone 17 Pro (text-uuid-456) (Shutdown)`;

      const mockExecutor = async (command: string[]) => {
        if (command.includes('--json')) {
          return {
            success: true,
            output: mockJsonOutput,
            error: undefined,
            process: { pid: 12345 },
          };
        }
        return {
          success: true,
          output: mockTextOutput,
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const result = await list_simsLogic({ enabled: true }, mockExecutor);

      // Should contain both iOS 18.6 from JSON and iOS 26.0 from text
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Available iOS Simulators:

iOS 18.6:
- iPhone 15 (json-uuid-123)

iOS 26.0:
- iPhone 17 Pro (text-uuid-456)

Next Steps:
1. Boot a simulator: boot_sim({ simulatorId: 'UUID_FROM_ABOVE' })
2. Open the simulator UI: open_sim({})
3. Build for simulator: build_sim({ scheme: 'YOUR_SCHEME', simulatorId: 'UUID_FROM_ABOVE' })
4. Get app path: get_sim_app_path({ scheme: 'YOUR_SCHEME', platform: 'iOS Simulator', simulatorId: 'UUID_FROM_ABOVE' })`,
          },
        ],
      });
    });

    it('should handle command failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Command failed',
        process: { pid: 12345 },
      });

      const result = await list_simsLogic({ enabled: true }, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to list simulators: Command failed',
          },
        ],
      });
    });

    it('should handle JSON parse failure and fall back to text parsing', async () => {
      const mockTextOutput = `== Devices ==
-- iOS 17.0 --
    iPhone 15 (test-uuid-456) (Shutdown)`;

      const mockExecutor = async (command: string[]) => {
        // JSON command returns invalid JSON
        if (command.includes('--json')) {
          return {
            success: true,
            output: 'invalid json',
            error: undefined,
            process: { pid: 12345 },
          };
        }

        // Text command returns valid text output
        return {
          success: true,
          output: mockTextOutput,
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const result = await list_simsLogic({ enabled: true }, mockExecutor);

      // Should fall back to text parsing and extract devices
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `Available iOS Simulators:

iOS 17.0:
- iPhone 15 (test-uuid-456)

Next Steps:
1. Boot a simulator: boot_sim({ simulatorId: 'UUID_FROM_ABOVE' })
2. Open the simulator UI: open_sim({})
3. Build for simulator: build_sim({ scheme: 'YOUR_SCHEME', simulatorId: 'UUID_FROM_ABOVE' })
4. Get app path: get_sim_app_path({ scheme: 'YOUR_SCHEME', platform: 'iOS Simulator', simulatorId: 'UUID_FROM_ABOVE' })`,
          },
        ],
      });
    });

    it('should handle exception with Error object', async () => {
      const mockExecutor = createMockExecutor(new Error('Command execution failed'));

      const result = await list_simsLogic({ enabled: true }, mockExecutor);

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
      const mockExecutor = createMockExecutor('String error');

      const result = await list_simsLogic({ enabled: true }, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to list simulators: String error',
          },
        ],
      });
    });
  });
});
