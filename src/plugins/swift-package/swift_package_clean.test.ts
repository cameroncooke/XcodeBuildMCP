/**
 * Tests for swift_package_clean plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import swiftPackageClean from './swift_package_clean.ts';

vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
  createErrorResponse: vi.fn(),
  executeCommand: vi.fn(),
}));

describe('swift_package_clean plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(swiftPackageClean.name).toBe('swift_package_clean');
    });

    it('should have correct description', () => {
      expect(swiftPackageClean.description).toBe(
        'Cleans Swift Package build artifacts and derived data',
      );
    });

    it('should have handler function', () => {
      expect(typeof swiftPackageClean.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(swiftPackageClean.schema.packagePath.safeParse('/test/package').success).toBe(true);
      expect(swiftPackageClean.schema.packagePath.safeParse('').success).toBe(true);

      // Test invalid inputs
      expect(swiftPackageClean.schema.packagePath.safeParse(null).success).toBe(false);
      expect(swiftPackageClean.schema.packagePath.safeParse(undefined).success).toBe(false);
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

      const result = await swiftPackageClean.handler({});

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

    it('should return exact successful clean response', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Package cleaned successfully',
        error: null,
      });

      const result = await swiftPackageClean.handler({
        packagePath: '/test/package',
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: '✅ Swift package cleaned successfully.' },
          {
            type: 'text',
            text: '💡 Build artifacts and derived data removed. Ready for fresh build.',
          },
          { type: 'text', text: 'Package cleaned successfully' },
        ],
      });
    });

    it('should return exact successful clean response with no output', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: '',
        error: null,
      });

      const result = await swiftPackageClean.handler({
        packagePath: '/test/package',
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: '✅ Swift package cleaned successfully.' },
          {
            type: 'text',
            text: '💡 Build artifacts and derived data removed. Ready for fresh build.',
          },
          { type: 'text', text: '(clean completed silently)' },
        ],
      });
    });

    it('should return exact error response for clean failure', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockCreateErrorResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: '❌ Swift package clean failed: Permission denied',
          },
        ],
        isError: true,
      });
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Permission denied',
      });

      const result = await swiftPackageClean.handler({
        packagePath: '/test/package',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Swift package clean failed: Permission denied',
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

      const result = await swiftPackageClean.handler({
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
  });
});
