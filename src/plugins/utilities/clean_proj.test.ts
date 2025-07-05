/**
 * Clean Project Plugin Tests - Test coverage for clean_proj tool
 *
 * This test file provides complete coverage for the clean_proj plugin tool:
 * - cleanProject: Clean build products for project
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive parameter testing.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import cleanProj from './clean_proj.ts';
import { log, executeXcodeBuildCommand, validateRequiredParam } from '../../utils/index.js';

// Mock all external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  executeXcodeBuildCommand: vi.fn(),
  validateRequiredParam: vi.fn(),
  XcodePlatform: {
    macOS: 'macOS',
    iOS: 'iOS',
  },
}));

describe('clean_proj plugin tests', () => {
  let mockLog: MockedFunction<typeof log>;
  let mockExecuteXcodeBuildCommand: MockedFunction<typeof executeXcodeBuildCommand>;
  let mockValidateRequiredParam: MockedFunction<typeof validateRequiredParam>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLog = vi.mocked(log);
    mockExecuteXcodeBuildCommand = vi.mocked(executeXcodeBuildCommand);
    mockValidateRequiredParam = vi.mocked(validateRequiredParam);

    // Default success behavior for executeXcodeBuildCommand
    mockExecuteXcodeBuildCommand.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: '✅ Clean succeeded for scheme MyScheme.',
        },
      ],
      isError: false,
    });

    // Default success behavior for validateRequiredParam
    mockValidateRequiredParam.mockReturnValue({
      isValid: true,
      errorResponse: null,
    });
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(cleanProj.name).toBe('clean_proj');
    });

    it('should have correct description field', () => {
      expect(cleanProj.description).toBe(
        "Cleans build products and intermediate files from a project. IMPORTANT: Requires projectPath. Example: clean_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
      );
    });

    it('should have handler as function', () => {
      expect(typeof cleanProj.handler).toBe('function');
    });

    it('should have valid schema with required fields', () => {
      const schema = z.object(cleanProj.schema);

      // Test valid input
      expect(
        schema.safeParse({
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
          configuration: 'Debug',
          derivedDataPath: '/path/to/derived/data',
          extraArgs: ['--verbose'],
          preferXcodebuild: true,
        }).success,
      ).toBe(true);

      // Test minimal valid input
      expect(
        schema.safeParse({
          projectPath: '/path/to/MyProject.xcodeproj',
        }).success,
      ).toBe(true);

      // Test invalid input - missing projectPath
      expect(
        schema.safeParse({
          scheme: 'MyScheme',
        }).success,
      ).toBe(false);

      // Test invalid input - wrong type for projectPath
      expect(
        schema.safeParse({
          projectPath: 123,
        }).success,
      ).toBe(false);

      // Test invalid input - wrong type for extraArgs
      expect(
        schema.safeParse({
          projectPath: '/path/to/MyProject.xcodeproj',
          extraArgs: 'not-an-array',
        }).success,
      ).toBe(false);

      // Test invalid input - wrong type for preferXcodebuild
      expect(
        schema.safeParse({
          projectPath: '/path/to/MyProject.xcodeproj',
          preferXcodebuild: 'not-a-boolean',
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return success response for valid clean project request', async () => {
      const result = await cleanProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Clean succeeded for scheme MyScheme.',
          },
        ],
        isError: false,
      });

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
          configuration: 'Debug',
        },
        {
          platform: 'macOS',
          logPrefix: 'Clean',
        },
        false,
        'clean',
      );
    });

    it('should return success response with all optional parameters', async () => {
      const result = await cleanProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
        configuration: 'Release',
        derivedDataPath: '/path/to/derived/data',
        extraArgs: ['--verbose'],
        preferXcodebuild: true,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Clean succeeded for scheme MyScheme.',
          },
        ],
        isError: false,
      });

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived/data',
          extraArgs: ['--verbose'],
          preferXcodebuild: true,
        },
        {
          platform: 'macOS',
          logPrefix: 'Clean',
        },
        false,
        'clean',
      );
    });

    it('should return success response with minimal parameters and defaults', async () => {
      const result = await cleanProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Clean succeeded for scheme MyScheme.',
          },
        ],
        isError: false,
      });

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: '',
          configuration: 'Debug',
        },
        {
          platform: 'macOS',
          logPrefix: 'Clean',
        },
        false,
        'clean',
      );
    });

    it('should return error response for command failure', async () => {
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '❌ Clean failed for scheme MyScheme.',
          },
        ],
        isError: true,
      });

      const result = await cleanProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Clean failed for scheme MyScheme.',
          },
        ],
        isError: true,
      });
    });

    it('should return error response for validation failure', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: false,
        errorResponse: {
          content: [
            {
              type: 'text',
              text: 'Error: projectPath is required but was not provided or is invalid.',
            },
          ],
          isError: true,
        },
      });

      const result = await cleanProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: projectPath is required but was not provided or is invalid.',
          },
        ],
        isError: true,
      });
    });

    it('should handle executeXcodeBuildCommand throwing Error', async () => {
      mockExecuteXcodeBuildCommand.mockRejectedValue(new Error('Build execution failed'));

      await expect(
        cleanProj.handler({
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
        }),
      ).rejects.toThrow('Build execution failed');
    });

    it('should handle executeXcodeBuildCommand throwing string error', async () => {
      mockExecuteXcodeBuildCommand.mockRejectedValue('String error occurred');

      await expect(
        cleanProj.handler({
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
        }),
      ).rejects.toBe('String error occurred');
    });
  });
});
