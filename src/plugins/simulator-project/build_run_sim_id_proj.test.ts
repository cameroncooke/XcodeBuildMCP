import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import buildRunSimIdProj from './build_run_sim_id_proj.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  executeCommand: vi.fn(),
  validateRequiredParam: vi.fn(),
  createTextResponse: vi.fn(),
  executeXcodeBuildCommand: vi.fn(),
}));

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('build_run_sim_id_proj plugin', () => {
  let mockLog: MockedFunction<any>;
  let mockExecuteCommand: MockedFunction<any>;
  let mockValidateRequiredParam: MockedFunction<any>;
  let mockCreateTextResponse: MockedFunction<any>;
  let mockExecuteXcodeBuildCommand: MockedFunction<any>;
  let mockExecSync: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');
    mockLog = utils.log as MockedFunction<any>;
    mockExecuteCommand = utils.executeCommand as MockedFunction<any>;
    mockValidateRequiredParam = utils.validateRequiredParam as MockedFunction<any>;
    mockCreateTextResponse = utils.createTextResponse as MockedFunction<any>;
    mockExecuteXcodeBuildCommand = utils.executeXcodeBuildCommand as MockedFunction<any>;

    const childProcess = await import('child_process');
    mockExecSync = childProcess.execSync as MockedFunction<any>;

    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(buildRunSimIdProj.name).toBe('build_run_sim_id_proj');
    });

    it('should have correct description field', () => {
      expect(buildRunSimIdProj.description).toBe(
        "Builds and runs an app from a project file on a simulator specified by UUID. IMPORTANT: Requires projectPath, scheme, and simulatorId. Example: build_run_sim_id_proj({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
      );
    });

    it('should have handler as a function', () => {
      expect(typeof buildRunSimIdProj.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(buildRunSimIdProj.schema);

      // Valid input
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(true);

      // Invalid projectPath
      expect(
        schema.safeParse({
          projectPath: 123,
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(false);

      // Invalid scheme
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 123,
          simulatorId: 'test-uuid',
        }).success,
      ).toBe(false);

      // Invalid simulatorId
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 123,
        }).success,
      ).toBe(false);

      // Valid with optional fields
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--arg1', '--arg2'],
          useLatestOS: true,
          preferXcodebuild: true,
        }).success,
      ).toBe(true);

      // Invalid configuration
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          configuration: 123,
        }).success,
      ).toBe(false);

      // Invalid derivedDataPath
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          derivedDataPath: 123,
        }).success,
      ).toBe(false);

      // Invalid extraArgs
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          extraArgs: 'not-array',
        }).success,
      ).toBe(false);

      // Invalid useLatestOS
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          useLatestOS: 'yes',
        }).success,
      ).toBe(false);

      // Invalid preferXcodebuild
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          preferXcodebuild: 'yes',
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return validation error for missing projectPath', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'Error: projectPath is required' }],
          isError: true,
        },
      });

      const result = await buildRunSimIdProj.handler({
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: projectPath is required' }],
        isError: true,
      });
    });

    it('should return validation error for missing scheme', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true }).mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'Error: scheme is required' }],
          isError: true,
        },
      });

      const result = await buildRunSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: scheme is required' }],
        isError: true,
      });
    });

    it('should return validation error for missing simulatorId', async () => {
      mockValidateRequiredParam
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [{ type: 'text', text: 'Error: simulatorId is required' }],
            isError: true,
          },
        });

      const result = await buildRunSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: simulatorId is required' }],
        isError: true,
      });
    });

    it('should return build error when build fails', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build failed with error' }],
        isError: true,
      });

      const result = await buildRunSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Build failed with error' }],
        isError: true,
      });
    });

    it('should return error when executeCommand fails', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build succeeded' }],
        isError: false,
      });

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Command failed',
      });

      mockCreateTextResponse.mockReturnValue({
        content: [
          { type: 'text', text: 'Build succeeded, but failed to get app path: Command failed' },
        ],
        isError: true,
      });

      const result = await buildRunSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'Build succeeded, but failed to get app path: Command failed' },
        ],
        isError: true,
      });
    });

    it('should return error when app path not found', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build succeeded' }],
        isError: false,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'No app path found',
      });

      mockCreateTextResponse.mockReturnValue({
        content: [
          { type: 'text', text: 'Build succeeded, but could not find app path in build settings.' },
        ],
        isError: true,
      });

      const result = await buildRunSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'Build succeeded, but could not find app path in build settings.' },
        ],
        isError: true,
      });
    });

    it('should return error when simulator not found', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build succeeded' }],
        isError: false,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'CODESIGNING_FOLDER_PATH = /path/to/MyApp.app',
      });

      mockExecSync.mockReturnValue('no simulator found');

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Build succeeded, but could not find simulator with UUID: test-uuid',
          },
        ],
        isError: true,
      });

      const result = await buildRunSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Build succeeded, but could not find simulator with UUID: test-uuid',
          },
        ],
        isError: true,
      });
    });

    it('should return success when all operations succeed', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build succeeded' }],
        isError: false,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'CODESIGNING_FOLDER_PATH = /path/to/MyApp.app',
      });

      mockExecSync
        .mockReturnValueOnce('    Test Simulator (test-uuid) (Booted)')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('com.example.MyApp')
        .mockReturnValueOnce('');

      const result = await buildRunSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `✅ iOS simulator build and run succeeded for scheme MyScheme targeting simulator UUID test-uuid.
          
The app (com.example.MyApp) is now running in the iOS Simulator. 
If you don't see the simulator window, it may be hidden behind other windows. The Simulator app should be open.

Next Steps:
- Option 1: Capture structured logs only (app continues running):
  start_simulator_log_capture({ simulatorUuid: 'test-uuid', bundleId: 'com.example.MyApp' })
- Option 2: Capture both console and structured logs (app will restart):
  start_simulator_log_capture({ simulatorUuid: 'test-uuid', bundleId: 'com.example.MyApp', captureConsole: true })
- Option 3: Launch app with logs in one step (for a fresh start):
  launch_app_with_logs_in_simulator({ simulatorUuid: 'test-uuid', bundleId: 'com.example.MyApp' })

When done with any option, use: stop_sim_log_cap({ logSessionId: 'SESSION_ID' })`,
          },
        ],
        isError: false,
      });
    });

    it('should handle Exception objects correctly', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build succeeded' }],
        isError: false,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'CODESIGNING_FOLDER_PATH = /path/to/MyApp.app',
      });

      mockExecSync.mockImplementation(() => {
        throw new Error('Simulator error');
      });

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Build succeeded, but error checking/booting simulator: Simulator error',
          },
        ],
        isError: true,
      });

      const result = await buildRunSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Build succeeded, but error checking/booting simulator: Simulator error',
          },
        ],
        isError: true,
      });
    });

    it('should handle string errors correctly', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockImplementation(() => {
        throw 'String error';
      });

      mockCreateTextResponse.mockReturnValue({
        content: [{ type: 'text', text: 'Error in iOS Simulator build and run: String error' }],
        isError: true,
      });

      const result = await buildRunSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error in iOS Simulator build and run: String error' }],
        isError: true,
      });
    });

    it('should handle simulator name lookup success', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build succeeded' }],
        isError: false,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'CODESIGNING_FOLDER_PATH = /path/to/MyApp.app',
      });

      const simulatorListOutput = JSON.stringify({
        devices: {
          'com.apple.CoreSimulator.SimRuntime.iOS-17-0': [
            {
              name: 'iPhone 15',
              udid: 'test-uuid-123',
              isAvailable: true,
            },
          ],
        },
      });

      mockExecSync
        .mockReturnValueOnce(simulatorListOutput) // simctl list devices
        .mockReturnValueOnce('    iPhone 15 (test-uuid-123) (Booted)') // simctl list devices for state
        .mockReturnValueOnce('') // open -a Simulator
        .mockReturnValueOnce('') // simctl install
        .mockReturnValueOnce('com.example.MyApp') // PlistBuddy
        .mockReturnValueOnce(''); // simctl launch

      const result = await buildRunSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 15',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `✅ iOS simulator build and run succeeded for scheme MyScheme targeting simulator name 'iPhone 15'.
          
