/**
 * Tests for build_dev_proj plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import buildDevProj from './build_dev_proj.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  validateRequiredParam: vi.fn(),
  executeXcodeBuildCommand: vi.fn(),
  log: vi.fn(),
}));

describe('build_dev_proj plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildDevProj.name).toBe('build_dev_proj');
    });

    it('should have correct description', () => {
      expect(buildDevProj.description).toBe(
        "Builds an app from a project file for a physical Apple device. IMPORTANT: Requires projectPath and scheme. Example: build_dev_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof buildDevProj.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        buildDevProj.schema.projectPath.safeParse('/path/to/MyProject.xcodeproj').success,
      ).toBe(true);
      expect(buildDevProj.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(buildDevProj.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(buildDevProj.schema.derivedDataPath.safeParse('/path/to/derived-data').success).toBe(
        true,
      );
      expect(buildDevProj.schema.extraArgs.safeParse(['--arg1', '--arg2']).success).toBe(true);
      expect(buildDevProj.schema.preferXcodebuild.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(buildDevProj.schema.projectPath.safeParse(null).success).toBe(false);
      expect(buildDevProj.schema.scheme.safeParse(null).success).toBe(false);
      expect(buildDevProj.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(buildDevProj.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
    });
  });

  let mockValidateRequiredParam: MockedFunction<any>;
  let mockExecuteXcodeBuildCommand: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');

    mockValidateRequiredParam = utils.validateRequiredParam as MockedFunction<any>;
    mockExecuteXcodeBuildCommand = utils.executeXcodeBuildCommand as MockedFunction<any>;

    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact successful build response', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '✅ Build succeeded for iOS Device\n\nBuild completed successfully',
          },
        ],
      });

      const result = await buildDevProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Build succeeded for iOS Device\n\nBuild completed successfully',
          },
        ],
      });
    });

    it('should return exact validation failure response for projectPath', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [
            {
              type: 'text',
              text: 'Failed to validate projectPath: projectPath is required',
            },
          ],
          isError: true,
        },
      });

      const result = await buildDevProj.handler({
        projectPath: '',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to validate projectPath: projectPath is required',
          },
        ],
        isError: true,
      });
    });

    it('should return exact validation failure response for scheme', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true }).mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [
            {
              type: 'text',
              text: 'Failed to validate scheme: scheme is required',
            },
          ],
          isError: true,
        },
      });

      const result = await buildDevProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: '',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to validate scheme: scheme is required',
          },
        ],
        isError: true,
      });
    });

    it('should return exact build failure response', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Failed to build: Compilation error in main.swift',
          },
        ],
        isError: true,
      });

      const result = await buildDevProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to build: Compilation error in main.swift',
          },
        ],
        isError: true,
      });
    });
  });
});
