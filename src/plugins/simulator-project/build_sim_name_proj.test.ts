import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import buildSimNameProj from './build_sim_name_proj.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
  executeXcodeBuildCommand: vi.fn(),
}));

describe('build_sim_name_proj plugin', () => {
  let mockLog: MockedFunction<any>;
  let mockValidateRequiredParam: MockedFunction<any>;
  let mockExecuteXcodeBuildCommand: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');
    mockLog = utils.log as MockedFunction<any>;
    mockValidateRequiredParam = utils.validateRequiredParam as MockedFunction<any>;
    mockExecuteXcodeBuildCommand = utils.executeXcodeBuildCommand as MockedFunction<any>;

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

      const result = await buildSimNameProj.handler({
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

      const result = await buildSimNameProj.handler({
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

      const result = await buildSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: simulatorName is required' }],
        isError: true,
      });
    });

    it('should return success when build succeeds', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: '✅ iOS Simulator Build succeeded for scheme MyScheme.' }],
        isError: false,
      });

      const result = await buildSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: '✅ iOS Simulator Build succeeded for scheme MyScheme.' }],
        isError: false,
      });
    });

    it('should return build error when build fails', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build failed with error' }],
        isError: true,
      });

      const result = await buildSimNameProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Build failed with error' }],
        isError: true,
      });
    });

    it('should handle Exception objects correctly', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Error during iOS Simulator Build build: Build error',
          },
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
          {
            type: 'text',
            text: 'Error during iOS Simulator Build build: Build error',
          },
        ],
        isError: true,
      });
    });

    it('should handle string errors correctly', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Error during iOS Simulator Build build: String error',
          },
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
          {
            type: 'text',
            text: 'Error during iOS Simulator Build build: String error',
          },
        ],
        isError: true,
      });
    });
  });
});
