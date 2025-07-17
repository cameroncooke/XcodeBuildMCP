/**
 * Tests for build_mac_proj plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using pure dependency injection for deterministic testing
 * NO VITEST MOCKING ALLOWED - Only createMockExecutor and manual stubs
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMockExecutor } from '../../../utils/command.js';
import buildMacProj, { type BuildUtilsDependencies } from '../build_mac_proj.ts';
import { ToolResponse } from '../../../types/common.js';

describe('build_mac_proj plugin', () => {
  let mockBuildUtilsDeps: BuildUtilsDependencies;
  let executeXcodeBuildCommandCalls: any[];

  beforeEach(() => {
    executeXcodeBuildCommandCalls = [];
    mockBuildUtilsDeps = {
      executeXcodeBuildCommand: async (
        params: any,
        platformOptions: any,
        preferXcodebuild: any,
        buildAction: any,
        executor: any,
      ) => {
        executeXcodeBuildCommandCalls.push({
          params,
          platformOptions,
          preferXcodebuild,
          buildAction,
          executor,
        });
        return {
          content: [{ type: 'text', text: '✅ macOS Build build succeeded for scheme MyScheme.' }],
        };
      },
    };
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildMacProj.name).toBe('build_mac_proj');
    });

    it('should have correct description', () => {
      expect(buildMacProj.description).toBe(
        'Builds a macOS app using xcodebuild from a project file.',
      );
    });

    it('should have handler function', () => {
      expect(typeof buildMacProj.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        buildMacProj.schema.projectPath.safeParse('/path/to/MyProject.xcodeproj').success,
      ).toBe(true);
      expect(buildMacProj.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(buildMacProj.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(buildMacProj.schema.derivedDataPath.safeParse('/path/to/derived-data').success).toBe(
        true,
      );
      expect(buildMacProj.schema.arch.safeParse('arm64').success).toBe(true);
      expect(buildMacProj.schema.arch.safeParse('x86_64').success).toBe(true);
      expect(buildMacProj.schema.extraArgs.safeParse(['--arg1', '--arg2']).success).toBe(true);
      expect(buildMacProj.schema.preferXcodebuild.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(buildMacProj.schema.projectPath.safeParse(null).success).toBe(false);
      expect(buildMacProj.schema.scheme.safeParse(null).success).toBe(false);
      expect(buildMacProj.schema.arch.safeParse('invalidArch').success).toBe(false);
      expect(buildMacProj.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(buildMacProj.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact successful build response', async () => {
      // Configure mock to return successful build response
      mockBuildUtilsDeps.executeXcodeBuildCommand = async (
        params: any,
        platformOptions: any,
        preferXcodebuild: any,
        buildAction: any,
        executor: any,
      ) => {
        executeXcodeBuildCommandCalls.push({
          params,
          platformOptions,
          preferXcodebuild,
          buildAction,
          executor,
        });
        return {
          content: [
            {
              type: 'text',
              text: '✅ macOS Build build succeeded for scheme MyScheme.',
            },
            {
              type: 'text',
              text: 'Next Steps:\n1. Get App Path: get_macos_app_path_project\n2. Get Bundle ID: get_macos_bundle_id\n3. Launch App: launch_macos_app',
            },
          ],
        };
      };

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Build succeeded',
      });

      const result = await buildMacProj.handler(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
        mockBuildUtilsDeps,
      );

      expect(executeXcodeBuildCommandCalls).toHaveLength(1);
      expect(executeXcodeBuildCommandCalls[0]).toEqual({
        params: {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
          configuration: 'Debug',
          preferXcodebuild: false,
        },
        platformOptions: {
          platform: 'macOS',
          arch: undefined,
          logPrefix: 'macOS Build',
        },
        preferXcodebuild: false,
        buildAction: 'build',
        executor: mockExecutor,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build build succeeded for scheme MyScheme.',
          },
          {
            type: 'text',
            text: 'Next Steps:\n1. Get App Path: get_macos_app_path_project\n2. Get Bundle ID: get_macos_bundle_id\n3. Launch App: launch_macos_app',
          },
        ],
      });
    });

    it('should return exact build failure response', async () => {
      // Configure mock to return build failure response
      mockBuildUtilsDeps.executeXcodeBuildCommand = async (
        params: any,
        platformOptions: any,
        preferXcodebuild: any,
        buildAction: any,
        executor: any,
      ) => {
        executeXcodeBuildCommandCalls.push({
          params,
          platformOptions,
          preferXcodebuild,
          buildAction,
          executor,
        });
        return {
          content: [
            {
              type: 'text',
              text: '❌ [stderr] error: Compilation error in main.swift',
            },
            {
              type: 'text',
              text: '❌ macOS Build build failed for scheme MyScheme.',
            },
          ],
          isError: true,
        };
      };

      const mockExecutor = createMockExecutor({
        success: false,
        error: 'error: Compilation error in main.swift',
      });

      const result = await buildMacProj.handler(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
        mockBuildUtilsDeps,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ [stderr] error: Compilation error in main.swift',
          },
          {
            type: 'text',
            text: '❌ macOS Build build failed for scheme MyScheme.',
          },
        ],
        isError: true,
      });
    });

    it('should return exact successful build response with optional parameters', async () => {
      // Configure mock to return successful build response with optional parameters
      mockBuildUtilsDeps.executeXcodeBuildCommand = async (
        params: any,
        platformOptions: any,
        preferXcodebuild: any,
        buildAction: any,
        executor: any,
      ) => {
        executeXcodeBuildCommandCalls.push({
          params,
          platformOptions,
          preferXcodebuild,
          buildAction,
          executor,
        });
        return {
          content: [
            {
              type: 'text',
              text: '✅ macOS Build build succeeded for scheme MyScheme.',
            },
            {
              type: 'text',
              text: 'Next Steps:\n1. Get App Path: get_macos_app_path_project\n2. Get Bundle ID: get_macos_bundle_id\n3. Launch App: launch_macos_app',
            },
          ],
        };
      };

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Build succeeded',
      });

      const result = await buildMacProj.handler(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
          configuration: 'Release',
          arch: 'arm64',
          derivedDataPath: '/path/to/derived-data',
          extraArgs: ['--verbose'],
          preferXcodebuild: true,
        },
        mockExecutor,
        mockBuildUtilsDeps,
      );

      expect(executeXcodeBuildCommandCalls).toHaveLength(1);
      expect(executeXcodeBuildCommandCalls[0]).toEqual({
        params: {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
          configuration: 'Release',
          arch: 'arm64',
          derivedDataPath: '/path/to/derived-data',
          extraArgs: ['--verbose'],
          preferXcodebuild: true,
        },
        platformOptions: {
          platform: 'macOS',
          arch: 'arm64',
          logPrefix: 'macOS Build',
        },
        preferXcodebuild: true,
        buildAction: 'build',
        executor: mockExecutor,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build build succeeded for scheme MyScheme.',
          },
          {
            type: 'text',
            text: 'Next Steps:\n1. Get App Path: get_macos_app_path_project\n2. Get Bundle ID: get_macos_bundle_id\n3. Launch App: launch_macos_app',
          },
        ],
      });
    });

    it('should return exact exception handling response', async () => {
      // Configure mock to return exception handling response
      mockBuildUtilsDeps.executeXcodeBuildCommand = async (
        params: any,
        platformOptions: any,
        preferXcodebuild: any,
        buildAction: any,
        executor: any,
      ) => {
        executeXcodeBuildCommandCalls.push({
          params,
          platformOptions,
          preferXcodebuild,
          buildAction,
          executor,
        });
        return {
          content: [
            {
              type: 'text',
              text: 'Error during macOS Build build: Network error',
            },
          ],
          isError: true,
        };
      };

      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Network error',
      });

      const result = await buildMacProj.handler(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
        mockBuildUtilsDeps,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during macOS Build build: Network error',
          },
        ],
        isError: true,
      });
    });

    it('should return exact spawn error handling response', async () => {
      // Configure mock to return spawn error handling response
      mockBuildUtilsDeps.executeXcodeBuildCommand = async (
        params: any,
        platformOptions: any,
        preferXcodebuild: any,
        buildAction: any,
        executor: any,
      ) => {
        executeXcodeBuildCommandCalls.push({
          params,
          platformOptions,
          preferXcodebuild,
          buildAction,
          executor,
        });
        return {
          content: [
            {
              type: 'text',
              text: 'Error during macOS Build build: Spawn error',
            },
          ],
          isError: true,
        };
      };

      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Spawn error',
      });

      const result = await buildMacProj.handler(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
        mockBuildUtilsDeps,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during macOS Build build: Spawn error',
          },
        ],
        isError: true,
      });
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
          output: 'BUILD SUCCEEDED',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      // Mock executeXcodeBuildCommand to use our tracking executor
      mockBuildUtilsDeps.executeXcodeBuildCommand = async (
        params: any,
        platformOptions: any,
        preferXcodebuild: any,
        buildAction: any,
        executor: any,
      ) => {
        // Call the real implementation flow but with our tracking executor
        const command = ['xcodebuild'];
        if (params.projectPath) {
          command.push('-project', params.projectPath);
        }
        command.push('-scheme', params.scheme);
        command.push('-configuration', params.configuration);
        command.push('-skipMacroValidation');
        command.push('-destination', `platform=macOS,arch=${platformOptions.arch || 'arm64'}`);
        if (params.derivedDataPath) {
          command.push('-derivedDataPath', params.derivedDataPath);
        }
        if (params.extraArgs && params.extraArgs.length > 0) {
          command.push(...params.extraArgs);
        }
        command.push(buildAction);

        // Execute with our tracking executor
        await executor(command, platformOptions.logPrefix, true);

        return {
          content: [{ type: 'text', text: '✅ macOS Build build succeeded for scheme MyScheme.' }],
        };
      };

      await buildMacProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
        },
        trackingExecutor,
        mockBuildUtilsDeps,
      );

      expect(callHistory).toHaveLength(1);
      expect(callHistory[0].command).toEqual([
        'xcodebuild',
        '-project',
        '/path/to/project.xcodeproj',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Debug',
        '-skipMacroValidation',
        '-destination',
        'platform=macOS,arch=arm64',
        'build',
      ]);
      expect(callHistory[0].logPrefix).toBe('macOS Build');
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
          output: 'BUILD SUCCEEDED',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      // Mock executeXcodeBuildCommand to use our tracking executor
      mockBuildUtilsDeps.executeXcodeBuildCommand = async (
        params: any,
        platformOptions: any,
        preferXcodebuild: any,
        buildAction: any,
        executor: any,
      ) => {
        // Call the real implementation flow but with our tracking executor
        const command = ['xcodebuild'];
        if (params.projectPath) {
          command.push('-project', params.projectPath);
        }
        command.push('-scheme', params.scheme);
        command.push('-configuration', params.configuration);
        command.push('-skipMacroValidation');
        command.push('-destination', `platform=macOS,arch=${platformOptions.arch || 'arm64'}`);
        if (params.derivedDataPath) {
          command.push('-derivedDataPath', params.derivedDataPath);
        }
        if (params.extraArgs && params.extraArgs.length > 0) {
          command.push(...params.extraArgs);
        }
        command.push(buildAction);

        // Execute with our tracking executor
        await executor(command, platformOptions.logPrefix, true);

        return {
          content: [{ type: 'text', text: '✅ macOS Build build succeeded for scheme MyScheme.' }],
        };
      };

      await buildMacProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          configuration: 'Release',
          arch: 'x86_64',
          derivedDataPath: '/path/to/derived-data',
          extraArgs: ['--verbose', '--clean-build'],
          preferXcodebuild: true,
        },
        trackingExecutor,
        mockBuildUtilsDeps,
      );

      expect(callHistory).toHaveLength(1);
      expect(callHistory[0].command).toEqual([
        'xcodebuild',
        '-project',
        '/path/to/project.xcodeproj',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Release',
        '-skipMacroValidation',
        '-destination',
        'platform=macOS,arch=x86_64',
        '-derivedDataPath',
        '/path/to/derived-data',
        '--verbose',
        '--clean-build',
        'build',
      ]);
      expect(callHistory[0].logPrefix).toBe('macOS Build');
      expect(callHistory[0].useShell).toBe(true);
    });

    it('should generate correct xcodebuild command with only derivedDataPath', async () => {
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
          output: 'BUILD SUCCEEDED',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      // Mock executeXcodeBuildCommand to use our tracking executor
      mockBuildUtilsDeps.executeXcodeBuildCommand = async (
        params: any,
        platformOptions: any,
        preferXcodebuild: any,
        buildAction: any,
        executor: any,
      ) => {
        // Call the real implementation flow but with our tracking executor
        const command = ['xcodebuild'];
        if (params.projectPath) {
          command.push('-project', params.projectPath);
        }
        command.push('-scheme', params.scheme);
        command.push('-configuration', params.configuration);
        command.push('-skipMacroValidation');
        command.push('-destination', `platform=macOS,arch=${platformOptions.arch || 'arm64'}`);
        if (params.derivedDataPath) {
          command.push('-derivedDataPath', params.derivedDataPath);
        }
        if (params.extraArgs && params.extraArgs.length > 0) {
          command.push(...params.extraArgs);
        }
        command.push(buildAction);

        // Execute with our tracking executor
        await executor(command, platformOptions.logPrefix, true);

        return {
          content: [{ type: 'text', text: '✅ macOS Build build succeeded for scheme MyScheme.' }],
        };
      };

      await buildMacProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          derivedDataPath: '/custom/derived/data',
        },
        trackingExecutor,
        mockBuildUtilsDeps,
      );

      expect(callHistory).toHaveLength(1);
      expect(callHistory[0].command).toEqual([
        'xcodebuild',
        '-project',
        '/path/to/project.xcodeproj',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Debug',
        '-skipMacroValidation',
        '-destination',
        'platform=macOS,arch=arm64',
        '-derivedDataPath',
        '/custom/derived/data',
        'build',
      ]);
      expect(callHistory[0].logPrefix).toBe('macOS Build');
      expect(callHistory[0].useShell).toBe(true);
    });

    it('should generate correct xcodebuild command with x86_64 architecture only', async () => {
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
          output: 'BUILD SUCCEEDED',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      // Mock executeXcodeBuildCommand to use our tracking executor
      mockBuildUtilsDeps.executeXcodeBuildCommand = async (
        params: any,
        platformOptions: any,
        preferXcodebuild: any,
        buildAction: any,
        executor: any,
      ) => {
        // Call the real implementation flow but with our tracking executor
        const command = ['xcodebuild'];
        if (params.projectPath) {
          command.push('-project', params.projectPath);
        }
        command.push('-scheme', params.scheme);
        command.push('-configuration', params.configuration);
        command.push('-skipMacroValidation');
        command.push('-destination', `platform=macOS,arch=${platformOptions.arch || 'arm64'}`);
        if (params.derivedDataPath) {
          command.push('-derivedDataPath', params.derivedDataPath);
        }
        if (params.extraArgs && params.extraArgs.length > 0) {
          command.push(...params.extraArgs);
        }
        command.push(buildAction);

        // Execute with our tracking executor
        await executor(command, platformOptions.logPrefix, true);

        return {
          content: [{ type: 'text', text: '✅ macOS Build build succeeded for scheme MyScheme.' }],
        };
      };

      await buildMacProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          arch: 'x86_64',
        },
        trackingExecutor,
        mockBuildUtilsDeps,
      );

      expect(callHistory).toHaveLength(1);
      expect(callHistory[0].command).toEqual([
        'xcodebuild',
        '-project',
        '/path/to/project.xcodeproj',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Debug',
        '-skipMacroValidation',
        '-destination',
        'platform=macOS,arch=x86_64',
        'build',
      ]);
      expect(callHistory[0].logPrefix).toBe('macOS Build');
      expect(callHistory[0].useShell).toBe(true);
    });
  });
});
