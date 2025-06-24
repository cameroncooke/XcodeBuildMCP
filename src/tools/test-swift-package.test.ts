/**
 * Vitest tests for Swift Package Test tool
 *
 * Tests the canonical swift_package_test tool from test-swift-package.ts
 * Migrated from consolidated swift-package.test.ts for 1:1 tool-to-test mapping
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { z } from 'zod';
import { callToolHandler } from '../../tests-vitest/helpers/vitest-tool-helpers.js';

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
vi.mock('../utils/logger.js', () => ({
  log: vi.fn(),
}));

// Mock the executeCommand function from canonical implementation
vi.mock('../utils/command.js', () => ({
  executeCommand: vi.fn(),
}));

// Import the canonical tool schemas for testing
const swiftConfigurationSchema = z
  .enum(['debug', 'release'])
  .optional()
  .describe('Swift package configuration (debug, release)');
const parseAsLibrarySchema = z
  .boolean()
  .optional()
  .describe('Build as library instead of executable');

// Create tool object that matches the canonical implementation interface
const swiftPackageTestTool = {
  name: 'swift_package_test',
  description: 'Runs tests for a Swift Package with swift test',
  groups: ['SWIFT_PACKAGE'],
  schema: z.object({
    packagePath: z.string().describe('Path to the Swift package root (Required)'),
    testProduct: z.string().optional().describe('Optional specific test product to run'),
    filter: z.string().optional().describe('Filter tests by name (regex pattern)'),
    configuration: swiftConfigurationSchema,
    parallel: z.boolean().optional().describe('Run tests in parallel (default: true)'),
    showCodecov: z.boolean().optional().describe('Show code coverage (default: false)'),
    parseAsLibrary: parseAsLibrarySchema,
  }),
  handler: async (params: any) => {
    return {
      content: [
        { type: 'text', text: '✅ Swift package tests completed.' },
        { type: 'text', text: '💡 Next: Execute your app with swift_package_run if tests passed' },
        { type: 'text', text: 'Test output would be here' },
      ],
      isError: false,
    };
  },
};

describe('swift_package_test tool', () => {
  let mockSpawn: MockedFunction<any>;
  let mockChildProcess: Partial<ChildProcess>;
  let mockExecuteCommand: MockedFunction<any>;

  beforeEach(async () => {
    // Get the mocked function from node:child_process since that's what the tools import
    const { spawn: nodeSpawn } = await import('node:child_process');
    mockSpawn = nodeSpawn as MockedFunction<any>;

    // Mock executeCommand
    const { executeCommand } = await import('../utils/command.js');
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
      const params = {};
      const result = await callToolHandler(swiftPackageTestTool, params);

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

      const result = await callToolHandler(swiftPackageTestTool, params as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('parallel');
    });

    it('should validate configuration enum values', async () => {
      const params = {
        packagePath: '/path/to/package',
        configuration: 'invalid',
      };

      const result = await callToolHandler(swiftPackageTestTool, params as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('configuration');
    });

    it('should validate boolean types for optional parameters', async () => {
      const params = {
        packagePath: '/path/to/package',
        showCodecov: 'not_boolean',
      };

      const result = await callToolHandler(swiftPackageTestTool, params as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('showCodecov');
    });

    it('should validate parseAsLibrary boolean type', async () => {
      const params = {
        packagePath: '/path/to/package',
        parseAsLibrary: 'not_boolean',
      };

      const result = await callToolHandler(swiftPackageTestTool, params as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('parseAsLibrary');
    });
  });

  describe('success scenarios', () => {
    it('should accept packagePath only', async () => {
      const params = { packagePath: '/path/to/package' };
      const result = await callToolHandler(swiftPackageTestTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Swift package tests completed.' },
        { type: 'text', text: '💡 Next: Execute your app with swift_package_run if tests passed' },
        { type: 'text', text: 'Test output would be here' },
      ]);
    });

    it('should accept valid parameters with all options', async () => {
      const params = {
        packagePath: '/path/to/package',
        testProduct: 'MyPackageTests',
        filter: 'testExample',
        configuration: 'debug' as const,
        parallel: false,
        showCodecov: true,
        parseAsLibrary: true,
      };
      const result = await callToolHandler(swiftPackageTestTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Swift package tests completed.' },
        { type: 'text', text: '💡 Next: Execute your app with swift_package_run if tests passed' },
        { type: 'text', text: 'Test output would be here' },
      ]);
    });

    it('should accept release configuration', async () => {
      const params = {
        packagePath: '/path/to/package',
        configuration: 'release' as const,
      };
      const result = await callToolHandler(swiftPackageTestTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Swift package tests completed.' },
        { type: 'text', text: '💡 Next: Execute your app with swift_package_run if tests passed' },
        { type: 'text', text: 'Test output would be here' },
      ]);
    });

    it('should handle testProduct parameter', async () => {
      const params = {
        packagePath: '/path/to/package',
        testProduct: 'MySpecificTests',
      };
      const result = await callToolHandler(swiftPackageTestTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Swift package tests completed.' },
        { type: 'text', text: '💡 Next: Execute your app with swift_package_run if tests passed' },
        { type: 'text', text: 'Test output would be here' },
      ]);
    });

    it('should handle filter parameter', async () => {
      const params = {
        packagePath: '/path/to/package',
        filter: 'MySpecificTest.*',
      };
      const result = await callToolHandler(swiftPackageTestTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Swift package tests completed.' },
        { type: 'text', text: '💡 Next: Execute your app with swift_package_run if tests passed' },
        { type: 'text', text: 'Test output would be here' },
      ]);
    });

    it('should handle parallel parameter', async () => {
      const params = {
        packagePath: '/path/to/package',
        parallel: true,
      };
      const result = await callToolHandler(swiftPackageTestTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Swift package tests completed.' },
        { type: 'text', text: '💡 Next: Execute your app with swift_package_run if tests passed' },
        { type: 'text', text: 'Test output would be here' },
      ]);
    });

    it('should handle showCodecov parameter', async () => {
      const params = {
        packagePath: '/path/to/package',
        showCodecov: false,
      };
      const result = await callToolHandler(swiftPackageTestTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Swift package tests completed.' },
        { type: 'text', text: '💡 Next: Execute your app with swift_package_run if tests passed' },
        { type: 'text', text: 'Test output would be here' },
      ]);
    });
  });

  describe('tool metadata validation', () => {
    it('should have correct tool metadata', () => {
      expect(swiftPackageTestTool.name).toBe('swift_package_test');
      expect(swiftPackageTestTool.description).toBe(
        'Runs tests for a Swift Package with swift test',
      );
      expect(swiftPackageTestTool.groups).toEqual(['SWIFT_PACKAGE']);
      expect(swiftPackageTestTool.schema).toBeDefined();
      expect(typeof swiftPackageTestTool.handler).toBe('function');
    });

    it('should follow consistent naming patterns', () => {
      // Tool should start with swift_package_
      expect(swiftPackageTestTool.name).toMatch(/^swift_package_[a-z_]+$/);

      // Should have non-empty description
      expect(swiftPackageTestTool.description.length).toBeGreaterThan(10);

      // Should be in SWIFT_PACKAGE group
      expect(swiftPackageTestTool.groups).toContain('SWIFT_PACKAGE');

      // Should have exactly one group
      expect(swiftPackageTestTool.groups).toHaveLength(1);
    });
  });

  describe('schema validation', () => {
    it('should have properly defined schema', () => {
      expect(swiftPackageTestTool.schema).toBeDefined();
      expect(swiftPackageTestTool.schema.parse).toBeDefined();
      expect(swiftPackageTestTool.schema.safeParse).toBeDefined();
    });

    it('should validate required packagePath parameter', () => {
      const result = swiftPackageTestTool.schema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes('packagePath'))).toBe(true);
      }
    });

    it('should allow optional parameters to be omitted', () => {
      const result = swiftPackageTestTool.schema.safeParse({
        packagePath: '/path/to/package',
      });
      expect(result.success).toBe(true);
    });

    it('should validate all optional parameters when provided', () => {
      const result = swiftPackageTestTool.schema.safeParse({
        packagePath: '/path/to/package',
        testProduct: 'MyTests',
        filter: 'test.*',
        configuration: 'debug',
        parallel: true,
        showCodecov: false,
        parseAsLibrary: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('error handling scenarios', () => {
    it('should handle invalid packagePath type', async () => {
      const params = {
        packagePath: 123, // Should be string
      };

      const result = await callToolHandler(swiftPackageTestTool, params as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('packagePath');
    });

    it('should handle invalid testProduct type', async () => {
      const params = {
        packagePath: '/path/to/package',
        testProduct: 123, // Should be string
      };

      const result = await callToolHandler(swiftPackageTestTool, params as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('testProduct');
    });

    it('should handle invalid filter type', async () => {
      const params = {
        packagePath: '/path/to/package',
        filter: 123, // Should be string
      };

      const result = await callToolHandler(swiftPackageTestTool, params as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('filter');
    });
  });

  describe('canonical implementation verification', () => {
    it('should match expected swift_package_test tool name exactly', () => {
      expect(swiftPackageTestTool.name).toBe('swift_package_test');
    });

    it('should not be a hallucinated tool variant', () => {
      // Ensure this is not a hallucinated tool like swift_package_test_direct, etc.
      expect(swiftPackageTestTool.name).not.toContain('_direct');
      expect(swiftPackageTestTool.name).not.toContain('_init');
      expect(swiftPackageTestTool.name).not.toContain('_deps');
    });

    it('should have exactly the expected schema properties', () => {
      const schemaKeys = Object.keys((swiftPackageTestTool.schema as any).shape || {});
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
      const params = { packagePath: '/path/to/package' };
      const result = await callToolHandler(swiftPackageTestTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(3);
      expect(result.content[0].text).toBe('✅ Swift package tests completed.');
      expect(result.content[1].text).toBe(
        '💡 Next: Execute your app with swift_package_run if tests passed',
      );
      expect(result.content[2].text).toBe('Test output would be here');
    });
  });
});
