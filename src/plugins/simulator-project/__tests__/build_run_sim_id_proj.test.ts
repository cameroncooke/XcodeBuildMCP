import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import buildRunSimIdProj from '../build_run_sim_id_proj.ts';

describe('build_run_sim_id_proj plugin', () => {
  let mockExecSyncCalls: { command: string; result: string }[];
  let mockExecuteXcodeBuildCommandCalls: any[];

  mockExecSyncCalls = [];
  mockExecuteXcodeBuildCommandCalls = [];

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
      const result = await buildRunSimIdProj.handler({
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
      });

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
      const result = await buildRunSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        simulatorId: 'test-uuid',
      });

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
      const result = await buildRunSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
      });

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

      const result = await buildRunSimIdProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
        },
        undefined,
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

      // Create mock execSync function with sequential returns
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

      const result = await buildRunSimIdProj.handler(
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

      await buildRunSimIdProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorId: 'test-uuid',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--custom-arg'],
          preferXcodebuild: true,
        },
        undefined,
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
});
