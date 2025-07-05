/**
 * Clean Workspace Plugin Tests - Comprehensive test coverage for clean_ws plugin
 *
 * This test file provides complete coverage for the clean_ws plugin:
 * - cleanWorkspace: Clean build products for workspace
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive parameter testing.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import cleanWs from './clean_ws.ts';
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

describe('clean_ws plugin tests', () => {
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
      expect(cleanWs.name).toBe('clean_ws');
    });

    it('should have correct description field', () => {
      expect(cleanWs.description).toBe(
        "Cleans build products for a specific workspace using xcodebuild. IMPORTANT: Requires workspacePath. Scheme/Configuration are optional. Example: clean_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })",
      );
    });

    it('should have handler as function', () => {
      expect(typeof cleanWs.handler).toBe('function');
    });

    it('should have valid schema with required fields', () => {
      const schema = z.object(cleanWs.schema);

      // Test valid input
      expect(
        schema.safeParse({
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Debug',
          derivedDataPath: '/path/to/derived/data',
          extraArgs: ['--verbose'],
        }).success,
      ).toBe(true);

      // Test minimal valid input
      expect(
        schema.safeParse({
          workspacePath: '/path/to/MyProject.xcworkspace',
        }).success,
      ).toBe(true);

      // Test invalid input - missing workspacePath
      expect(
        schema.safeParse({
          scheme: 'MyScheme',
        }).success,
      ).toBe(false);

      // Test invalid input - wrong type for workspacePath
      expect(
        schema.safeParse({
          workspacePath: 123,
        }).success,
      ).toBe(false);

      // Test invalid input - wrong type for extraArgs
      expect(
        schema.safeParse({
          workspacePath: '/path/to/MyProject.xcworkspace',
          extraArgs: 'not-an-array',
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return success response for valid clean workspace request', async () => {
      const result = await cleanWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
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
          workspacePath: '/path/to/MyProject.xcworkspace',
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
      const result = await cleanWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Release',
        derivedDataPath: '/path/to/derived/data',
        extraArgs: ['--verbose'],
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
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived/data',
          extraArgs: ['--verbose'],
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
      const result = await cleanWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
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
          workspacePath: '/path/to/MyProject.xcworkspace',
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

      const result = await cleanWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
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
              text: 'Error: workspacePath is required but was not provided or is invalid.',
            },
          ],
          isError: true,
        },
      });

      const result = await cleanWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: workspacePath is required but was not provided or is invalid.',
          },
        ],
        isError: true,
      });
    });

    it('should handle executeXcodeBuildCommand throwing Error', async () => {
      mockExecuteXcodeBuildCommand.mockRejectedValue(new Error('Build execution failed'));

      await expect(
        cleanWs.handler({
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        }),
      ).rejects.toThrow('Build execution failed');
    });

    it('should handle executeXcodeBuildCommand throwing string error', async () => {
      mockExecuteXcodeBuildCommand.mockRejectedValue('String error occurred');

      await expect(
        cleanWs.handler({
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        }),
      ).rejects.toBe('String error occurred');
    });
  });
});
