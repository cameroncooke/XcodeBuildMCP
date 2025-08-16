import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';
import launchAppSim, { launch_app_simLogic } from '../launch_app_sim.ts';

describe('launch_app_sim tool', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(launchAppSim.name).toBe('launch_app_sim');
    });

    it('should have correct description field', () => {
      expect(launchAppSim.description).toBe(
        "Launches an app in an iOS simulator by UUID or name. If simulator window isn't visible, use open_sim() first. IMPORTANT: Provide either simulatorUuid OR simulatorName, plus bundleId. Note: You must install the app in the simulator before launching. The typical workflow is: build → install → launch. Example: launch_app_sim({ simulatorUuid: 'YOUR_UUID_HERE', bundleId: 'com.example.MyApp' }) or launch_app_sim({ simulatorName: 'iPhone 16', bundleId: 'com.example.MyApp' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof launchAppSim.handler).toBe('function');
    });

    it('should have correct schema validation', () => {
      const schema = z.object(launchAppSim.schema);

      expect(
        schema.safeParse({
          simulatorUuid: 'abc123',
          bundleId: 'com.example.app',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          simulatorUuid: 'abc123',
          bundleId: 'com.example.app',
          args: ['--debug', '--verbose'],
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
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle successful app launch', async () => {
      let callCount = 0;
      const mockExecutor = createMockExecutor({});
      const originalExecutor = mockExecutor;

      const sequencedExecutor = async (command: string[], logPrefix?: string) => {
        callCount++;
        if (callCount === 1) {
          // First call - app container check
          return {
            success: true,
            output: '/path/to/app/container',
            error: '',
            process: {} as any,
          };
        } else {
          // Second call - launch command
          return {
            success: true,
            output: 'App launched successfully',
            error: '',
            process: {} as any,
          };
        }
      };

      const result = await launch_app_simLogic(
        {
          simulatorUuid: 'test-uuid-123',
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

    it('should handle app launch with additional arguments', async () => {
      let callCount = 0;
      const commands: string[][] = [];

      const sequencedExecutor = async (command: string[], logPrefix?: string) => {
        commands.push(command);
        callCount++;
        if (callCount === 1) {
          // First call - app container check
          return {
            success: true,
            output: '/path/to/app/container',
            error: '',
            process: {} as any,
          };
        } else {
          // Second call - launch command
          return {
            success: true,
            output: 'App launched successfully',
            error: '',
            process: {} as any,
          };
        }
      };

      const result = await launch_app_simLogic(
        {
          simulatorUuid: 'test-uuid-123',
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

    it('should handle app not installed error', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'App not found',
      });

      const result = await launch_app_simLogic(
        {
          simulatorUuid: 'test-uuid-123',
          bundleId: 'com.example.testapp',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'App is not installed on the simulator. Please use install_app_in_simulator before launching.\n\nWorkflow: build → install → launch.',
          },
        ],
        isError: true,
      });
    });

    it('should handle app launch failure', async () => {
      let callCount = 0;

      const sequencedExecutor = async (command: string[], logPrefix?: string) => {
        callCount++;
        if (callCount === 1) {
          // First call - app container check succeeds
          return {
            success: true,
            output: '/path/to/app/container',
            error: '',
            process: {} as any,
          };
        } else {
          // Second call - launch command fails
          return {
            success: false,
            output: '',
            error: 'Launch failed',
            process: {} as any,
          };
        }
      };

      const result = await launch_app_simLogic(
        {
          simulatorUuid: 'test-uuid-123',
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

    it('should handle validation failures for simulatorUuid', async () => {
      // Test the actual handler which includes Zod validation
      const result = await launchAppSim.handler({
        bundleId: 'com.example.testapp',
        // simulatorUuid is missing
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('simulatorUuid');
      expect(result.content[0].text).toContain('required');
    });

    it('should handle validation failures for bundleId', async () => {
      // Test the actual handler which includes Zod validation
      const result = await launchAppSim.handler({
        simulatorUuid: 'test-uuid-123',
        // bundleId is missing
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('bundleId');
      expect(result.content[0].text).toContain('Required');
    });

    it('should handle command failure during app container check', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Network error',
      });

      const result = await launch_app_simLogic(
        {
          simulatorUuid: 'test-uuid-123',
          bundleId: 'com.example.testapp',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'App is not installed on the simulator. Please use install_app_in_simulator before launching.\n\nWorkflow: build → install → launch.',
          },
        ],
        isError: true,
      });
    });

    it('should handle command failure during launch', async () => {
      let callCount = 0;

      const sequencedExecutor = async (command: string[], logPrefix?: string) => {
        callCount++;
        if (callCount === 1) {
          // First call - app container check succeeds
          return {
            success: true,
            output: '/path/to/app/container',
            error: '',
            process: {} as any,
          };
        } else {
          // Second call - launch command fails
          return {
            success: false,
            output: '',
            error: 'Launch operation failed',
            process: {} as any,
          };
        }
      };

      const result = await launch_app_simLogic(
        {
          simulatorUuid: 'test-uuid-123',
          bundleId: 'com.example.testapp',
        },
        sequencedExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Launch app in simulator operation failed: Launch operation failed',
          },
        ],
      });
    });

    it('should show consistent parameter style in hints based on user input (simulatorName)', async () => {
      // Mock simctl list to return simulator data
      let callCount = 0;
      const sequencedExecutor = async (command: string[], logPrefix?: string) => {
        callCount++;
        if (callCount === 1) {
          // First call - simulator lookup by name
          return {
            success: true,
            output: JSON.stringify({
              devices: {
                'iOS 17.0': [
                  {
                    name: 'iPhone 16',
                    udid: 'test-uuid-456',
                    isAvailable: true,
                    state: 'Shutdown',
                  },
                ],
              },
            }),
            error: '',
            process: {} as any,
          };
        } else if (callCount === 2) {
          // Second call - app container check
          return {
            success: true,
            output: '/path/to/app/container',
            error: '',
            process: {} as any,
          };
        } else {
          // Third call - launch command
          return {
            success: true,
            output: 'App launched successfully',
            error: '',
            process: {} as any,
          };
        }
      };

      const result = await launch_app_simLogic(
        {
          simulatorName: 'iPhone 16', // User provided simulatorName
          bundleId: 'com.example.testapp',
        },
        sequencedExecutor,
      );

      // Verify hints use simulatorName (user's preference) not simulatorUuid
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `✅ App launched successfully in simulator "iPhone 16" (test-uuid-456).

Next Steps:
1. To see simulator: open_sim()
2. Log capture: start_sim_log_cap({ simulatorName: "iPhone 16", bundleId: "com.example.testapp" })
   With console: start_sim_log_cap({ simulatorName: "iPhone 16", bundleId: "com.example.testapp", captureConsole: true })
3. Stop logs: stop_sim_log_cap({ logSessionId: 'SESSION_ID' })`,
          },
        ],
      });
    });
  });
});
