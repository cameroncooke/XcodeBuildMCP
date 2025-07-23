/**
 * Tests for swift_package_test plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect } from 'vitest';
import {
  createMockExecutor,
  createMockFileSystemExecutor,
  createNoopExecutor,
} from '../../../../utils/command.js';
import swiftPackageTest, { swift_package_testLogic } from '../swift_package_test.ts';

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

  describe('Command Generation Testing', () => {
    it('should build correct command for basic test', async () => {
      const calls: any[] = [];
      const mockExecutor = async (
        args: string[],
        name: string,
        hideOutput: boolean,
        workingDir: string | undefined,
      ) => {
        calls.push({ args, name, hideOutput, workingDir });
        return {
          success: true,
          output: 'Test Passed',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await swift_package_testLogic(
        {
          packagePath: '/test/package',
        },
        mockExecutor,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({
        args: ['swift', 'test', '--package-path', '/test/package'],
        name: 'Swift Package Test',
        hideOutput: true,
        workingDir: undefined,
      });
    });

    it('should build correct command with all parameters', async () => {
      const calls: any[] = [];
      const mockExecutor = async (
        args: string[],
        name: string,
        hideOutput: boolean,
        workingDir: string | undefined,
      ) => {
        calls.push({ args, name, hideOutput, workingDir });
        return {
          success: true,
          output: 'Tests completed',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await swift_package_testLogic(
        {
          packagePath: '/test/package',
          testProduct: 'MyTests',
          filter: 'Test.*',
          configuration: 'release',
          parallel: false,
          showCodecov: true,
          parseAsLibrary: true,
        },
        mockExecutor,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({
        args: [
          'swift',
          'test',
          '--package-path',
          '/test/package',
          '-c',
          'release',
          '--test-product',
          'MyTests',
          '--filter',
          'Test.*',
          '--no-parallel',
          '--show-code-coverage',
          '-Xswiftc',
          '-parse-as-library',
        ],
        name: 'Swift Package Test',
        hideOutput: true,
        workingDir: undefined,
      });
    });
  });

  describe('Response Logic Testing', () => {
    it('should return validation error for missing packagePath', async () => {
      const result = await swift_package_testLogic({}, createNoopExecutor());

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

    it('should return successful test response', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'All tests passed.',
      });

      const result = await swift_package_testLogic(
        {
          packagePath: '/test/package',
        },
        mockExecutor,
      );

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

    it('should return error response for test failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: '2 tests failed',
      });

      const result = await swift_package_testLogic(
        {
          packagePath: '/test/package',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Swift package tests failed\nDetails: 2 tests failed',
          },
        ],
        isError: true,
      });
    });

    it('should handle spawn error', async () => {
      const mockExecutor = async () => {
        throw new Error('spawn ENOENT');
      };

      const result = await swift_package_testLogic(
        {
          packagePath: '/test/package',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Failed to execute swift test\nDetails: spawn ENOENT',
          },
        ],
        isError: true,
      });
    });

    it('should handle successful test with parameters', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Tests completed.',
      });

      const result = await swift_package_testLogic(
        {
          packagePath: '/test/package',
          testProduct: 'MyTests',
          filter: 'Test.*',
          configuration: 'release',
          parallel: false,
          showCodecov: true,
          parseAsLibrary: true,
        },
        mockExecutor,
      );

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
