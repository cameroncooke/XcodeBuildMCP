import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import buildSimNameProj from '../build_sim_name_proj.ts';

// Mock executeXcodeBuildCommand since it doesn't fully support CommandExecutor yet
vi.mock('../../../utils/build-utils.js', () => ({
  executeXcodeBuildCommand: vi.fn(),
}));

describe('build_sim_name_proj plugin', () => {
  let mockExecuteXcodeBuildCommand: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const buildUtils = await import('../../../utils/build-utils.js');
    mockExecuteXcodeBuildCommand = vi.mocked(buildUtils.executeXcodeBuildCommand);
    vi.clearAllMocks();
  });

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
      // Mock build failure
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          { type: 'text', text: 'Error: Xcode build failed\nDetails: Build failed with error' },
        ],
        isError: true,
      });

      const result = await buildSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'Error: Xcode build failed\nDetails: Build failed with error' },
        ],
        isError: true,
      });
    });

    it('should handle successful build', async () => {
      // Mock successful build
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: "✅ iOS Simulator build succeeded for scheme MyScheme targeting simulator name 'iPhone 16'.",
          },
        ],
        isError: false,
      });

      const result = await buildSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

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
      // Mock build failure to test command generation
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build failed' }],
        isError: true,
      });

      await buildSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
        configuration: 'Release',
        derivedDataPath: '/path/to/derived',
        extraArgs: ['--custom-arg'],
        preferXcodebuild: true,
      });

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--custom-arg'],
          preferXcodebuild: true,
        }),
        expect.objectContaining({
          platform: 'iOS Simulator',
          simulatorName: 'iPhone 16',
          logPrefix: 'iOS Simulator Build',
        }),
        true,
        'build',
        undefined,
      );
    });
  });
});
