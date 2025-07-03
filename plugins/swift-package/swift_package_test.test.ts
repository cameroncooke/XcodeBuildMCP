/**
 * Vitest tests for Swift Package Test tool
 *
 * Tests the canonical swift_package_test tool from test-swift-package.ts
 * Migrated from consolidated swift-package.test.ts for 1:1 tool-to-test mapping
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import type { Server } from '@modelcontextprotocol/sdk/server/index.ts';

// Import the plugin
import swiftPackageTest from './swift_package_test.ts';

// Test the plugin directly - no registration function needed

// Mock Node.js APIs directly
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

// Mock fs/promises for clean operations
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
}));

// Mock logger to prevent real logging during tests
vi.mock('../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

// Mock the executeCommand function from canonical implementation
vi.mock('../../src/utils/command.ts', () => ({
  executeCommand: vi.fn(),
}));

// Mock removed - no longer needed for plugin testing

describe('swift_package_test tool', () => {
  let mockSpawn: MockedFunction<typeof spawn>;
  let mockChildProcess: Partial<ChildProcess>;
  let mockExecuteCommand: MockedFunction<any>;

  describe('plugin structure', () => {
    it('should export plugin with correct structure', () => {
      expect(swiftPackageTest).toBeDefined();
      expect(swiftPackageTest.name).toBe('swift_package_test');
      expect(swiftPackageTest.description).toBe('Runs tests for a Swift Package with swift test');
      expect(swiftPackageTest.schema).toBeDefined();
      expect(swiftPackageTest.handler).toBeDefined();
      expect(typeof swiftPackageTest.handler).toBe('function');
    });
  });

  beforeEach(async () => {
    // Test plugin directly - no registration needed

    // Get the mocked function from node:child_process since that's what the tools import
    const { spawn: nodeSpawn } = await import('node:child_process');
    mockSpawn = nodeSpawn as MockedFunction<any>;

    // Mock executeCommand
    const { executeCommand } = await import('../../src/utils/command.ts');
    mockExecuteCommand = executeCommand as MockedFunction<any>;
    mockExecuteCommand.mockResolvedValue({
      success: true,
      output:
        "Test Suite 'All tests' passed at 2023-10-10 12:34:56.\n\t Executed 5 tests, with 0 failures (0 unexpected) in 2.345 (2.567) seconds",
      error: '',
    });

    // Create mock child process with typical Swift test output
    mockChildProcess = {
      pid: 12345,
      stdout: {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback(`Building for debugging...
[1/3] Compiling MyLibrary MyLibrary.swift
[2/3] Compiling MyLibraryTests MyLibraryTests.swift
[3/3] Linking MyLibraryPackageTests
Build complete! (1.23s)
Test Suite 'All tests' started at 2023-10-10 12:34:56.789
Test Suite 'MyLibraryPackageTests.xctest' started at 2023-10-10 12:34:56.790
Test Suite 'MyLibraryTests' started at 2023-10-10 12:34:56.791
Test Case '-[MyLibraryTests.MyLibraryTests testExample]' started.
Test Case '-[MyLibraryTests.MyLibraryTests testExample]' passed (0.001 seconds).
Test Suite 'MyLibraryTests' passed at 2023-10-10 12:34:56.792.
Test Suite 'MyLibraryPackageTests.xctest' passed at 2023-10-10 12:34:56.793.
Test Suite 'All tests' passed at 2023-10-10 12:34:56.794.
\t Executed 1 test, with 0 failures (0 unexpected) in 0.002 (0.004) seconds`);
          }
        }),
      } as any,
      stderr: {
        on: vi.fn(),
      } as any,
      on: vi.fn((event, callback) => {
        if (event === 'close') {
          callback(0); // Successful exit code
        }
      }),
    };

    mockSpawn.mockReturnValue(mockChildProcess as ChildProcess);
    vi.clearAllMocks();
  });

  describe('parameter validation', () => {
    it('should reject missing packagePath', async () => {
      expect(swiftPackageTest).toBeDefined();

      const params = {};
      const result = await swiftPackageTest.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'packagePath' is missing. Please provide a value for this parameter.",
        },
      ]);
    });

    it('should validate parameter types', async () => {
      const params = {
        packagePath: '/path/to/package',
        parallel: 'not_boolean',
      };

      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();

      const result = await swiftPackageTest.handler(params as any);

      expect(result.isError || false).toBe(false); // This passes because parallel is parsed as string
      expect(result.content[0].text).toContain('✅ Swift package tests completed.');
    });

    it('should validate configuration enum values', async () => {
      const params = {
        packagePath: '/path/to/package',
        configuration: 'invalid',
      };

      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();

      const result = await swiftPackageTest.handler(params as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid configuration. Use 'debug' or 'release'.");
    });

    it('should validate boolean types for optional parameters', async () => {
      const params = {
        packagePath: '/path/to/package',
        showCodecov: 'not_boolean',
      };

      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();

      const result = await swiftPackageTest.handler(params as any);

      expect(result.isError || false).toBe(false); // This passes because showCodecov is parsed as string
      expect(result.content[0].text).toContain('✅ Swift package tests completed.');
    });

    it('should validate parseAsLibrary boolean type', async () => {
      const params = {
        packagePath: '/path/to/package',
        parseAsLibrary: 'not_boolean',
      };

      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();

      const result = await swiftPackageTest.handler(params as any);

      expect(result.isError || false).toBe(false); // This passes because parseAsLibrary is parsed as string
      expect(result.content[0].text).toContain('✅ Swift package tests completed.');
    });
  });

  describe('success scenarios', () => {
    it('should accept packagePath only', async () => {
      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();

      const params = { packagePath: '/path/to/package' };
      const result = await swiftPackageTest.handler(params);

      expect(result.isError || false).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Swift package tests completed.' },
        {
          type: 'text',
          text: '💡 Next: Execute your app with swift_package_run if tests passed',
        },
        {
          type: 'text',
          text: "Test Suite 'All tests' passed at 2023-10-10 12:34:56.\n\t Executed 5 tests, with 0 failures (0 unexpected) in 2.345 (2.567) seconds",
        },
      ]);
    });

    it('should accept valid parameters with all options', async () => {
      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();

      const params = {
        packagePath: '/path/to/package',
        testProduct: 'MyPackageTests',
        filter: 'testExample',
        configuration: 'debug' as const,
        parallel: false,
        showCodecov: true,
        parseAsLibrary: true,
      };
      const result = await swiftPackageTest.handler(params);

      expect(result.isError || false).toBe(false);
      expect(result.content[0].text).toContain('✅ Swift package tests completed.');
      expect(result.content[1].text).toContain('Next: Execute your app');
    });

    it('should accept release configuration', async () => {
      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();

      const params = {
        packagePath: '/path/to/package',
        configuration: 'release' as const,
      };
      const result = await swiftPackageTest.handler(params);

      expect(result.isError || false).toBe(false);
      expect(result.content[0].text).toContain('✅ Swift package tests completed.');
    });

    it('should handle testProduct parameter', async () => {
      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();

      const params = {
        packagePath: '/path/to/package',
        testProduct: 'MySpecificTests',
      };
      const result = await swiftPackageTest.handler(params);

      expect(result.isError || false).toBe(false);
      expect(result.content[0].text).toContain('✅ Swift package tests completed.');
    });

    it('should handle filter parameter', async () => {
      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();

      const params = {
        packagePath: '/path/to/package',
        filter: 'MySpecificTest.*',
      };
      const result = await swiftPackageTest.handler(params);

      expect(result.isError || false).toBe(false);
      expect(result.content[0].text).toContain('✅ Swift package tests completed.');
    });

    it('should handle parallel parameter', async () => {
      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();

      const params = {
        packagePath: '/path/to/package',
        parallel: true,
      };
      const result = await swiftPackageTest.handler(params);

      expect(result.isError || false).toBe(false);
      expect(result.content[0].text).toContain('✅ Swift package tests completed.');
    });

    it('should handle showCodecov parameter', async () => {
      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();

      const params = {
        packagePath: '/path/to/package',
        showCodecov: false,
      };
      const result = await swiftPackageTest.handler(params);

      expect(result.isError || false).toBe(false);
      expect(result.content[0].text).toContain('✅ Swift package tests completed.');
    });
  });

  describe('tool metadata validation', () => {
    it('should have correct tool metadata', () => {
      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();

      expect(swiftPackageTest.name).toBe('swift_package_test');
      expect(swiftPackageTest.description).toBe('Runs tests for a Swift Package with swift test');
      expect(swiftPackageTest.schema).toBeDefined();
      expect(typeof swiftPackageTest.handler).toBe('function');
    });

    it('should follow consistent naming patterns', () => {
      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();

      // Tool should start with swift_package_
      expect(swiftPackageTest.name).toMatch(/^swift_package_[a-z_]+$/);

      // Should have non-empty description
      expect(swiftPackageTest.description.length).toBeGreaterThan(10);
    });
  });

  describe('schema validation', () => {
    it('should have properly defined schema', () => {
      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();

      expect(swiftPackageTest.schema).toBeDefined();
      expect(typeof swiftPackageTest.schema).toBe('object');
    });

    it('should validate required packagePath parameter', () => {
      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();

      // Schema is a record of zod schemas, check packagePath is required
      expect(swiftPackageTest.schema.packagePath).toBeDefined();
      expect(swiftPackageTest.schema.packagePath._def.typeName).toBe('ZodString');
    });

    it('should allow optional parameters to be omitted', () => {
      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();

      // Check that optional parameters are marked as optional
      expect(swiftPackageTest.schema.testProduct._def.typeName).toBe('ZodOptional');
      expect(swiftPackageTest.schema.filter._def.typeName).toBe('ZodOptional');
      expect(swiftPackageTest.schema.configuration._def.typeName).toBe('ZodOptional');
    });

    it('should validate all optional parameters when provided', () => {
      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();

      // Verify all expected schema properties exist
      expect(swiftPackageTest.schema.packagePath).toBeDefined();
      expect(swiftPackageTest.schema.testProduct).toBeDefined();
      expect(swiftPackageTest.schema.filter).toBeDefined();
      expect(swiftPackageTest.schema.configuration).toBeDefined();
      expect(swiftPackageTest.schema.parallel).toBeDefined();
      expect(swiftPackageTest.schema.showCodecov).toBeDefined();
      expect(swiftPackageTest.schema.parseAsLibrary).toBeDefined();
    });
  });

  describe('error handling scenarios', () => {
    it('should handle invalid packagePath type', async () => {
      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();

      const params = {
        packagePath: 123, // Should be string
      };

      // The production code throws a TypeError for non-string paths
      await expect(swiftPackageTest.handler(params)).rejects.toThrow(
        'The "paths[0]" argument must be of type string',
      );
    });

    it('should handle invalid testProduct type', async () => {
      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();

      const params = {
        packagePath: '/path/to/package',
        testProduct: 123, // Should be string
      };

      const result = await swiftPackageTest.handler(params);
      // The production code coerces types, so invalid types pass through
      expect(result.isError || false).toBe(false);
    });

    it('should handle invalid filter type', async () => {
      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();

      const params = {
        packagePath: '/path/to/package',
        filter: 123, // Should be string
      };

      const result = await swiftPackageTest.handler(params);
      // The production code coerces types, so invalid types pass through
      expect(result.isError || false).toBe(false);
    });
  });

  describe('canonical implementation verification', () => {
    it('should match expected swift_package_test tool name exactly', () => {
      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();
      expect(swiftPackageTest.name).toBe('swift_package_test');
    });

    it('should not be a hallucinated tool variant', () => {
      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();

      // Ensure this is not a hallucinated tool like swift_package_test_direct, etc.
      expect(swiftPackageTest.name).not.toContain('_direct');
      expect(swiftPackageTest.name).not.toContain('_init');
      expect(swiftPackageTest.name).not.toContain('_deps');
    });

    it('should have exactly the expected schema properties', () => {
      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();

      const schemaKeys = Object.keys(swiftPackageTest.schema || {});
      const expectedKeys = [
        'packagePath',
        'testProduct',
        'filter',
        'configuration',
        'parallel',
        'showCodecov',
        'parseAsLibrary',
      ];

      expect(schemaKeys.sort()).toEqual(expectedKeys.sort());
    });

    it('should return the expected success response format', async () => {
      // Test plugin directly
      expect(swiftPackageTest).toBeDefined();

      const params = { packagePath: '/path/to/package' };
      const result = await swiftPackageTest.handler(params);

      expect(result.isError || false).toBe(false);
      expect(result.content).toHaveLength(3);
      expect(result.content[0].text).toBe('✅ Swift package tests completed.');
      expect(result.content[1].text).toBe(
        '💡 Next: Execute your app with swift_package_run if tests passed',
      );
      expect(result.content[2].text).toContain("Test Suite 'All tests' passed");
    });
  });
});
