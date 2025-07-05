/**
 * Tests for swift_package_test plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import swiftPackageTest from './swift_package_test.ts';

vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
  createErrorResponse: vi.fn(),
  createTextResponse: vi.fn(),
  executeCommand: vi.fn(),
}));

describe('swift_package_test plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(swiftPackageTest.name).toBe('swift_package_test');
    });

    it('should have correct description', () => {
      expect(swiftPackageTest.description).toBe('Runs tests for a Swift Package with swift test');
    });

    it('should have handler function', () => {
      expect(typeof swiftPackageTest.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(swiftPackageTest.schema.packagePath.safeParse('/test/package').success).toBe(true);
      expect(swiftPackageTest.schema.packagePath.safeParse('').success).toBe(true);

      // Test optional fields
      expect(swiftPackageTest.schema.testProduct.safeParse('MyTests').success).toBe(true);
      expect(swiftPackageTest.schema.testProduct.safeParse(undefined).success).toBe(true);
      expect(swiftPackageTest.schema.filter.safeParse('Test.*').success).toBe(true);
      expect(swiftPackageTest.schema.filter.safeParse(undefined).success).toBe(true);
      expect(swiftPackageTest.schema.configuration.safeParse('debug').success).toBe(true);
      expect(swiftPackageTest.schema.configuration.safeParse('release').success).toBe(true);
      expect(swiftPackageTest.schema.configuration.safeParse(undefined).success).toBe(true);
      expect(swiftPackageTest.schema.parallel.safeParse(true).success).toBe(true);
      expect(swiftPackageTest.schema.parallel.safeParse(undefined).success).toBe(true);
      expect(swiftPackageTest.schema.showCodecov.safeParse(true).success).toBe(true);
      expect(swiftPackageTest.schema.showCodecov.safeParse(undefined).success).toBe(true);
      expect(swiftPackageTest.schema.parseAsLibrary.safeParse(true).success).toBe(true);
      expect(swiftPackageTest.schema.parseAsLibrary.safeParse(undefined).success).toBe(true);

      // Test invalid inputs
      expect(swiftPackageTest.schema.packagePath.safeParse(null).success).toBe(false);
      expect(swiftPackageTest.schema.configuration.safeParse('invalid').success).toBe(false);
      expect(swiftPackageTest.schema.parallel.safeParse('yes').success).toBe(false);
      expect(swiftPackageTest.schema.showCodecov.safeParse('yes').success).toBe(false);
      expect(swiftPackageTest.schema.parseAsLibrary.safeParse('yes').success).toBe(false);
    });
  });

  let mockValidateRequiredParam: MockedFunction<any>;
  let mockExecuteCommand: MockedFunction<any>;
  let mockLog: MockedFunction<any>;
  let mockCreateErrorResponse: MockedFunction<any>;
  let mockCreateTextResponse: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');

    mockValidateRequiredParam = utils.validateRequiredParam as MockedFunction<any>;
    mockExecuteCommand = utils.executeCommand as MockedFunction<any>;
    mockLog = utils.log as MockedFunction<any>;
    mockCreateErrorResponse = utils.createErrorResponse as MockedFunction<any>;
    mockCreateTextResponse = utils.createTextResponse as MockedFunction<any>;

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

      const result = await swiftPackageTest.handler({});

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

    it('should return exact successful test response', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'All tests passed.',
        error: null,
      });

      const result = await swiftPackageTest.handler({
        packagePath: '/test/package',
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: '✅ Swift package tests completed.' },
          {
            type: 'text',
            text: '💡 Next: Execute your app with swift_package_run if tests passed',
          },
          { type: 'text', text: 'All tests passed.' },
        ],
      });
    });

    it('should return exact error response for test failure', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockCreateErrorResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: '❌ Swift package tests failed: 2 tests failed',
          },
        ],
        isError: true,
      });
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: '2 tests failed',
      });

      const result = await swiftPackageTest.handler({
        packagePath: '/test/package',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Swift package tests failed: 2 tests failed',
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

      const result = await swiftPackageTest.handler({
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

    it('should handle test with all parameters', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Tests completed.',
        error: null,
      });

      const result = await swiftPackageTest.handler({
        packagePath: '/test/package',
        testProduct: 'MyTests',
        filter: 'Test.*',
        configuration: 'release',
        parallel: false,
        showCodecov: true,
        parseAsLibrary: true,
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: '✅ Swift package tests completed.' },
          {
            type: 'text',
            text: '💡 Next: Execute your app with swift_package_run if tests passed',
          },
          { type: 'text', text: 'Tests completed.' },
        ],
      });
    });
  });
});
