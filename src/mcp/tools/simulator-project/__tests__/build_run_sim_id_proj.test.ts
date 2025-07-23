import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../../utils/command.js';
import buildRunSimIdProj, { build_run_sim_id_projLogic } from '../build_run_sim_id_proj.ts';

describe('build_run_sim_id_proj plugin', () => {
  let mockExecSyncCalls: { command: string; result: string }[];
  let mockExecuteXcodeBuildCommandCalls: any[];

  beforeEach(() => {
    mockExecSyncCalls = [];
    mockExecuteXcodeBuildCommandCalls = [];
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
      const mockExecutor = createMockExecutor({});

      const result = await build_run_sim_id_projLogic(
        {
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return validation error for missing scheme', async () => {
      const mockExecutor = createMockExecutor({});

      const result = await build_run_sim_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          simulatorId: 'test-uuid',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return validation error for missing simulatorId', async () => {
      const mockExecutor = createMockExecutor({});

      const result = await build_run_sim_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'simulatorId' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return build error when build fails', async () => {
      // Create mock executeXcodeBuildCommand function
      const mockExecuteXcodeBuildCommand = async (...args: any[]) => {
        mockExecuteXcodeBuildCommandCalls.push(args);
        return {
          content: [
            { type: 'text', text: 'Error: Xcode build failed\nDetails: Build failed with error' },
          ],
          isError: true,
        };
      };

      const mockExecutor = createMockExecutor({});

      const result = await build_run_sim_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        },
        mockExecutor,
        undefined,
        mockExecuteXcodeBuildCommand,
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'Error: Xcode build failed\nDetails: Build failed with error' },
        ],
        isError: true,
      });
    });

    it('should handle successful build and run', async () => {
      // Create mock executeXcodeBuildCommand function
      const mockExecuteXcodeBuildCommand = async (...args: any[]) => {
        mockExecuteXcodeBuildCommandCalls.push(args);
        return {
          content: [{ type: 'text', text: '✅ Build succeeded for scheme MyScheme' }],
          isError: false,
        };
      };

      // Mock showBuildSettings command through CommandExecutor
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'CODESIGNING_FOLDER_PATH = /path/to/MyApp.app',
      });

      // Create mock sync function with sequential returns
      let execSyncCallCount = 0;
      const mockExecSync = (command: string) => {
        mockExecSyncCalls.push({ command, result: '' });
        execSyncCallCount++;
        switch (execSyncCallCount) {
          case 1:
            return '    Test Simulator (test-uuid) (Booted)'; // simulator list
          case 2:
            return ''; // open Simulator
          case 3:
            return ''; // install app
          case 4:
            return 'com.example.MyApp'; // bundle ID
          case 5:
            return ''; // launch app
          default:
            return '';
        }
      };

      const result = await build_run_sim_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        },
        mockExecutor,
        mockExecSync,
        mockExecuteXcodeBuildCommand,
      );

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('✅ iOS simulator build and run succeeded');
      expect(result.content[0].text).toContain('com.example.MyApp');
    });

    it('should handle command generation with extra args', async () => {
      // Create mock executeXcodeBuildCommand function that captures calls
      const mockExecuteXcodeBuildCommand = async (...args: any[]) => {
        mockExecuteXcodeBuildCommandCalls.push(args);
        return {
          content: [{ type: 'text', text: 'Build failed' }],
          isError: true,
        };
      };

      const mockExecutor = createMockExecutor({});

      await build_run_sim_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--custom-arg'],
          preferXcodebuild: true,
        },
        mockExecutor,
        undefined,
        mockExecuteXcodeBuildCommand,
      );

      expect(mockExecuteXcodeBuildCommandCalls).toHaveLength(1);
      const call = mockExecuteXcodeBuildCommandCalls[0];
      expect(call[0]).toEqual(
        expect.objectContaining({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--custom-arg'],
          preferXcodebuild: true,
        }),
      );
      expect(call[1]).toEqual(
        expect.objectContaining({
          platform: 'iOS Simulator',
          simulatorId: 'test-uuid',
          logPrefix: 'iOS Simulator Build',
        }),
      );
      expect(call[2]).toBe(true);
      expect(call[3]).toBe('build');
    });
  });

  describe('Command Generation Tests', () => {
    it('should generate correct xcodebuild command for minimal parameters', async () => {
      const callHistory: Array<{
        command: string[];
        logPrefix?: string;
        useShell?: boolean;
        env?: any;
      }> = [];

      // Create tracking executor
      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command, logPrefix, useShell, env });
        return {
          success: true,
          output: 'CODESIGNING_FOLDER_PATH = /build/MyApp.app',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const mockExecuteXcodeBuildCommand = async (...args: any[]) => {
        return {
          content: [{ type: 'text', text: '✅ Build succeeded for scheme MyScheme' }],
          isError: false,
        };
      };

      const mockExecSync = (command: string) => {
        if (command.includes('simctl list devices')) {
          return '    Test Simulator (test-uuid) (Booted)';
        }
        return '';
      };

      await build_run_sim_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        },
        trackingExecutor,
        mockExecSync,
        mockExecuteXcodeBuildCommand,
      );

      expect(callHistory).toHaveLength(1);
      expect(callHistory[0].command).toEqual([
        'xcodebuild',
        '-showBuildSettings',
        '-project',
        '/path/to/project.xcodeproj',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Debug',
        '-destination',
        'platform=iOS Simulator,id=test-uuid',
      ]);
      expect(callHistory[0].logPrefix).toBe('Get App Path');
      expect(callHistory[0].useShell).toBe(true);
    });

    it('should generate correct xcodebuild command with all optional parameters', async () => {
      const callHistory: Array<{
        command: string[];
        logPrefix?: string;
        useShell?: boolean;
        env?: any;
      }> = [];

      // Create tracking executor
      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command, logPrefix, useShell, env });
        return {
          success: true,
          output: 'CODESIGNING_FOLDER_PATH = /build/MyApp.app',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const mockExecuteXcodeBuildCommand = async (...args: any[]) => {
        return {
          content: [{ type: 'text', text: '✅ Build succeeded for scheme MyScheme' }],
          isError: false,
        };
      };

      const mockExecSync = (command: string) => {
        if (command.includes('simctl list devices')) {
          return '    Test Simulator (test-uuid) (Booted)';
        }
        return '';
      };

      await build_run_sim_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          configuration: 'Release',
          derivedDataPath: '/custom/derived',
          extraArgs: ['--verbose', '--custom-flag'],
        },
        trackingExecutor,
        mockExecSync,
        mockExecuteXcodeBuildCommand,
      );

      expect(callHistory).toHaveLength(1);
      expect(callHistory[0].command).toEqual([
        'xcodebuild',
        '-showBuildSettings',
        '-project',
        '/path/to/project.xcodeproj',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Release',
        '-destination',
        'platform=iOS Simulator,id=test-uuid',
        '-derivedDataPath',
        '/custom/derived',
        '--verbose',
        '--custom-flag',
      ]);
      expect(callHistory[0].logPrefix).toBe('Get App Path');
      expect(callHistory[0].useShell).toBe(true);
    });

    it('should generate correct command with workspace path instead of project path', async () => {
      const callHistory: Array<{
        command: string[];
        logPrefix?: string;
        useShell?: boolean;
        env?: any;
      }> = [];

      // Create tracking executor
      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command, logPrefix, useShell, env });
        return {
          success: true,
          output: 'CODESIGNING_FOLDER_PATH = /build/MyApp.app',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const mockExecuteXcodeBuildCommand = async (...args: any[]) => {
        return {
          content: [{ type: 'text', text: '✅ Build succeeded for scheme MyScheme' }],
          isError: false,
        };
      };

      const mockExecSync = (command: string) => {
        if (command.includes('simctl list devices')) {
          return '    Test Simulator (test-uuid) (Booted)';
        }
        return '';
      };

      await build_run_sim_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        },
        trackingExecutor,
        mockExecSync,
        mockExecuteXcodeBuildCommand,
      );

      expect(callHistory).toHaveLength(1);
      expect(callHistory[0].command).toEqual([
        'xcodebuild',
        '-showBuildSettings',
        '-workspace',
        '/path/to/workspace.xcworkspace',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Debug',
        '-destination',
        'platform=iOS Simulator,id=test-uuid',
      ]);
    });
  });

  describe('Success Path Tests', () => {
    it('should return success response for minimal build and run', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'CODESIGNING_FOLDER_PATH = /build/MyApp.app',
      });

      const mockExecuteXcodeBuildCommand = async (...args: any[]) => {
        return {
          content: [{ type: 'text', text: '✅ Build succeeded for scheme MyScheme' }],
          isError: false,
        };
      };

      let execSyncCallCount = 0;
      const mockExecSync = (command: string) => {
        execSyncCallCount++;
        switch (execSyncCallCount) {
          case 1:
            return '    Test Simulator (test-uuid) (Booted)';
          case 2:
            return '';
          case 3:
            return '';
          case 4:
            return 'com.example.MyApp';
          case 5:
            return '';
          default:
            return '';
        }
      };

      const result = await build_run_sim_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        },
        mockExecutor,
        mockExecSync,
        mockExecuteXcodeBuildCommand,
      );

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

    it('should return success response with Release configuration', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'CODESIGNING_FOLDER_PATH = /build/Release-iphonesimulator/MyApp.app',
      });

      const mockExecuteXcodeBuildCommand = async (...args: any[]) => {
        return {
          content: [{ type: 'text', text: '✅ Build succeeded for scheme MyScheme' }],
          isError: false,
        };
      };

      let execSyncCallCount = 0;
      const mockExecSync = (command: string) => {
        execSyncCallCount++;
        switch (execSyncCallCount) {
          case 1:
            return '    Test Simulator (test-uuid) (Booted)';
          case 2:
            return '';
          case 3:
            return '';
          case 4:
            return 'com.example.MyApp';
          case 5:
            return '';
          default:
            return '';
        }
      };

      const result = await build_run_sim_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          configuration: 'Release',
        },
        mockExecutor,
        mockExecSync,
        mockExecuteXcodeBuildCommand,
      );

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain(
        '✅ iOS simulator build and run succeeded for scheme MyScheme',
      );
      expect(result.content[0].text).toContain('simulator UUID test-uuid');
      expect(result.content[0].text).toContain('com.example.MyApp');
    });

    it('should return success response when simulator needs to be booted', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'CODESIGNING_FOLDER_PATH = /build/MyApp.app',
      });

      const mockExecuteXcodeBuildCommand = async (...args: any[]) => {
        return {
          content: [{ type: 'text', text: '✅ Build succeeded for scheme MyScheme' }],
          isError: false,
        };
      };

      let execSyncCallCount = 0;
      const mockExecSync = (command: string) => {
        execSyncCallCount++;
        switch (execSyncCallCount) {
          case 1:
            return '    Test Simulator (test-uuid) (Shutdown)'; // Simulator not booted
          case 2:
            return ''; // Boot simulator
          case 3:
            return ''; // Open simulator
          case 4:
            return ''; // Install app
          case 5:
            return 'com.example.MyApp'; // Get bundle ID
          case 6:
            return ''; // Launch app
          default:
            return '';
        }
      };

      const result = await build_run_sim_id_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        },
        mockExecutor,
        mockExecSync,
        mockExecuteXcodeBuildCommand,
      );

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('✅ iOS simulator build and run succeeded');
      expect(result.content[0].text).toContain('com.example.MyApp');
    });
  });
});
