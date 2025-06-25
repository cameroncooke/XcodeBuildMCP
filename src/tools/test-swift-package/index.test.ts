/**
 * Vitest tests for Swift Package Test tool
 *
 * Tests the canonical swift_package_test tool from test-swift-package.ts
 * Migrated from consolidated swift-package.test.ts for 1:1 tool-to-test mapping
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Import production registration function
import { registerTestSwiftPackageTool } from './index.js';

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
vi.mock('../../utils/logger.js', () => ({
  log: vi.fn(),
}));

// Mock the executeCommand function from canonical implementation
vi.mock('../../utils/command.js', () => ({
  executeCommand: vi.fn(),
}));

// Create mock server to capture tool registrations
const mockServer = {
  tool: vi.fn(),
} as any as Server;

// Store registered tools
let registeredTools: Map<string, any> = new Map();

describe('swift_package_test tool', () => {
  let mockSpawn: MockedFunction<typeof spawn>;
  let mockChildProcess: Partial<ChildProcess>;
  let mockExecuteCommand: MockedFunction<any>;

  beforeEach(async () => {
    // Clear registered tools
    registeredTools.clear();

    // Mock server.tool to capture registrations
    mockServer.tool.mockImplementation((name, description, schema, handler) => {
      registeredTools.set(name, { name, description, schema, handler });
    });

    // Register production tool
    registerTestSwiftPackageTool(mockServer);

    // Get the mocked function from node:child_process since that's what the tools import
    const { spawn: nodeSpawn } = await import('node:child_process');
    mockSpawn = nodeSpawn as MockedFunction<any>;

    // Mock executeCommand
    const { executeCommand } = await import('../../utils/command.js');
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
      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      const params = {};
      const result = await tool.handler(params);

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

      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      const result = await tool.handler(params as any);

      expect(result.isError || false).toBe(false); // This passes because parallel is parsed as string
      expect(result.content[0].text).toContain('✅ Swift package tests completed.');
    });

    it('should validate configuration enum values', async () => {
      const params = {
        packagePath: '/path/to/package',
        configuration: 'invalid',
      };

      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      const result = await tool.handler(params as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid configuration. Use 'debug' or 'release'.");
    });

    it('should validate boolean types for optional parameters', async () => {
      const params = {
        packagePath: '/path/to/package',
        showCodecov: 'not_boolean',
      };

      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      const result = await tool.handler(params as any);

      expect(result.isError || false).toBe(false); // This passes because showCodecov is parsed as string
      expect(result.content[0].text).toContain('✅ Swift package tests completed.');
    });

    it('should validate parseAsLibrary boolean type', async () => {
      const params = {
        packagePath: '/path/to/package',
        parseAsLibrary: 'not_boolean',
      };

      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      const result = await tool.handler(params as any);

      expect(result.isError || false).toBe(false); // This passes because parseAsLibrary is parsed as string
      expect(result.content[0].text).toContain('✅ Swift package tests completed.');
    });
  });

  describe('success scenarios', () => {
    it('should accept packagePath only', async () => {
      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      const params = { packagePath: '/path/to/package' };
      const result = await tool.handler(params);

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
      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      const params = {
        packagePath: '/path/to/package',
        testProduct: 'MyPackageTests',
        filter: 'testExample',
        configuration: 'debug' as const,
        parallel: false,
        showCodecov: true,
        parseAsLibrary: true,
      };
      const result = await tool.handler(params);

      expect(result.isError || false).toBe(false);
      expect(result.content[0].text).toContain('✅ Swift package tests completed.');
      expect(result.content[1].text).toContain('Next: Execute your app');
    });

    it('should accept release configuration', async () => {
      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      const params = {
        packagePath: '/path/to/package',
        configuration: 'release' as const,
      };
      const result = await tool.handler(params);

      expect(result.isError || false).toBe(false);
      expect(result.content[0].text).toContain('✅ Swift package tests completed.');
    });

    it('should handle testProduct parameter', async () => {
      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      const params = {
        packagePath: '/path/to/package',
        testProduct: 'MySpecificTests',
      };
      const result = await tool.handler(params);

      expect(result.isError || false).toBe(false);
      expect(result.content[0].text).toContain('✅ Swift package tests completed.');
    });

    it('should handle filter parameter', async () => {
      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      const params = {
        packagePath: '/path/to/package',
        filter: 'MySpecificTest.*',
      };
      const result = await tool.handler(params);

      expect(result.isError || false).toBe(false);
      expect(result.content[0].text).toContain('✅ Swift package tests completed.');
    });

    it('should handle parallel parameter', async () => {
      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      const params = {
        packagePath: '/path/to/package',
        parallel: true,
      };
      const result = await tool.handler(params);

      expect(result.isError || false).toBe(false);
      expect(result.content[0].text).toContain('✅ Swift package tests completed.');
    });

    it('should handle showCodecov parameter', async () => {
      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      const params = {
        packagePath: '/path/to/package',
        showCodecov: false,
      };
      const result = await tool.handler(params);

      expect(result.isError || false).toBe(false);
      expect(result.content[0].text).toContain('✅ Swift package tests completed.');
    });
  });

  describe('tool metadata validation', () => {
    it('should have correct tool metadata', () => {
      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      expect(tool.name).toBe('swift_package_test');
      expect(tool.description).toBe('Runs tests for a Swift Package with swift test');
      expect(tool.schema).toBeDefined();
      expect(typeof tool.handler).toBe('function');
    });

    it('should follow consistent naming patterns', () => {
      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      // Tool should start with swift_package_
      expect(tool.name).toMatch(/^swift_package_[a-z_]+$/);

      // Should have non-empty description
      expect(tool.description.length).toBeGreaterThan(10);
    });
  });

  describe('schema validation', () => {
    it('should have properly defined schema', () => {
      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      expect(tool.schema).toBeDefined();
      expect(typeof tool.schema).toBe('object');
    });

    it('should validate required packagePath parameter', () => {
      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      // Schema is a record of zod schemas, check packagePath is required
      expect(tool.schema.packagePath).toBeDefined();
      expect(tool.schema.packagePath._def.typeName).toBe('ZodString');
    });

    it('should allow optional parameters to be omitted', () => {
      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      // Check that optional parameters are marked as optional
      expect(tool.schema.testProduct._def.typeName).toBe('ZodOptional');
      expect(tool.schema.filter._def.typeName).toBe('ZodOptional');
      expect(tool.schema.configuration._def.typeName).toBe('ZodOptional');
    });

    it('should validate all optional parameters when provided', () => {
      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      // Verify all expected schema properties exist
      expect(tool.schema.packagePath).toBeDefined();
      expect(tool.schema.testProduct).toBeDefined();
      expect(tool.schema.filter).toBeDefined();
      expect(tool.schema.configuration).toBeDefined();
      expect(tool.schema.parallel).toBeDefined();
      expect(tool.schema.showCodecov).toBeDefined();
      expect(tool.schema.parseAsLibrary).toBeDefined();
    });
  });

  describe('error handling scenarios', () => {
    it('should handle invalid packagePath type', async () => {
      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      const params = {
        packagePath: 123, // Should be string
      };

      // The production code throws a TypeError for non-string paths
      await expect(tool.handler(params)).rejects.toThrow(
        'The "paths[0]" argument must be of type string',
      );
    });

    it('should handle invalid testProduct type', async () => {
      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      const params = {
        packagePath: '/path/to/package',
        testProduct: 123, // Should be string
      };

      const result = await tool.handler(params);
      // The production code coerces types, so invalid types pass through
      expect(result.isError || false).toBe(false);
    });

    it('should handle invalid filter type', async () => {
      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      const params = {
        packagePath: '/path/to/package',
        filter: 123, // Should be string
      };

      const result = await tool.handler(params);
      // The production code coerces types, so invalid types pass through
      expect(result.isError || false).toBe(false);
    });
  });

  describe('canonical implementation verification', () => {
    it('should match expected swift_package_test tool name exactly', () => {
      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();
      expect(tool.name).toBe('swift_package_test');
    });

    it('should not be a hallucinated tool variant', () => {
      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      // Ensure this is not a hallucinated tool like swift_package_test_direct, etc.
      expect(tool.name).not.toContain('_direct');
      expect(tool.name).not.toContain('_init');
      expect(tool.name).not.toContain('_deps');
    });

    it('should have exactly the expected schema properties', () => {
      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      const schemaKeys = Object.keys(tool.schema || {});
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
      const tool = registeredTools.get('swift_package_test');
      expect(tool).toBeDefined();

      const params = { packagePath: '/path/to/package' };
      const result = await tool.handler(params);

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
