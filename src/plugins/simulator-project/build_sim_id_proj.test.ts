import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import buildSimIdProj from './build_sim_id_proj.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
  executeXcodeBuildCommand: vi.fn(),
}));

describe('build_sim_id_proj plugin', () => {
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
      expect(buildSimIdProj.name).toBe('build_sim_id_proj');
    });

    it('should have correct description field', () => {
      expect(buildSimIdProj.description).toBe(
        "Builds an app from a project file for a specific simulator by UUID. IMPORTANT: Requires projectPath, scheme, and simulatorId. Example: build_sim_id_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme', simulatorId: 'SIMULATOR_UUID' })",
      );
    });

    it('should have handler as a function', () => {
      expect(typeof buildSimIdProj.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(buildSimIdProj.schema);

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

      const result = await buildSimIdProj.handler({
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

      const result = await buildSimIdProj.handler({
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

      const result = await buildSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: simulatorId is required' }],
        isError: true,
      });
    });

    it('should return success when build succeeds', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: '✅ iOS Simulator Build succeeded for scheme MyScheme.' }],
        isError: false,
      });

      const result = await buildSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
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

      const result = await buildSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
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

      const result = await buildSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
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

      const result = await buildSimIdProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        simulatorId: 'test-uuid',
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
