import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import buildSimNameProj from '../build_sim_name_proj.ts';

describe('build_sim_name_proj plugin', () => {
  let mockExecuteXcodeBuildCommand: (
    params: any,
    platformOptions: any,
    preferXcodebuild: boolean,
    buildAction: string,
    executor: any,
  ) => Promise<any>;

  // Reset the mock function
  mockExecuteXcodeBuildCommand = async (
    params,
    platformOptions,
    preferXcodebuild,
    buildAction,
    executor,
  ) => {
    // Default successful response
    return {
      content: [
        {
          type: 'text',
          text: `✅ ${platformOptions.logPrefix} ${buildAction} succeeded for scheme ${params.scheme}.`,
        },
      ],
      isError: false,
    };
  };

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(buildSimNameProj.name).toBe('build_sim_name_proj');
    });

    it('should have correct description field', () => {
      expect(buildSimNameProj.description).toBe(
        "Builds an app from a project file for a specific simulator by name. IMPORTANT: Requires projectPath, scheme, and simulatorName. Example: build_sim_name_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme', simulatorName: 'iPhone 16' })",
      );
    });

    it('should have handler as a function', () => {
      expect(typeof buildSimNameProj.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(buildSimNameProj.schema);

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
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return validation error for missing projectPath', async () => {
      const result = await buildSimNameProj.handler({
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
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
      const result = await buildSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        simulatorName: 'iPhone 16',
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

    it('should return validation error for missing simulatorName', async () => {
      const result = await buildSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
      });

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

    it('should return build error when build fails', async () => {
      // Configure mock to return failure
      mockExecuteXcodeBuildCommand = async (
        params,
        platformOptions,
        preferXcodebuild,
        buildAction,
        executor,
      ) => {
        return {
          content: [
            { type: 'text', text: 'Error: Xcode build failed\nDetails: Build failed with error' },
          ],
          isError: true,
        };
      };

      const result = await buildSimNameProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
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

    it('should handle successful build', async () => {
      // Configure mock to return success
      mockExecuteXcodeBuildCommand = async (
        params,
        platformOptions,
        preferXcodebuild,
        buildAction,
        executor,
      ) => {
        return {
          content: [
            {
              type: 'text',
              text: "✅ iOS Simulator build succeeded for scheme MyScheme targeting simulator name 'iPhone 16'.",
            },
          ],
          isError: false,
        };
      };

      const result = await buildSimNameProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        undefined,
        mockExecuteXcodeBuildCommand,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "✅ iOS Simulator build succeeded for scheme MyScheme targeting simulator name 'iPhone 16'.",
          },
        ],
        isError: false,
      });
    });

    it('should handle command generation with extra args', async () => {
      // Track calls to the mock function
      let capturedCallArgs: any[] = [];

      mockExecuteXcodeBuildCommand = async (
        params,
        platformOptions,
        preferXcodebuild,
        buildAction,
        executor,
      ) => {
        capturedCallArgs = [params, platformOptions, preferXcodebuild, buildAction, executor];
        return {
          content: [{ type: 'text', text: 'Build failed' }],
          isError: true,
        };
      };

      await buildSimNameProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--custom-arg'],
          preferXcodebuild: true,
        },
        undefined,
        mockExecuteXcodeBuildCommand,
      );

      expect(capturedCallArgs[0]).toEqual(
        expect.objectContaining({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--custom-arg'],
          preferXcodebuild: true,
        }),
      );
      expect(capturedCallArgs[1]).toEqual(
        expect.objectContaining({
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
          logPrefix: 'iOS Simulator Build',
        }),
      );
      expect(capturedCallArgs[2]).toBe(true);
      expect(capturedCallArgs[3]).toBe('build');
      expect(capturedCallArgs[4]).toBe(undefined);
    });
  });
});
