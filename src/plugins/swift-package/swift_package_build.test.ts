/**
 * Tests for swift_package_build plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import swiftPackageBuild from './swift_package_build.ts';

vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
  createErrorResponse: vi.fn(),
  executeCommand: vi.fn(),
}));

describe('swift_package_build plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(swiftPackageBuild.name).toBe('swift_package_build');
    });

    it('should have correct description', () => {
      expect(swiftPackageBuild.description).toBe('Builds a Swift Package with swift build');
    });

    it('should have handler function', () => {
      expect(typeof swiftPackageBuild.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(swiftPackageBuild.schema.packagePath.safeParse('/test/package').success).toBe(true);
      expect(swiftPackageBuild.schema.packagePath.safeParse('').success).toBe(true);

      // Test optional fields
      expect(swiftPackageBuild.schema.targetName.safeParse('MyTarget').success).toBe(true);
      expect(swiftPackageBuild.schema.targetName.safeParse(undefined).success).toBe(true);
      expect(swiftPackageBuild.schema.configuration.safeParse('debug').success).toBe(true);
      expect(swiftPackageBuild.schema.configuration.safeParse('release').success).toBe(true);
      expect(swiftPackageBuild.schema.configuration.safeParse(undefined).success).toBe(true);
      expect(swiftPackageBuild.schema.architectures.safeParse(['arm64']).success).toBe(true);
      expect(swiftPackageBuild.schema.architectures.safeParse(undefined).success).toBe(true);
      expect(swiftPackageBuild.schema.parseAsLibrary.safeParse(true).success).toBe(true);
      expect(swiftPackageBuild.schema.parseAsLibrary.safeParse(undefined).success).toBe(true);

      // Test invalid inputs
      expect(swiftPackageBuild.schema.packagePath.safeParse(null).success).toBe(false);
      expect(swiftPackageBuild.schema.configuration.safeParse('invalid').success).toBe(false);
      expect(swiftPackageBuild.schema.architectures.safeParse('not-array').success).toBe(false);
      expect(swiftPackageBuild.schema.parseAsLibrary.safeParse('yes').success).toBe(false);
    });
  });

  let mockValidateRequiredParam: MockedFunction<any>;
  let mockExecuteCommand: MockedFunction<any>;
  let mockLog: MockedFunction<any>;
  let mockCreateErrorResponse: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');

    mockValidateRequiredParam = utils.validateRequiredParam as MockedFunction<any>;
    mockExecuteCommand = utils.executeCommand as MockedFunction<any>;
    mockLog = utils.log as MockedFunction<any>;
    mockCreateErrorResponse = utils.createErrorResponse as MockedFunction<any>;

    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact validation error for missing packagePath', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: false,
        errorResponse: {
          content: [
            {
              type: 'text',
              text: "Required parameter 'packagePath' is missing. Please provide a value for this parameter.",
            },
          ],
          isError: true,
        },
      });

      const result = await swiftPackageBuild.handler({});

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'packagePath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return exact successful build response', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Build complete.',
        error: null,
      });

      const result = await swiftPackageBuild.handler({
        packagePath: '/test/package',
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: '✅ Swift package build succeeded.' },
          {
            type: 'text',
            text: '💡 Next: Run tests with swift_package_test or execute with swift_package_run',
          },
          { type: 'text', text: 'Build complete.' },
        ],
        isError: false,
      });
    });

    it('should return exact error response for build failure', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockCreateErrorResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: '❌ Swift package build failed: Compilation failed: error in main.swift',
          },
        ],
        isError: true,
      });
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Compilation failed: error in main.swift',
      });

      const result = await swiftPackageBuild.handler({
        packagePath: '/test/package',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Swift package build failed: Compilation failed: error in main.swift',
          },
        ],
        isError: true,
      });
    });

    it('should handle exception during command execution', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockCreateErrorResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Command execution failed: spawn ENOENT',
          },
        ],
        isError: true,
      });
      mockExecuteCommand.mockRejectedValue(new Error('spawn ENOENT'));

      const result = await swiftPackageBuild.handler({
        packagePath: '/test/package',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Command execution failed: spawn ENOENT',
          },
        ],
        isError: true,
      });
    });

    it('should handle build with all parameters', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Build complete.',
        error: null,
      });

      const result = await swiftPackageBuild.handler({
        packagePath: '/test/package',
        targetName: 'MyTarget',
        configuration: 'release',
        architectures: ['arm64', 'x86_64'],
        parseAsLibrary: true,
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: '✅ Swift package build succeeded.' },
          {
            type: 'text',
            text: '💡 Next: Run tests with swift_package_test or execute with swift_package_run',
          },
          { type: 'text', text: 'Build complete.' },
        ],
        isError: false,
      });
    });
  });
});
