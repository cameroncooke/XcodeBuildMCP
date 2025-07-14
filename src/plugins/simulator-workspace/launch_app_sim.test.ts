import { vi, describe, it, expect } from 'vitest';
import { z } from 'zod';
import launchAppSim from './launch_app_sim.ts';
import { createMockExecutor } from '../../utils/command.js';

describe('launch_app_sim tool', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(launchAppSim.name).toBe('launch_app_sim');
    });

    it('should have correct description field', () => {
      expect(launchAppSim.description).toBe(
        "Launches an app in an iOS simulator. IMPORTANT: You MUST provide both the simulatorUuid and bundleId parameters.\n\nNote: You must install the app in the simulator before launching. The typical workflow is: build → install → launch. Example: launch_app_sim({ simulatorUuid: 'YOUR_UUID_HERE', bundleId: 'com.example.MyApp' })",
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
      const mockExecutor = createMockExecutor({
        success: true,
        output: '/path/to/app/container',
        error: '',
      });

      // Override the executor to handle multiple calls
      const originalExecutor = mockExecutor;
      const multiCallExecutor = async (
        command: string[],
        description?: string,
        isShell?: boolean,
        timeout?: number,
      ) => {
        callCount++;
        if (callCount === 1) {
          // First call: get_app_container check
          return { success: true, output: '/path/to/app/container', error: '' };
        } else {
          // Second call: launch command
          return { success: true, output: 'App launched successfully', error: '' };
        }
      };

      const result = await launchAppSim.handler(
        {
          simulatorUuid: 'test-uuid-123',
          bundleId: 'com.example.testapp',
        },
        multiCallExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'App launched successfully in simulator test-uuid-123',
          },
          {
            type: 'text',
            text: `Next Steps:
1. You can now interact with the app in the simulator.
2. Log capture options:
   - Option 1: Capture structured logs only (app continues running):
     start_sim_log_cap({ simulatorUuid: "test-uuid-123", bundleId: "com.example.testapp" })
   - Option 2: Capture both console and structured logs (app will restart):
     start_sim_log_cap({ simulatorUuid: "test-uuid-123", bundleId: "com.example.testapp", captureConsole: true })
   - Option 3: Restart with logs in one step:
     launch_app_logs_sim({ simulatorUuid: "test-uuid-123", bundleId: "com.example.testapp" })

3. When done with any option, use: stop_sim_log_cap({ logSessionId: 'SESSION_ID' })`,
          },
        ],
      });
    });

    it('should handle app launch with additional arguments', async () => {
      let callCount = 0;
      const commands: string[][] = [];

      const multiCallExecutor = async (
        command: string[],
        description?: string,
        isShell?: boolean,
        timeout?: number,
      ) => {
        commands.push(command);
        callCount++;
        if (callCount === 1) {
          // First call: get_app_container check
          return { success: true, output: '/path/to/app/container', error: '' };
        } else {
          // Second call: launch command
          return { success: true, output: 'App launched successfully', error: '' };
        }
      };

      const result = await launchAppSim.handler(
        {
          simulatorUuid: 'test-uuid-123',
          bundleId: 'com.example.testapp',
          args: ['--debug', '--verbose'],
        },
        multiCallExecutor,
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

      const result = await launchAppSim.handler(
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
      const multiCallExecutor = async (
        command: string[],
        description?: string,
        isShell?: boolean,
        timeout?: number,
      ) => {
        callCount++;
        if (callCount === 1) {
          // First call: get_app_container check succeeds
          return { success: true, output: '/path/to/app/container', error: '' };
        } else {
          // Second call: launch command fails
          return { success: false, output: '', error: 'Launch failed' };
        }
      };

      const result = await launchAppSim.handler(
        {
          simulatorUuid: 'test-uuid-123',
          bundleId: 'com.example.testapp',
        },
        multiCallExecutor,
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
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'App launched successfully',
        error: '',
      });

      const result = await launchAppSim.handler(
        {
          bundleId: 'com.example.testapp',
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

    it('should handle validation failures for bundleId', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'App launched successfully',
        error: '',
      });

      const result = await launchAppSim.handler(
        {
          simulatorUuid: 'test-uuid-123',
        },
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

    it('should handle command failure during app container check', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Network error',
      });

      const result = await launchAppSim.handler(
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
      const multiCallExecutor = async (
        command: string[],
        description?: string,
        isShell?: boolean,
        timeout?: number,
      ) => {
        callCount++;
        if (callCount === 1) {
          // First call: get_app_container check succeeds
          return { success: true, output: '/path/to/app/container', error: '' };
        } else {
          // Second call: launch command fails
          return { success: false, output: '', error: 'Launch operation failed' };
        }
      };

      const result = await launchAppSim.handler(
        {
          simulatorUuid: 'test-uuid-123',
          bundleId: 'com.example.testapp',
        },
        multiCallExecutor,
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
  });
});
