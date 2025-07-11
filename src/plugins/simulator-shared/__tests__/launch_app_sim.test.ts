import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import launchAppSim from '../launch_app_sim.ts';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('../../utils/index.js', () => ({
  executeCommand: vi.fn(),
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
  validateFileExists: vi.fn(),
  startLogCapture: vi.fn(),
  createTextResponse: vi.fn(),
  createErrorResponse: vi.fn(),
}));

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

  let mockExecuteCommand: MockedFunction<any>;
  let mockValidateRequiredParam: MockedFunction<any>;

  beforeEach(async () => {
    const { executeCommand, validateRequiredParam } = await import('../../../utils/index.js');
    mockExecuteCommand = executeCommand as MockedFunction<any>;
    mockExecuteCommand.mockResolvedValue({
      success: true,
      output: 'App launched successfully',
      error: '',
    });

    mockValidateRequiredParam = validateRequiredParam as MockedFunction<any>;

    mockValidateRequiredParam.mockReturnValue({
      isValid: true,
      errorResponse: null,
    });

    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle successful app launch', async () => {
      mockExecuteCommand
        .mockResolvedValueOnce({
          success: true,
          output: '/path/to/app/container',
          error: '',
        })
        .mockResolvedValueOnce({
          success: true,
          output: 'App launched successfully',
          error: '',
        });

      const result = await launchAppSim.handler({
        simulatorUuid: 'test-uuid-123',
        bundleId: 'com.example.testapp',
      });

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
      mockExecuteCommand
        .mockResolvedValueOnce({
          success: true,
          output: '/path/to/app/container',
          error: '',
        })
        .mockResolvedValueOnce({
          success: true,
          output: 'App launched successfully',
          error: '',
        });

      const result = await launchAppSim.handler({
        simulatorUuid: 'test-uuid-123',
        bundleId: 'com.example.testapp',
        args: ['--debug', '--verbose'],
      });

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        [
          'xcrun',
          'simctl',
          'launch',
          'test-uuid-123',
          'com.example.testapp',
          '--debug',
          '--verbose',
        ],
        'Launch App in Simulator',
      );
    });

    it('should handle app not installed error', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'App not found',
      });

      const result = await launchAppSim.handler({
        simulatorUuid: 'test-uuid-123',
        bundleId: 'com.example.testapp',
      });

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
      mockExecuteCommand
        .mockResolvedValueOnce({
          success: true,
          output: '/path/to/app/container',
          error: '',
        })
        .mockResolvedValueOnce({
          success: false,
          output: '',
          error: 'Launch failed',
        });

      const result = await launchAppSim.handler({
        simulatorUuid: 'test-uuid-123',
        bundleId: 'com.example.testapp',
      });

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
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'simulatorUuid is required' }],
          isError: true,
        },
      });

      const result = await launchAppSim.handler({
        simulatorUuid: '',
        bundleId: 'com.example.testapp',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'simulatorUuid is required' }],
        isError: true,
      });
    });

    it('should handle validation failures for bundleId', async () => {
      mockValidateRequiredParam
        .mockReturnValueOnce({
          isValid: true,
          errorResponse: null,
        })
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [{ type: 'text', text: 'bundleId is required' }],
            isError: true,
          },
        });

      const result = await launchAppSim.handler({
        simulatorUuid: 'test-uuid-123',
        bundleId: '',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'bundleId is required' }],
        isError: true,
      });
    });

    it('should handle command failure during app container check', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Network error',
      });

      const result = await launchAppSim.handler({
        simulatorUuid: 'test-uuid-123',
        bundleId: 'com.example.testapp',
      });

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
      mockExecuteCommand
        .mockResolvedValueOnce({
          success: true,
          output: '/path/to/app/container',
          error: '',
        })
        .mockResolvedValueOnce({
          success: false,
          output: '',
          error: 'Launch operation failed',
        });

      const result = await launchAppSim.handler({
        simulatorUuid: 'test-uuid-123',
        bundleId: 'com.example.testapp',
      });

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