The app (com.example.MyApp) is now running in the iOS Simulator. 
If you don't see the simulator window, it may be hidden behind other windows. The Simulator app should be open.

Next Steps:
- Option 1: Capture structured logs only (app continues running):
  start_simulator_log_capture({ simulatorUuid: 'test-uuid-123', bundleId: 'com.example.MyApp' })
- Option 2: Capture both console and structured logs (app will restart):
  start_simulator_log_capture({ simulatorUuid: 'test-uuid-123', bundleId: 'com.example.MyApp', captureConsole: true })
- Option 3: Launch app with logs in one step (for a fresh start):
  launch_app_with_logs_in_simulator({ simulatorUuid: 'test-uuid-123', bundleId: 'com.example.MyApp' })

When done with any option, use: stop_sim_log_cap({ logSessionId: 'SESSION_ID' })`,
          },
        ],
        isError: false,
      });
    });

    it('should handle simulator name not found error', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build succeeded' }],
        isError: false,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'CODESIGNING_FOLDER_PATH = /path/to/MyApp.app',
      });

      const simulatorListOutput = JSON.stringify({
        devices: {
          'com.apple.CoreSimulator.SimRuntime.iOS-17-0': [
            {
              name: 'iPhone 14',
              udid: 'different-uuid',
              isAvailable: true,
            },
          ],
        },
      });

      mockExecSync.mockReturnValueOnce(simulatorListOutput);

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: "Build succeeded, but could not find an available simulator named 'iPhone 15'. Use list_simulators({}) to check available devices.",
          },
        ],
        isError: true,
      });

      const result = await buildRunSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 15',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Build succeeded, but could not find an available simulator named 'iPhone 15'. Use list_simulators({}) to check available devices.",
          },
        ],
        isError: true,
      });
    });

    it('should handle JSON parse error during simulator lookup', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build succeeded' }],
        isError: false,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'CODESIGNING_FOLDER_PATH = /path/to/MyApp.app',
      });

      mockExecSync.mockImplementation(() => {
        throw new Error('JSON parse error');
      });

      mockCreateTextResponse.mockReturnValue({
        content: [
          { type: 'text', text: 'Build succeeded, but error finding simulator: JSON parse error' },
        ],
        isError: true,
      });

      const result = await buildRunSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 15',
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'Build succeeded, but error finding simulator: JSON parse error' },
        ],
        isError: true,
      });
    });

    it('should handle simulator boot required', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build succeeded' }],
        isError: false,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'CODESIGNING_FOLDER_PATH = /path/to/MyApp.app',
      });

      mockExecSync
        .mockReturnValueOnce('    Test Simulator (test-uuid) (Shutdown)') // simulator state check
        .mockReturnValueOnce('') // boot simulator
        .mockReturnValueOnce('') // open Simulator
        .mockReturnValueOnce('') // install app
        .mockReturnValueOnce('com.example.MyApp') // bundle ID
        .mockReturnValueOnce(''); // launch app

      const result = await buildRunSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `✅ iOS simulator build and run succeeded for scheme MyScheme targeting simulator UUID test-uuid.
          
