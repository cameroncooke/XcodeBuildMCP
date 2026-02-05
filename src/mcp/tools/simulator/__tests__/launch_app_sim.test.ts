import { describe, it, expect, beforeEach } from 'vitest';
import * as z from 'zod';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';
import { sessionStore } from '../../../../utils/session-store.ts';
import { schema, handler, launch_app_simLogic } from '../launch_app_sim.ts';

describe('launch_app_sim tool', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should expose only non-session fields in public schema', () => {
      const schemaObj = z.strictObject(schema);

      expect(schemaObj.safeParse({}).success).toBe(true);

      expect(
        schemaObj.safeParse({
          args: ['--debug'],
        }).success,
      ).toBe(true);

      expect(schemaObj.safeParse({ bundleId: 'com.example.testapp' }).success).toBe(false);
      expect(schemaObj.safeParse({ bundleId: 123 }).success).toBe(false);

      expect(Object.keys(schema).sort()).toEqual(['args']);

      const withSimDefaults = schemaObj.safeParse({
        simulatorId: 'sim-default',
        simulatorName: 'iPhone 16',
      });
      expect(withSimDefaults.success).toBe(false);
    });
  });

  describe('Handler Requirements', () => {
    it('should require simulator identifier when not provided', async () => {
      const result = await handler({ bundleId: 'com.example.testapp' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('Provide simulatorId or simulatorName');
      expect(result.content[0].text).toContain('session-set-defaults');
    });

    it('should require bundleId when simulatorId default exists', async () => {
      sessionStore.setDefaults({ simulatorId: 'SIM-UUID' });

      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('bundleId is required');
    });

    it('should reject when both simulatorId and simulatorName provided explicitly', async () => {
      const result = await handler({
        simulatorId: 'SIM-UUID',
        simulatorName: 'iPhone 16',
        bundleId: 'com.example.testapp',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Mutually exclusive parameters provided');
      expect(result.content[0].text).toContain('simulatorId');
      expect(result.content[0].text).toContain('simulatorName');
    });
  });

  describe('Logic Behavior (Literal Returns)', () => {
    it('should launch app successfully with simulatorId', async () => {
      let callCount = 0;
      const sequencedExecutor = async (command: string[]) => {
        callCount++;
        if (callCount === 1) {
          return {
            success: true,
            output: '/path/to/app/container',
            error: '',
            process: {} as any,
          };
        }
        return {
          success: true,
          output: 'App launched successfully',
          error: '',
          process: {} as any,
        };
      };

      const result = await launch_app_simLogic(
        {
          simulatorId: 'test-uuid-123',
          bundleId: 'com.example.testapp',
        },
        sequencedExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'App launched successfully in simulator test-uuid-123.',
          },
        ],
        nextSteps: [
          {
            tool: 'open_sim',
            label: 'Open Simulator app to see it',
            params: {},
            priority: 1,
          },
          {
            tool: 'start_sim_log_cap',
            label: 'Capture structured logs (app continues running)',
            params: { simulatorId: 'test-uuid-123', bundleId: 'com.example.testapp' },
            priority: 2,
          },
          {
            tool: 'start_sim_log_cap',
            label: 'Capture console + structured logs (app restarts)',
            params: {
              simulatorId: 'test-uuid-123',
              bundleId: 'com.example.testapp',
              captureConsole: true,
            },
            priority: 3,
          },
        ],
      });
    });

    it('should append additional arguments when provided', async () => {
      let callCount = 0;
      const commands: string[][] = [];

      const sequencedExecutor = async (command: string[]) => {
        callCount++;
        commands.push(command);
        if (callCount === 1) {
          return {
            success: true,
            output: '/path/to/app/container',
            error: '',
            process: {} as any,
          };
        }
        return {
          success: true,
          output: 'App launched successfully',
          error: '',
          process: {} as any,
        };
      };

      await launch_app_simLogic(
        {
          simulatorId: 'test-uuid-123',
          bundleId: 'com.example.testapp',
          args: ['--debug', '--verbose'],
        },
        sequencedExecutor,
      );

      expect(commands).toEqual([
        ['xcrun', 'simctl', 'get_app_container', 'test-uuid-123', 'com.example.testapp', 'app'],
        [
          'xcrun',
          'simctl',
          'launch',
          'test-uuid-123',
          'com.example.testapp',
          '--debug',
          '--verbose',
        ],
      ]);
    });

    it('should surface error when simulatorId missing after lookup', async () => {
      const result = await launch_app_simLogic(
        {
          simulatorId: undefined,
          bundleId: 'com.example.testapp',
        } as any,
        async () => ({
          success: true,
          output: '',
          error: '',
          process: {} as any,
        }),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'No simulator identifier provided',
          },
        ],
        isError: true,
      });
    });

    it('should detect missing app container on install check', async () => {
      const mockExecutor = async (command: string[]) => {
        if (command.includes('get_app_container')) {
          return {
            success: false,
            output: '',
            error: 'App container not found',
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

      const result = await launch_app_simLogic(
        {
          simulatorId: 'test-uuid-123',
          bundleId: 'com.example.testapp',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `App is not installed on the simulator. Please use install_app_sim before launching.\n\nWorkflow: build → install → launch.`,
          },
        ],
        isError: true,
      });
    });

    it('should return error when install check throws', async () => {
      const mockExecutor = async (command: string[]) => {
        if (command.includes('get_app_container')) {
          throw new Error('Simctl command failed');
        }
        return {
          success: true,
          output: '',
          error: '',
          process: {} as any,
        };
      };

      const result = await launch_app_simLogic(
        {
          simulatorId: 'test-uuid-123',
          bundleId: 'com.example.testapp',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `App is not installed on the simulator (check failed). Please use install_app_sim before launching.\n\nWorkflow: build → install → launch.`,
          },
        ],
        isError: true,
      });
    });

    it('should handle launch failure', async () => {
      let callCount = 0;
      const mockExecutor = async (command: string[]) => {
        callCount++;
        if (callCount === 1) {
          return {
            success: true,
            output: '/path/to/app/container',
            error: '',
            process: {} as any,
          };
        }
        return {
          success: false,
          output: '',
          error: 'Launch failed',
          process: {} as any,
        };
      };

      const result = await launch_app_simLogic(
        {
          simulatorId: 'test-uuid-123',
          bundleId: 'com.example.testapp',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Launch app in simulator operation failed: Launch failed',
          },
        ],
      });
    });

    it('should launch using simulatorName by resolving UUID', async () => {
      let callCount = 0;
      const sequencedExecutor = async (command: string[]) => {
        callCount++;
        if (callCount === 1) {
          return {
            success: true,
            output: JSON.stringify({
              devices: {
                'iOS 17.0': [
                  {
                    name: 'iPhone 16',
                    udid: 'resolved-uuid',
                    isAvailable: true,
                    state: 'Shutdown',
                  },
                ],
              },
            }),
            error: '',
            process: {} as any,
          };
        }
        if (callCount === 2) {
          return {
            success: true,
            output: '/path/to/app/container',
            error: '',
            process: {} as any,
          };
        }
        return {
          success: true,
          output: 'App launched successfully',
          error: '',
          process: {} as any,
        };
      };

      const result = await launch_app_simLogic(
        {
          simulatorName: 'iPhone 16',
          bundleId: 'com.example.testapp',
        },
        sequencedExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'App launched successfully in simulator "iPhone 16" (resolved-uuid).',
          },
        ],
        nextSteps: [
          {
            tool: 'open_sim',
            label: 'Open Simulator app to see it',
            params: {},
            priority: 1,
          },
          {
            tool: 'start_sim_log_cap',
            label: 'Capture structured logs (app continues running)',
            params: { simulatorId: 'resolved-uuid', bundleId: 'com.example.testapp' },
            priority: 2,
          },
          {
            tool: 'start_sim_log_cap',
            label: 'Capture console + structured logs (app restarts)',
            params: {
              simulatorId: 'resolved-uuid',
              bundleId: 'com.example.testapp',
              captureConsole: true,
            },
            priority: 3,
          },
        ],
      });
    });

    it('should return error when simulator name is not found', async () => {
      const mockListExecutor = async () => ({
        success: true,
        output: JSON.stringify({ devices: {} }),
        error: '',
        process: {} as any,
      });

      const result = await launch_app_simLogic(
        {
          simulatorName: 'Missing Simulator',
          bundleId: 'com.example.testapp',
        },
        mockListExecutor,
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

    it('should return error when simctl list fails', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'simctl list failed',
      });

      const result = await launch_app_simLogic(
        {
          simulatorName: 'iPhone 16',
          bundleId: 'com.example.testapp',
        },
        mockExecutor,
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
  });
});
