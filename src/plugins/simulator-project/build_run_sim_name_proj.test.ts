import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import buildRunSimNameProj from './build_run_sim_name_proj.ts';

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

describe('build_run_sim_name_proj plugin', () => {
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
      expect(buildRunSimNameProj.name).toBe('build_run_sim_name_proj');
    });

    it('should have correct description field', () => {
      expect(buildRunSimNameProj.description).toBe(
        "Builds and runs an app from a project file on a simulator specified by name. IMPORTANT: Requires projectPath, scheme, and simulatorName. Example: build_run_sim_name_proj({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
      );
    });

    it('should have handler as a function', () => {
      expect(typeof buildRunSimNameProj.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(buildRunSimNameProj.schema);

      // Valid input
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(true);

      // Invalid projectPath
      expect(
        schema.safeParse({
          projectPath: 123,
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(false);

      // Invalid scheme
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 123,
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(false);

      // Invalid simulatorName
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 123,
        }).success,
      ).toBe(false);

      // Valid with optional fields
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
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
          simulatorName: 'iPhone 16',
          configuration: 123,
        }).success,
      ).toBe(false);

      // Invalid derivedDataPath
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          derivedDataPath: 123,
        }).success,
      ).toBe(false);

      // Invalid extraArgs
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          extraArgs: 'not-array',
        }).success,
      ).toBe(false);

      // Invalid useLatestOS
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          useLatestOS: 'yes',
        }).success,
      ).toBe(false);

      // Invalid preferXcodebuild
      expect(
        schema.safeParse({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
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

      const result = await buildRunSimNameProj.handler({
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
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

      const result = await buildRunSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        simulatorName: 'iPhone 16',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: scheme is required' }],
        isError: true,
      });
    });

    it('should return validation error for missing simulatorName', async () => {
      mockValidateRequiredParam
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [{ type: 'text', text: 'Error: simulatorName is required' }],
            isError: true,
          },
        });

      const result = await buildRunSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: simulatorName is required' }],
        isError: true,
      });
    });

    it('should return build error when build fails', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build failed with error' }],
        isError: true,
      });

      const result = await buildRunSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
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

      const result = await buildRunSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'Build succeeded, but failed to get app path: Command failed' },
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

      mockExecSync.mockReturnValue('{"devices": {}}');

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: "Build succeeded, but could not find an available simulator named 'iPhone 16'. Use list_simulators({}) to check available devices.",
          },
        ],
        isError: true,
      });

      const result = await buildRunSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Build succeeded, but could not find an available simulator named 'iPhone 16'. Use list_simulators({}) to check available devices.",
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
        .mockReturnValueOnce(
          '{"devices": {"iOS 17.0": [{"name": "iPhone 16", "udid": "test-uuid", "isAvailable": true}]}}',
        )
        .mockReturnValueOnce('    iPhone 16 (test-uuid) (Booted)')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('com.example.MyApp')
        .mockReturnValueOnce('');

      const result = await buildRunSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `✅ iOS simulator build and run succeeded for scheme MyScheme targeting simulator name 'iPhone 16'.
          
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

      mockExecSync
        .mockReturnValueOnce(
          '{"devices": {"iOS 17.0": [{"name": "iPhone 16", "udid": "test-uuid", "isAvailable": true}]}}',
        )
        .mockImplementation(() => {
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

      const result = await buildRunSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
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

      const result = await buildRunSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error in iOS Simulator build and run: String error' }],
        isError: true,
      });
    });
  });
});