The app (com.example.MyApp) is now running in the iOS Simulator. 
If you don't see the simulator window, it may be hidden behind other windows. The Simulator app should be open.

Next Steps:
- Option 1: Capture structured logs only (app continues running):
  start_simulator_log_capture({ simulatorUuid: 'test-uuid', bundleId: 'com.example.MyApp' })
- Option 2: Capture both console and structured logs (app will restart):
  start_simulator_log_capture({ simulatorUuid: 'test-uuid', bundleId: 'com.example.MyApp', captureConsole: true })
- Option 3: Launch app with logs in one step (for a fresh start):
  launch_app_with_logs_in_simulator({ simulatorUuid: 'test-uuid', bundleId: 'com.example.MyApp' })

When done with any option, use: stop_sim_log_cap({ logSessionId: 'SESSION_ID' })`,
          },
        ],
        isError: false,
      });
    });

    it('should handle Simulator app open warning', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build succeeded' }],
        isError: false,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'CODESIGNING_FOLDER_PATH = /path/to/MyApp.app',
      });

      mockExecSync
        .mockReturnValueOnce('    Test Simulator (test-uuid) (Booted)') // simulator state
        .mockImplementationOnce(() => {
          throw new Error('Simulator app error');
        }) // open -a Simulator fails
        .mockReturnValueOnce('') // install app
        .mockReturnValueOnce('com.example.MyApp') // bundle ID
        .mockReturnValueOnce(''); // launch app

      const result = await buildRunSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(result.isError).toBe(false);
      expect(mockLog).toHaveBeenCalledWith(
        'warning',
        'Warning: Could not open Simulator app: Simulator app error',
      );
    });

    it('should handle app install error', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build succeeded' }],
        isError: false,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'CODESIGNING_FOLDER_PATH = /path/to/MyApp.app',
      });

      mockExecSync
        .mockReturnValueOnce('    Test Simulator (test-uuid) (Booted)') // simulator state
        .mockReturnValueOnce('') // open Simulator
        .mockImplementationOnce(() => {
          throw new Error('Install failed');
        }); // install app fails

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Build succeeded, but error installing app on simulator: Install failed',
          },
        ],
        isError: true,
      });

      const result = await buildRunSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Build succeeded, but error installing app on simulator: Install failed',
          },
        ],
        isError: true,
      });
    });

    it('should handle bundle ID extraction fallback to defaults', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build succeeded' }],
        isError: false,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'CODESIGNING_FOLDER_PATH = /path/to/MyApp.app',
      });

      mockExecSync
        .mockReturnValueOnce('    Test Simulator (test-uuid) (Booted)') // simulator state
        .mockReturnValueOnce('') // open Simulator
        .mockReturnValueOnce('') // install app
        .mockImplementationOnce(() => {
          throw new Error('PlistBuddy failed');
        }) // PlistBuddy fails
        .mockReturnValueOnce('com.example.MyApp') // defaults succeeds
        .mockReturnValueOnce(''); // launch app

      const result = await buildRunSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(result.isError).toBe(false);
      expect(mockLog).toHaveBeenCalledWith(
        'warning',
        'PlistBuddy failed, trying defaults: PlistBuddy failed',
      );
    });

    it('should handle bundle ID extraction complete failure', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build succeeded' }],
        isError: false,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'CODESIGNING_FOLDER_PATH = /path/to/MyApp.app',
      });

      mockExecSync
        .mockReturnValueOnce('    Test Simulator (test-uuid) (Booted)') // simulator state
        .mockReturnValueOnce('') // open Simulator
        .mockReturnValueOnce('') // install app
        .mockImplementationOnce(() => {
          throw new Error('PlistBuddy failed');
        }) // PlistBuddy fails
        .mockImplementationOnce(() => {
          throw new Error('defaults failed');
        }); // defaults also fails

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Build and install succeeded, but error getting bundle ID: defaults failed',
          },
        ],
        isError: true,
      });

      const result = await buildRunSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Build and install succeeded, but error getting bundle ID: defaults failed',
          },
        ],
        isError: true,
      });
    });

    it('should handle empty bundle ID from extraction', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build succeeded' }],
        isError: false,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'CODESIGNING_FOLDER_PATH = /path/to/MyApp.app',
      });

      mockExecSync
        .mockReturnValueOnce('    Test Simulator (test-uuid) (Booted)') // simulator state
        .mockReturnValueOnce('') // open Simulator
        .mockReturnValueOnce('') // install app
        .mockReturnValueOnce(''); // PlistBuddy returns empty

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Build and install succeeded, but error getting bundle ID: Could not extract bundle ID from Info.plist',
          },
        ],
        isError: true,
      });

      const result = await buildRunSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Build and install succeeded, but error getting bundle ID: Could not extract bundle ID from Info.plist',
          },
        ],
        isError: true,
      });
    });

    it('should handle app launch error', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build succeeded' }],
        isError: false,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'CODESIGNING_FOLDER_PATH = /path/to/MyApp.app',
      });

      mockExecSync
        .mockReturnValueOnce('    Test Simulator (test-uuid) (Booted)') // simulator state
        .mockReturnValueOnce('') // open Simulator
        .mockReturnValueOnce('') // install app
        .mockReturnValueOnce('com.example.MyApp') // bundle ID
        .mockImplementationOnce(() => {
          throw new Error('Launch failed');
        }); // launch fails

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Build and install succeeded, but error launching app on simulator: Launch failed',
          },
        ],
        isError: true,
      });

      const result = await buildRunSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Build and install succeeded, but error launching app on simulator: Launch failed',
          },
        ],
        isError: true,
      });
    });

    it('should handle workspace path parameter', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build succeeded' }],
        isError: false,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'CODESIGNING_FOLDER_PATH = /path/to/MyApp.app',
      });

      mockExecSync
        .mockReturnValueOnce('    Test Simulator (test-uuid) (Booted)')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('com.example.MyApp')
        .mockReturnValueOnce('');

      const result = await buildRunSimIdProj.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
        configuration: 'Release',
        derivedDataPath: '/path/to/derived',
        extraArgs: ['--custom-arg'],
        useLatestOS: false,
        preferXcodebuild: true,
      });

      expect(result.isError).toBe(false);
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        expect.arrayContaining([
          '-workspace',
          '/path/to/workspace.xcworkspace',
          '-configuration',
          'Release',
          '-derivedDataPath',
          '/path/to/derived',
          '--custom-arg',
        ]),
        'Get App Path',
      );
    });

    it('should return error when neither simulatorId nor simulatorName provided', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build succeeded' }],
        isError: false,
      });

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Either simulatorId or simulatorName must be provided for iOS simulator build',
          },
        ],
        isError: true,
      });

      const result = await buildRunSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Either simulatorId or simulatorName must be provided for iOS simulator build',
          },
        ],
        isError: true,
      });
    });

    it('should handle missing simulator UUID after name lookup', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build succeeded' }],
        isError: false,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'CODESIGNING_FOLDER_PATH = /path/to/MyApp.app',
      });

      // Mock a scenario where simulator lookup fails but no exception is thrown
      const simulatorListOutput = JSON.stringify({
        devices: {
          'com.apple.CoreSimulator.SimRuntime.iOS-17-0': [],
        },
      });

      mockExecSync.mockReturnValueOnce(simulatorListOutput);

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Build succeeded, but no simulator specified and failed to find a suitable one.',
          },
        ],
        isError: true,
      });

      const result = await buildRunSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorName: 'NonExistent',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Build succeeded, but no simulator specified and failed to find a suitable one.',
          },
        ],
        isError: true,
      });
    });
  });
});
