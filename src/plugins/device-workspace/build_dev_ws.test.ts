/**
 * Tests for build_dev_ws plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import buildDevWs from './build_dev_ws.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  validateRequiredParam: vi.fn(),
  executeXcodeBuildCommand: vi.fn(),
}));

describe('build_dev_ws plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildDevWs.name).toBe('build_dev_ws');
    });

    it('should have correct description', () => {
      expect(buildDevWs.description).toBe(
        "Builds an app from a workspace for a physical Apple device. IMPORTANT: Requires workspacePath and scheme. Example: build_dev_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof buildDevWs.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        buildDevWs.schema.workspacePath.safeParse('/path/to/workspace.xcworkspace').success,
      ).toBe(true);
      expect(buildDevWs.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(buildDevWs.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(buildDevWs.schema.derivedDataPath.safeParse('/path/to/derived').success).toBe(true);
      expect(buildDevWs.schema.extraArgs.safeParse(['--quiet']).success).toBe(true);
      expect(buildDevWs.schema.preferXcodebuild.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(buildDevWs.schema.workspacePath.safeParse(123).success).toBe(false);
      expect(buildDevWs.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(buildDevWs.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
    });
  });

  let mockValidateRequiredParam: MockedFunction<any>;
  let mockExecuteXcodeBuildCommand: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');

    mockValidateRequiredParam = utils.validateRequiredParam as MockedFunction<any>;
    mockExecuteXcodeBuildCommand = utils.executeXcodeBuildCommand as MockedFunction<any>;

    // Default validation success
    mockValidateRequiredParam.mockReturnValue({ isValid: true });

    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact successful build response', async () => {
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: '✅ Build completed successfully' }],
      });

      const result = await buildDevWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Debug',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: '✅ Build completed successfully' }],
      });
    });

    it('should return exact validation error response for workspacePath', async () => {
      const validationError = {
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'workspacePath is required and cannot be empty' }],
          isError: true,
        },
      };
      mockValidateRequiredParam.mockReturnValueOnce(validationError);

      const result = await buildDevWs.handler({
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'workspacePath is required and cannot be empty' }],
        isError: true,
      });
    });

    it('should return exact validation error response for scheme', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true }).mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'scheme is required and cannot be empty' }],
          isError: true,
        },
      });

      const result = await buildDevWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'scheme is required and cannot be empty' }],
        isError: true,
      });
    });

    it('should return exact build failure response', async () => {
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build failed: scheme not found' }],
        isError: true,
      });

      const result = await buildDevWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'NonExistentScheme',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Build failed: scheme not found' }],
        isError: true,
      });
    });

    it('should use default configuration when not provided', async () => {
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: '✅ Build completed successfully' }],
      });

      await buildDevWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          configuration: 'Debug',
        }),
        expect.objectContaining({
          platform: 'iOS',
          logPrefix: 'iOS Device Build',
        }),
        undefined,
        'build',
      );
    });
  });
});
