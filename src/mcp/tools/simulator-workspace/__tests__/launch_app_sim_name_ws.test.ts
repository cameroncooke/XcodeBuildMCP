/**
 * Test for launch_app_sim_name_ws plugin with command generation tests
 *
 * Tests command generation for launching apps in iOS simulators using simulator name,
 * including parameter validation and response formatting.
 *
 * Uses createMockExecutor for command execution mocking.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor, createMockFileSystemExecutor } from '../../../../utils/command.js';
import launchAppSimNameWs, { launch_app_sim_name_wsLogic } from '../launch_app_sim_name_ws.ts';

describe('launch_app_sim_name_ws plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(launchAppSimNameWs.name).toBe('launch_app_sim_name_ws');
    });

    it('should have correct description', () => {
      expect(launchAppSimNameWs.description).toBe(
        "Launches an app in an iOS simulator by simulator name. IMPORTANT: You MUST provide both the simulatorName and bundleId parameters.\n\nNote: You must install the app in the simulator before launching. The typical workflow is: build → install → launch. Example: launch_app_sim_name_ws({ simulatorName: 'iPhone 16', bundleId: 'com.example.MyApp' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof launchAppSimNameWs.handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      const schema = z.object(launchAppSimNameWs.schema);
      expect(
        schema.safeParse({
          simulatorName: 'iPhone 16',
          bundleId: 'com.example.app',
        }).success,
      ).toBe(true);
      expect(
        schema.safeParse({
          simulatorName: 'iPhone 16 Pro',
          bundleId: 'com.apple.calculator',
          args: ['--debug', '--verbose'],
        }).success,
      ).toBe(true);
    });

    it('should validate schema with invalid inputs', () => {
      const schema = z.object(launchAppSimNameWs.schema);
      expect(schema.safeParse({}).success).toBe(false);
      expect(
        schema.safeParse({
          simulatorName: null,
          bundleId: 'com.example.app',
        }).success,
      ).toBe(false);
      expect(
        schema.safeParse({
          simulatorName: 'iPhone 16',
          bundleId: null,
        }).success,
      ).toBe(false);
      expect(
        schema.safeParse({
          simulatorName: 123,
          bundleId: 'com.example.app',
        }).success,
      ).toBe(false);
    });
  });

  describe('Command Generation', () => {
    it('should generate correct list simulators, get_app_container and launch commands', async () => {
      const commands: any[] = [];
      let callCount = 0;
      const mockExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        timeout?: number,
      ) => {
        commands.push({ command, logPrefix, useShell, timeout });
        callCount++;
        if (callCount === 1) {
          // First call: list simulators
          return {
            success: true,
            output: JSON.stringify({
              devices: {
                'com.apple.CoreSimulator.SimRuntime.iOS-17-5': [
                  {
                    name: 'iPhone 16',
                    udid: 'test-uuid-123',
                    state: 'Shutdown',
                  },
                ],
              },
            }),
            error: undefined,
            process: { pid: 12345 },
          };
        } else if (callCount === 2) {
          // Second call: get_app_container check
          return {
            success: true,
            output: '/path/to/app/container',
            error: undefined,
            process: { pid: 12345 },
          };
        } else {
          // Third call: launch command
          return {
            success: true,
            output: 'App launched successfully',
            error: undefined,
            process: { pid: 12345 },
          };
        }
      };

      await launch_app_sim_name_wsLogic(
        {
          simulatorName: 'iPhone 16',
          bundleId: 'com.example.app',
        },
        mockExecutor,
      );

      expect(commands).toHaveLength(3);
      expect(commands[0].command).toEqual([
        'xcrun',
        'simctl',
        'list',
        'devices',
        'available',
        '--json',
      ]);
      expect(commands[0].logPrefix).toBe('List Simulators');
      expect(commands[0].useShell).toBe(true);

      expect(commands[1].command).toEqual([
        'xcrun',
        'simctl',
        'get_app_container',
        'test-uuid-123',
        'com.example.app',
        'app',
      ]);
      expect(commands[1].logPrefix).toBe('Check App Installed');
      expect(commands[1].useShell).toBe(true);

      expect(commands[2].command).toEqual([
        'xcrun',
        'simctl',
        'launch',
        'test-uuid-123',
        'com.example.app',
      ]);
      expect(commands[2].logPrefix).toBe('Launch App in Simulator');
      expect(commands[2].useShell).toBe(true);
    });

    it('should generate launch command with additional arguments', async () => {
      const commands: any[] = [];
      let callCount = 0;
      const mockExecutor = async (command: string[]) => {
        commands.push({ command });
        callCount++;
        if (callCount === 1) {
          // First call: list simulators
          return {
            success: true,
            output: JSON.stringify({
              devices: {
                'com.apple.CoreSimulator.SimRuntime.iOS-17-5': [
                  {
                    name: 'iPhone 16',
                    udid: 'test-uuid-123',
                    state: 'Shutdown',
                  },
                ],
              },
            }),
            error: undefined,
            process: { pid: 12345 },
          };
        } else if (callCount === 2) {
          // Second call: get_app_container check
          return {
            success: true,
            output: '/path/to/app/container',
            error: undefined,
            process: { pid: 12345 },
          };
        } else {
          // Third call: launch command
          return {
            success: true,
            output: 'App launched successfully',
            error: undefined,
            process: { pid: 12345 },
          };
        }
      };

      await launch_app_sim_name_wsLogic(
        {
          simulatorName: 'iPhone 16',
          bundleId: 'com.example.app',
          args: ['--debug', '--verbose'],
        },
        mockExecutor,
      );

      expect(commands[2].command).toEqual([
        'xcrun',
        'simctl',
        'launch',
        'test-uuid-123',
        'com.example.app',
        '--debug',
        '--verbose',
      ]);
    });

    it('should generate commands with different simulator name and bundle ID', async () => {
      const commands: any[] = [];
      let callCount = 0;
      const mockExecutor = async (command: string[]) => {
        commands.push({ command });
        callCount++;
        if (callCount === 1) {
          // First call: list simulators
          return {
            success: true,
            output: JSON.stringify({
              devices: {
                'com.apple.CoreSimulator.SimRuntime.iOS-17-5': [
                  {
                    name: 'iPhone 16 Pro',
                    udid: 'F2B4A8E7-9C3D-4E5F-A1B2-C3D4E5F6A7B8',
                    state: 'Shutdown',
                  },
                ],
              },
            }),
            error: undefined,
            process: { pid: 12345 },
          };
        } else if (callCount === 2) {
          // Second call: get_app_container check
          return {
            success: true,
            output: '/path/to/app/container',
            error: undefined,
            process: { pid: 12345 },
          };
        } else {
          // Third call: launch command
          return {
            success: true,
            output: 'App launched successfully',
            error: undefined,
            process: { pid: 12345 },
          };
        }
      };

      await launch_app_sim_name_wsLogic(
        {
          simulatorName: 'iPhone 16 Pro',
          bundleId: 'com.apple.mobilesafari',
        },
        mockExecutor,
      );

      expect(commands[0].command).toEqual([
        'xcrun',
        'simctl',
        'list',
        'devices',
        'available',
        '--json',
      ]);
      expect(commands[1].command).toEqual([
        'xcrun',
        'simctl',
        'get_app_container',
        'F2B4A8E7-9C3D-4E5F-A1B2-C3D4E5F6A7B8',
        'com.apple.mobilesafari',
        'app',
      ]);
      expect(commands[2].command).toEqual([
        'xcrun',
        'simctl',
        'launch',
        'F2B4A8E7-9C3D-4E5F-A1B2-C3D4E5F6A7B8',
        'com.apple.mobilesafari',
      ]);
    });

    it('should generate commands with complex arguments array', async () => {
      const commands: any[] = [];
      let callCount = 0;
      const mockExecutor = async (command: string[]) => {
        commands.push({ command });
        callCount++;
        if (callCount === 1) {
          // First call: list simulators
          return {
            success: true,
            output: JSON.stringify({
              devices: {
                'com.apple.CoreSimulator.SimRuntime.iOS-17-5': [
                  {
                    name: 'iPhone 16',
                    udid: 'test-uuid-123',
                    state: 'Shutdown',
                  },
                ],
              },
            }),
            error: undefined,
            process: { pid: 12345 },
          };
        } else if (callCount === 2) {
          // Second call: get_app_container check
          return {
            success: true,
            output: '/path/to/app/container',
            error: undefined,
            process: { pid: 12345 },
          };
        } else {
          // Third call: launch command
          return {
            success: true,
            output: 'App launched successfully',
            error: undefined,
            process: { pid: 12345 },
          };
        }
      };

      await launch_app_sim_name_wsLogic(
        {
          simulatorName: 'iPhone 16',
          bundleId: 'com.example.app',
          args: ['--config', '/path/to/config.json', '--log-level', 'debug', '--port', '8080'],
        },
        mockExecutor,
      );

      expect(commands[2].command).toEqual([
        'xcrun',
        'simctl',
        'launch',
        'test-uuid-123',
        'com.example.app',
        '--config',
        '/path/to/config.json',
        '--log-level',
        'debug',
        '--port',
        '8080',
      ]);
    });
  });

  describe('Response Processing', () => {
    it('should handle successful app launch', async () => {
      let callCount = 0;
      const mockExecutor = async () => {
        callCount++;
        if (callCount === 1) {
          // First call: list simulators
          return {
            success: true,
            output: JSON.stringify({
              devices: {
                'com.apple.CoreSimulator.SimRuntime.iOS-17-5': [
                  {
                    name: 'iPhone 16',
                    udid: 'test-uuid-123',
                    state: 'Shutdown',
                  },
                ],
              },
            }),
            error: undefined,
            process: { pid: 12345 },
          };
        } else if (callCount === 2) {
          // Second call: get_app_container check
          return {
            success: true,
            output: '/path/to/app/container',
            error: undefined,
            process: { pid: 12345 },
          };
        } else {
          // Third call: launch command
          return {
            success: true,
            output: 'App launched successfully',
            error: undefined,
            process: { pid: 12345 },
          };
        }
      };

      const result = await launch_app_sim_name_wsLogic(
        {
          simulatorName: 'iPhone 16',
          bundleId: 'com.example.app',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'App launched successfully in simulator iPhone 16 (test-uuid-123)',
          },
          {
            type: 'text',
            text: `Next Steps:
1. You can now interact with the app in the simulator.
2. Log capture options:
   - Option 1: Capture structured logs only (app continues running):
     start_sim_log_cap({ simulatorUuid: "test-uuid-123", bundleId: "com.example.app" })
   - Option 2: Capture both console and structured logs (app will restart):
     start_sim_log_cap({ simulatorUuid: "test-uuid-123", bundleId: "com.example.app", captureConsole: true })
   - Option 3: Restart with logs in one step:
     launch_app_logs_sim({ simulatorUuid: "test-uuid-123", bundleId: "com.example.app" })

3. When done with any option, use: stop_sim_log_cap({ logSessionId: 'SESSION_ID' })`,
          },
        ],
      });
    });

    it('should handle simulator not found error', async () => {
      const mockExecutor = async () => {
        return {
          success: true,
          output: JSON.stringify({
            devices: {
              'com.apple.CoreSimulator.SimRuntime.iOS-17-5': [
                {
                  name: 'iPhone 15',
                  udid: 'other-uuid',
                  state: 'Shutdown',
                },
              ],
            },
          }),
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const result = await launch_app_sim_name_wsLogic(
        {
          simulatorName: 'iPhone 16',
          bundleId: 'com.example.app',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Could not find an available simulator named 'iPhone 16'. Use list_simulators({}) to check available devices.",
          },
        ],
        isError: true,
      });
    });

    it('should handle app not installed error', async () => {
      let callCount = 0;
      const mockExecutor = async () => {
        callCount++;
        if (callCount === 1) {
          // First call: list simulators
          return {
            success: true,
            output: JSON.stringify({
              devices: {
                'com.apple.CoreSimulator.SimRuntime.iOS-17-5': [
                  {
                    name: 'iPhone 16',
                    udid: 'test-uuid-123',
                    state: 'Shutdown',
                  },
                ],
              },
            }),
            error: undefined,
            process: { pid: 12345 },
          };
        } else {
          // Second call: get_app_container check fails
          return {
            success: false,
            output: '',
            error: 'App not found',
            process: { pid: 12345 },
          };
        }
      };

      const result = await launch_app_sim_name_wsLogic(
        {
          simulatorName: 'iPhone 16',
          bundleId: 'com.example.app',
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

    it('should handle launch failure', async () => {
      let callCount = 0;
      const mockExecutor = async () => {
        callCount++;
        if (callCount === 1) {
          // First call: list simulators
          return {
            success: true,
            output: JSON.stringify({
              devices: {
                'com.apple.CoreSimulator.SimRuntime.iOS-17-5': [
                  {
                    name: 'iPhone 16',
                    udid: 'test-uuid-123',
                    state: 'Shutdown',
                  },
                ],
              },
            }),
            error: undefined,
            process: { pid: 12345 },
          };
        } else if (callCount === 2) {
          // Second call: get_app_container check succeeds
          return {
            success: true,
            output: '/path/to/app/container',
            error: undefined,
            process: { pid: 12345 },
          };
        } else {
          // Third call: launch command fails
          return {
            success: false,
            output: '',
            error: 'Launch failed',
            process: { pid: 12345 },
          };
        }
      };

      const result = await launch_app_sim_name_wsLogic(
        {
          simulatorName: 'iPhone 16',
          bundleId: 'com.example.app',
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

    it('should handle simulator list failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Failed to list simulators',
      });

      const result = await launch_app_sim_name_wsLogic(
        {
          simulatorName: 'iPhone 16',
          bundleId: 'com.example.app',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to list simulators: Failed to list simulators',
          },
        ],
        isError: true,
      });
    });
  });
});
