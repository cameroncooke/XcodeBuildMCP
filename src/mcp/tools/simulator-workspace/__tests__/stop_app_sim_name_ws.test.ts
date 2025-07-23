/**
 * Test for stop_app_sim_name_ws plugin with command generation tests
 *
 * Tests command generation for stopping apps in iOS simulators using simulator name,
 * including parameter validation and response formatting.
 *
 * Uses createMockExecutor for command execution mocking.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  createMockExecutor,
  createMockFileSystemExecutor,
  createNoopExecutor,
} from '../../../../utils/command.js';
import stopAppSimNameWs, { stop_app_sim_name_wsLogic } from '../stop_app_sim_name_ws.ts';

describe('stop_app_sim_name_ws plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(stopAppSimNameWs.name).toBe('stop_app_sim_name_ws');
    });

    it('should have correct description', () => {
      expect(stopAppSimNameWs.description).toBe(
        'Stops an app running in an iOS simulator by simulator name. IMPORTANT: You MUST provide both the simulatorName and bundleId parameters.',
      );
    });

    it('should have handler function', () => {
      expect(typeof stopAppSimNameWs.handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      const schema = z.object(stopAppSimNameWs.schema);
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
        }).success,
      ).toBe(true);
    });

    it('should validate schema with invalid inputs', () => {
      const schema = z.object(stopAppSimNameWs.schema);
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
    it('should generate correct list simulators and terminate commands', async () => {
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
        } else {
          // Second call: terminate command
          return {
            success: true,
            output: '',
            error: undefined,
            process: { pid: 12345 },
          };
        }
      };

      await stop_app_sim_name_wsLogic(
        {
          simulatorName: 'iPhone 16',
          bundleId: 'com.example.app',
        },
        mockExecutor,
      );

      expect(commands).toHaveLength(2);
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
        'terminate',
        'test-uuid-123',
        'com.example.app',
      ]);
      expect(commands[1].logPrefix).toBe('Stop App in Simulator');
      expect(commands[1].useShell).toBe(true);
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
        } else {
          // Second call: terminate command
          return {
            success: true,
            output: '',
            error: undefined,
            process: { pid: 12345 },
          };
        }
      };

      await stop_app_sim_name_wsLogic(
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
        'terminate',
        'F2B4A8E7-9C3D-4E5F-A1B2-C3D4E5F6A7B8',
        'com.apple.mobilesafari',
      ]);
    });

    it('should generate commands with complex bundle identifier', async () => {
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
        } else {
          // Second call: terminate command
          return {
            success: true,
            output: '',
            error: undefined,
            process: { pid: 12345 },
          };
        }
      };

      await stop_app_sim_name_wsLogic(
        {
          simulatorName: 'iPhone 16',
          bundleId: 'com.company.product.subproduct.MyApp',
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
        'terminate',
        'test-uuid-123',
        'com.company.product.subproduct.MyApp',
      ]);
    });

    it('should generate commands with real-world simulator name and UUID format', async () => {
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
                    name: 'iPhone 15 Pro Max',
                    udid: 'ABCDEF12-3456-7890-ABCD-EF1234567890',
                    state: 'Shutdown',
                  },
                ],
              },
            }),
            error: undefined,
            process: { pid: 12345 },
          };
        } else {
          // Second call: terminate command
          return {
            success: true,
            output: '',
            error: undefined,
            process: { pid: 12345 },
          };
        }
      };

      await stop_app_sim_name_wsLogic(
        {
          simulatorName: 'iPhone 15 Pro Max',
          bundleId: 'com.testflight.app',
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
        'terminate',
        'ABCDEF12-3456-7890-ABCD-EF1234567890',
        'com.testflight.app',
      ]);
    });
  });

  describe('Parameter Validation', () => {
    it('should handle validation failure for simulatorName', async () => {
      const result = await stop_app_sim_name_wsLogic(
        {
          bundleId: 'com.example.app',
        },
        createNoopExecutor(),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'simulatorName' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle validation failure for bundleId', async () => {
      const result = await stop_app_sim_name_wsLogic(
        {
          simulatorName: 'iPhone 16',
        },
        createNoopExecutor(),
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
  });

  describe('Response Processing', () => {
    it('should handle successful app termination', async () => {
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
          // Second call: terminate command
          return {
            success: true,
            output: '',
            error: undefined,
            process: { pid: 12345 },
          };
        }
      };

      const result = await stop_app_sim_name_wsLogic(
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
            text: '✅ App com.example.app stopped successfully in simulator iPhone 16 (test-uuid-123)',
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

      const result = await stop_app_sim_name_wsLogic(
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

    it('should handle termination failure', async () => {
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
          // Second call: terminate command fails
          return {
            success: false,
            output: '',
            error: 'No such process',
            process: { pid: 12345 },
          };
        }
      };

      const result = await stop_app_sim_name_wsLogic(
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
            text: 'Stop app in simulator operation failed: No such process',
          },
        ],
        isError: true,
      });
    });

    it('should handle simulator list failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Failed to list simulators',
      });

      const result = await stop_app_sim_name_wsLogic(
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

    it('should handle exception during execution', async () => {
      const mockExecutor = async () => {
        throw new Error('Simulator not found');
      };

      const result = await stop_app_sim_name_wsLogic(
        {
          simulatorName: 'invalid-name',
          bundleId: 'com.example.app',
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
  });
});
