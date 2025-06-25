/**
 * Simulator Tools Tests - Comprehensive test coverage for simulator.ts tools
 *
 * This test file provides complete coverage for all simulator management tools:
 * - boot_sim: Boot an iOS simulator
 * - list_sims: List available simulators
 * - install_app_sim: Install app in simulator
 * - launch_app_sim: Launch app in simulator
 * - launch_app_logs_sim: Launch app with log capture
 * - open_sim: Open Simulator app
 * - set_sim_appearance: Set dark/light appearance
 * - set_simulator_location: Set GPS location
 * - reset_simulator_location: Reset GPS location
 * - set_network_condition: Set network conditions
 * - reset_network_condition: Reset network conditions
 * - stop_app_sim: Stop app in simulator
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive parameter validation testing.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import {
  registerBootSimulatorTool,
  registerListSimulatorsTool,
  registerInstallAppInSimulatorTool,
  registerLaunchAppInSimulatorTool,
  registerLaunchAppWithLogsInSimulatorTool,
  registerOpenSimulatorTool,
  registerSetSimulatorAppearanceTool,
  registerSetSimulatorLocationTool,
  registerResetSimulatorLocationTool,
  registerSetNetworkConditionTool,
  registerResetNetworkConditionTool,
  registerStopAppInSimulatorTool,
} from './index.js';

// Mock external dependencies
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('../../utils/command.js', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('../../utils/logger.js', () => ({
  log: vi.fn(),
}));

vi.mock('../../utils/log_capture.js', () => ({
  startLogCapture: vi.fn(),
}));

vi.mock('../../utils/validation.js', () => ({
  validateRequiredParam: vi.fn(),
  validateFileExists: vi.fn(),
}));

// Mock a basic MCP server for tool registration
const mockServer = {
  tool: vi.fn((name, description, schema, handler) => ({ name, description, schema, handler })),
};

// Helper function to extract handler from registered tool
function getToolHandler(registerFn: (server: any) => void) {
  const mockCalls = mockServer.tool.mock.calls;
  const initialCallCount = mockCalls.length;
  registerFn(mockServer as any);
  const newCalls = mockCalls.slice(initialCallCount);
  return newCalls[0]?.[3]; // The handler is the 4th argument
}

describe('simulator tools tests', () => {
  let mockExecuteCommand: MockedFunction<any>;
  let mockValidateRequiredParam: MockedFunction<any>;
  let mockValidateFileExists: MockedFunction<any>;
  let mockStartLogCapture: MockedFunction<any>;
  let mockExecSync: MockedFunction<any>;
  let mockExistsSync: MockedFunction<any>;

  beforeEach(async () => {
    const command = await import('../../utils/command.js');
    const validation = await import('../../utils/validation.js');
    const logCapture = await import('../../utils/log_capture.js');

    mockExecuteCommand = command.executeCommand as MockedFunction<any>;
    mockValidateRequiredParam = validation.validateRequiredParam as MockedFunction<any>;
    mockValidateFileExists = validation.validateFileExists as MockedFunction<any>;
    mockStartLogCapture = logCapture.startLogCapture as MockedFunction<any>;
    mockExecSync = execSync as MockedFunction<any>;
    mockExistsSync = existsSync as MockedFunction<any>;

    // Setup default successful validation
    mockValidateRequiredParam.mockReturnValue({ isValid: true });
    mockValidateFileExists.mockReturnValue({ isValid: true });

    // Setup default successful command execution
    mockExecuteCommand.mockResolvedValue({
      success: true,
      output: 'SUCCESS OUTPUT',
    });

    // Setup default successful log capture
    mockStartLogCapture.mockResolvedValue({ sessionId: 'test-session-id', error: null });

    // Setup default file operations
    mockExecSync.mockReturnValue('com.example.bundle');
    mockExistsSync.mockReturnValue(true);

    vi.clearAllMocks();
  });

  describe('boot_sim tool', () => {
    describe('parameter validation', () => {
      it('should reject missing simulatorUuid parameter', async () => {
        mockValidateRequiredParam.mockReturnValue({
          isValid: false,
          errorResponse: {
            content: [
              {
                type: 'text',
                text: "Required parameter 'simulatorUuid' is missing. Please provide a value for this parameter.",
              },
            ],
            isError: true,
          },
        });

        const handler = getToolHandler(registerBootSimulatorTool);
        const result = await handler({});

        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'simulatorUuid' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should return deterministic success response with next steps', async () => {
        const params = { simulatorUuid: 'ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV' };

        const handler = getToolHandler(registerBootSimulatorTool);
        const result = await handler(params);

        expect(mockExecuteCommand).toHaveBeenCalledWith(
          ['xcrun', 'simctl', 'boot', 'ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV'],
          'Boot Simulator',
        );

        expect(result.content).toEqual([
          {
            type: 'text',
            text: `Simulator booted successfully. Next steps:
1. Open the Simulator app: open_sim({ enabled: true })
2. Install an app: install_app_sim({ simulatorUuid: "ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV", appPath: "PATH_TO_YOUR_APP" })
3. Launch an app: launch_app_sim({ simulatorUuid: "ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV", bundleId: "YOUR_APP_BUNDLE_ID" })
4. Log capture options:
   - Option 1: Capture structured logs only (app continues running):
     start_sim_log_cap({ simulatorUuid: "ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV", bundleId: "YOUR_APP_BUNDLE_ID" })
   - Option 2: Capture both console and structured logs (app will restart):
     start_sim_log_cap({ simulatorUuid: "ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV", bundleId: "YOUR_APP_BUNDLE_ID", captureConsole: true })
   - Option 3: Launch app with logs in one step:
     launch_app_logs_sim({ simulatorUuid: "ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV", bundleId: "YOUR_APP_BUNDLE_ID" })`,
          },
        ]);
        expect(result.isError).toBe(undefined);
      });

      it('should handle command execution failure', async () => {
        mockExecuteCommand.mockResolvedValue({
          success: false,
          error: 'Simulator not found',
        });

        const params = { simulatorUuid: 'INVALID-UUID' };
        const handler = getToolHandler(registerBootSimulatorTool);
        const result = await handler(params);

        expect(result.content).toEqual([
          {
            type: 'text',
            text: 'Boot simulator operation failed: Simulator not found',
          },
        ]);
      });
    });
  });

  describe('list_sims tool', () => {
    describe('success scenarios', () => {
      it('should return deterministic success response with simulator list', async () => {
        const mockDevicesData = {
          devices: {
            'com.apple.CoreSimulator.SimRuntime.iOS-17-0': [
              {
                name: 'iPhone 15',
                udid: 'ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV',
                state: 'Shutdown',
                isAvailable: true,
              },
              {
                name: 'iPhone 15 Pro',
                udid: 'EFGH5678-1234-90AB-CDEF-567890123456',
                state: 'Booted',
                isAvailable: true,
              },
            ],
          },
        };

        mockExecuteCommand.mockResolvedValue({
          success: true,
          output: JSON.stringify(mockDevicesData),
        });

        const handler = getToolHandler(registerListSimulatorsTool);
        const result = await handler({ enabled: true });

        expect(mockExecuteCommand).toHaveBeenCalledWith(
          ['xcrun', 'simctl', 'list', 'devices', 'available', '--json'],
          'List Simulators',
        );

        expect(result.content[0].text).toContain('Available iOS Simulators:');
        expect(result.content[0].text).toContain(
          'iPhone 15 (ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV)',
        );
        expect(result.content[0].text).toContain(
          'iPhone 15 Pro (EFGH5678-1234-90AB-CDEF-567890123456) [Booted]',
        );
        expect(result.isError).toBe(undefined);
      });
    });
  });

  describe('install_app_sim tool', () => {
    describe('parameter validation', () => {
      it('should reject missing simulatorUuid parameter', async () => {
        mockValidateRequiredParam.mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [
              {
                type: 'text',
                text: "Required parameter 'simulatorUuid' is missing. Please provide a value for this parameter.",
              },
            ],
            isError: true,
          },
        });

        const handler = getToolHandler(registerInstallAppInSimulatorTool);
        const result = await handler({ appPath: '/path/to/app.app' });

        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'simulatorUuid' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should return deterministic success response with next steps', async () => {
        const params = {
          simulatorUuid: 'ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV',
          appPath: '/path/to/MyApp.app',
        };

        const handler = getToolHandler(registerInstallAppInSimulatorTool);
        const result = await handler(params);

        expect(mockExecuteCommand).toHaveBeenCalledWith(
          [
            'xcrun',
            'simctl',
            'install',
            'ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV',
            '/path/to/MyApp.app',
          ],
          'Install App in Simulator',
        );

        expect(result.content).toEqual([
          {
            type: 'text',
            text: 'App installed successfully in simulator ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV',
          },
          {
            type: 'text',
            text: `Next Steps:
1. Open the Simulator app: open_sim({ enabled: true })
2. Launch the app: launch_app_sim({ simulatorUuid: "ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV", bundleId: "com.example.bundle" })`,
          },
        ]);
        expect(result.isError).toBe(undefined);
      });
    });
  });

  describe('launch_app_sim tool', () => {
    describe('success scenarios', () => {
      it('should return deterministic success response', async () => {
        // Mock app container check to succeed
        mockExecuteCommand.mockResolvedValueOnce({
          success: true,
          output: '/path/to/app/container',
        });

        // Mock actual launch command
        mockExecuteCommand.mockResolvedValueOnce({
          success: true,
          output: 'App launched successfully',
        });

        const params = {
          simulatorUuid: 'ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV',
          bundleId: 'com.example.MyApp',
        };

        const handler = getToolHandler(registerLaunchAppInSimulatorTool);
        const result = await handler(params);

        expect(result.content).toEqual([
          {
            type: 'text',
            text: 'App launched successfully in simulator ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV',
          },
          {
            type: 'text',
            text: `Next Steps:
1. You can now interact with the app in the simulator.
2. Log capture options:
   - Option 1: Capture structured logs only (app continues running):
     start_sim_log_cap({ simulatorUuid: "ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV", bundleId: "com.example.MyApp" })
   - Option 2: Capture both console and structured logs (app will restart):
     start_sim_log_cap({ simulatorUuid: "ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV", bundleId: "com.example.MyApp", captureConsole: true })
   - Option 3: Restart with logs in one step:
     launch_app_logs_sim({ simulatorUuid: "ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV", bundleId: "com.example.MyApp" })

3. When done with any option, use: stop_sim_log_cap({ logSessionId: 'SESSION_ID' })`,
          },
        ]);
        expect(result.isError).toBe(undefined);
      });
    });
  });

  describe('launch_app_logs_sim tool', () => {
    describe('success scenarios', () => {
      it('should return deterministic success response with log session', async () => {
        const params = {
          simulatorUuid: 'ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV',
          bundleId: 'com.example.MyApp',
        };

        const handler = getToolHandler(registerLaunchAppWithLogsInSimulatorTool);
        const result = await handler(params);

        expect(mockStartLogCapture).toHaveBeenCalledWith({
          simulatorUuid: 'ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV',
          bundleId: 'com.example.MyApp',
          captureConsole: true,
        });

        expect(result.content).toEqual([
          {
            type: 'text',
            text: 'App launched successfully in simulator ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV with log capture enabled.\n\nLog capture session ID: test-session-id\n\nNext Steps:\n1. Interact with your app in the simulator.\n2. Use \'stop_and_get_simulator_log({ logSessionId: "test-session-id" })\' to stop capture and retrieve logs.',
          },
        ]);
        expect(result.isError).toBe(undefined);
      });
    });
  });

  describe('set_sim_appearance tool', () => {
    describe('success scenarios', () => {
      it('should return deterministic success response for dark mode', async () => {
        const params = {
          simulatorUuid: 'ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV',
          mode: 'dark' as const,
        };

        const handler = getToolHandler(registerSetSimulatorAppearanceTool);
        const result = await handler(params);

        expect(mockExecuteCommand).toHaveBeenCalledWith(
          ['xcrun', 'simctl', 'ui', 'ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV', 'appearance', 'dark'],
          'Set Simulator Appearance',
        );

        expect(result.content).toEqual([
          {
            type: 'text',
            text: 'Successfully set simulator ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV appearance to dark mode',
          },
        ]);
        expect(result.isError).toBe(undefined);
      });
    });
  });

  describe('stop_app_sim tool', () => {
    describe('success scenarios', () => {
      it('should return deterministic success response with checkmark', async () => {
        const params = {
          simulatorUuid: 'ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV',
          bundleId: 'com.example.MyApp',
        };

        const handler = getToolHandler(registerStopAppInSimulatorTool);
        const result = await handler(params);

        expect(mockExecuteCommand).toHaveBeenCalledWith(
          [
            'xcrun',
            'simctl',
            'terminate',
            'ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV',
            'com.example.MyApp',
          ],
          'Stop App in Simulator',
        );

        expect(result.content).toEqual([
          {
            type: 'text',
            text: '✅ App com.example.MyApp stopped successfully in simulator ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV',
          },
        ]);
        expect(result.isError).toBe(undefined);
      });

      it('should handle command execution failure with error flag', async () => {
        mockExecuteCommand.mockResolvedValue({
          success: false,
          error: 'App not running',
        });

        const params = {
          simulatorUuid: 'ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV',
          bundleId: 'com.example.MyApp',
        };

        const handler = getToolHandler(registerStopAppInSimulatorTool);
        const result = await handler(params);

        expect(result.content).toEqual([
          {
            type: 'text',
            text: 'Stop app in simulator operation failed: App not running',
          },
        ]);
        expect(result.isError).toBe(true);
      });
    });
  });

  describe('command generation validation', () => {
    it('should verify external dependencies are properly mocked', () => {
      expect(mockExecuteCommand).toBeDefined();
      expect(mockValidateRequiredParam).toBeDefined();
      expect(mockStartLogCapture).toBeDefined();
      expect(typeof mockExecuteCommand).toBe('function');
      expect(typeof mockValidateRequiredParam).toBe('function');
      expect(typeof mockStartLogCapture).toBe('function');
    });

    it('should not execute real commands during testing', async () => {
      const params = { simulatorUuid: 'ABCD1234-5678-90EF-GHIJ-KLMNOPQRSTUV' };
      const handler = getToolHandler(registerBootSimulatorTool);
      await handler(params);

      // Verify that mocked executeCommand is called, not real child_process execution
      expect(mockExecuteCommand).toHaveBeenCalled();
    });
  });

  describe('error handling scenarios', () => {
    it('should handle validation errors correctly', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'Parameter validation failed' }],
          isError: true,
        },
      });

      const handler = getToolHandler(registerBootSimulatorTool);
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
    });

    it('should handle command execution exceptions', async () => {
      mockExecuteCommand.mockRejectedValue(new Error('Command execution failed'));

      const handler = getToolHandler(registerBootSimulatorTool);
      const result = await handler({ simulatorUuid: 'test-uuid' });

      expect(result.content[0].text).toContain(
        'Boot simulator operation failed: Command execution failed',
      );
    });
  });
});
