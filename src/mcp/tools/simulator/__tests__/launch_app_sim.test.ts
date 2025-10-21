import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';
import { sessionStore } from '../../../../utils/session-store.ts';
import launchAppSim, { launch_app_simLogic } from '../launch_app_sim.ts';

describe('launch_app_sim tool', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should expose correct name and description', () => {
      expect(launchAppSim.name).toBe('launch_app_sim');
      expect(launchAppSim.description).toBe('Launches an app in an iOS simulator.');
    });

    it('should expose only non-session fields in public schema', () => {
      const schema = z.object(launchAppSim.schema);

      expect(
        schema.safeParse({
          bundleId: 'com.example.testapp',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          bundleId: 'com.example.testapp',
          args: ['--debug'],
        }).success,
      ).toBe(true);

      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ bundleId: 123 }).success).toBe(false);
      expect(schema.safeParse({ args: ['--debug'] }).success).toBe(false);

      expect(Object.keys(launchAppSim.schema).sort()).toEqual(['args', 'bundleId'].sort());
    });
  });

  describe('Handler Requirements', () => {
    it('should require simulator identifier when not provided', async () => {
      const result = await launchAppSim.handler({ bundleId: 'com.example.testapp' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('Provide simulatorId or simulatorName');
      expect(result.content[0].text).toContain('session-set-defaults');
    });

    it('should validate bundleId when simulatorId default exists', async () => {
      sessionStore.setDefaults({ simulatorId: 'SIM-UUID' });

      const result = await launchAppSim.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('bundleId: Required');
      expect(result.content[0].text).toContain(
        'Tip: set session defaults via session-set-defaults',
      );
    });

    it('should reject when both simulatorId and simulatorName provided explicitly', async () => {
      const result = await launchAppSim.handler({
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
            text: `✅ App launched successfully in simulator test-uuid-123.

Next Steps:
1. To see simulator: open_sim()
2. Log capture: start_sim_log_cap({ simulatorUuid: "test-uuid-123", bundleId: "com.example.testapp" })
   With console: start_sim_log_cap({ simulatorUuid: "test-uuid-123", bundleId: "com.example.testapp", captureConsole: true })
3. Stop logs: stop_sim_log_cap({ logSessionId: 'SESSION_ID' })`,
          },
        ],
      });
    });

    it('should append additional arguments when provided', async () => {
      let callCount = 0;
      const commands: string[][] = [];

      const sequencedExecutor = async (command: string[]) => {
        commands.push(command);
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

      await launch_app_simLogic(
        {
          simulatorId: 'test-uuid-123',
          bundleId: 'com.example.testapp',
          args: ['--debug', '--verbose'],
        },
        sequencedExecutor,
      );

      expect(commands[1]).toEqual([
        'xcrun',
        'simctl',
        'launch',
        'test-uuid-123',
        'com.example.testapp',
        '--debug',
        '--verbose',
      ]);
    });

    it('should surface app-not-installed error', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'App not found',
      });

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
            text: 'App is not installed on the simulator. Please use install_app_sim before launching.\n\nWorkflow: build → install → launch.',
          },
        ],
        isError: true,
      });
    });

    it('should return launch failure message when simctl launch fails', async () => {
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
        sequencedExecutor,
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
            text: `✅ App launched successfully in simulator "iPhone 16" (resolved-uuid).

Next Steps:
1. To see simulator: open_sim()
2. Log capture: start_sim_log_cap({ simulatorName: "iPhone 16", bundleId: "com.example.testapp" })
   With console: start_sim_log_cap({ simulatorName: "iPhone 16", bundleId: "com.example.testapp", captureConsole: true })
3. Stop logs: stop_sim_log_cap({ logSessionId: 'SESSION_ID' })`,
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
