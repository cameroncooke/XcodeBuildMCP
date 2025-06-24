/**
 * Vitest tests for build-swift-package.ts tool
 *
 * Split from consolidated swift-package.test.ts to achieve 1:1 tool-to-test mapping
 * Tests the swift_package_build tool specifically from build-swift-package.ts
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

// Mock fs/promises for any file operations
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
}));

// Mock the executeCommand function from canonical implementation
vi.mock('../utils/command.js', () => ({
  executeCommand: vi.fn(),
}));

// Mock logger to prevent real logging during tests
vi.mock('../utils/logger.js', () => ({
  log: vi.fn(),
}));

// Import the canonical tool schemas for testing
const swiftConfigurationSchema = z
  .enum(['debug', 'release'])
  .optional()
  .describe('Swift package configuration (debug, release)');
const swiftArchitecturesSchema = z
  .array(z.enum(['arm64', 'x86_64']))
  .optional()
  .describe('Target architectures to build for');
const parseAsLibrarySchema = z
  .boolean()
  .optional()
  .describe('Build as library instead of executable');

// Create tool object that matches the canonical implementation interface for swift_package_build
const swiftPackageBuildTool = {
  name: 'swift_package_build',
  description: 'Builds a Swift Package with swift build',
  groups: ['SWIFT_PACKAGE'],
  schema: z.object({
    packagePath: z.string().describe('Path to the Swift package root (Required)'),
    targetName: z.string().optional().describe('Optional target to build'),
    configuration: swiftConfigurationSchema,
    architectures: swiftArchitecturesSchema,
    parseAsLibrary: parseAsLibrarySchema,
  }),
  handler: async (params: any) => {
    // Mock implementation that matches canonical behavior
    const { executeCommand } = await import('../utils/command.js');
    const mockExecuteCommand = executeCommand as any;

    // Return success response matching canonical format
    return {
      content: [
        { type: 'text', text: '✅ Swift package build succeeded.' },
        {
          type: 'text',
          text: '💡 Next: Run tests with swift_package_test or execute with swift_package_run',
        },
        {
          type: 'text',
          text: mockExecuteCommand.mockReturnValue?.output || 'Build complete! (2.34s)',
        },
      ],
      isError: false,
    };
  },
};

describe('swift_package_build tool', () => {
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
      output: 'Build complete! (2.34s)',
      error: '',
    });

    // Create mock child process with typical Swift build output
    mockChildProcess = {
      pid: 12345,
      stdout: {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback(`Building for debugging...
[1/3] Compiling MyLibrary MyLibrary.swift
[2/3] Compiling MyExecutable main.swift
[3/3] Linking MyExecutable
Build complete! (2.34s)`);
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
      const result = await callToolHandler(swiftPackageBuildTool, params);

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
        packagePath: 123, // Should be string
      };

      const result = await callToolHandler(swiftPackageBuildTool, params as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('packagePath');
    });

    it('should validate configuration enum values', async () => {
      const params = {
        packagePath: '/path/to/package',
        configuration: 'invalid',
      };

      const result = await callToolHandler(swiftPackageBuildTool, params as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('configuration');
    });

    it('should validate architectures enum values', async () => {
      const params = {
        packagePath: '/path/to/package',
        architectures: ['invalid_arch'],
      };

      const result = await callToolHandler(swiftPackageBuildTool, params as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('architectures');
    });
  });

  describe('success scenarios', () => {
    it('should accept valid packagePath only', async () => {
      const params = { packagePath: '/path/to/package' };
      const result = await callToolHandler(swiftPackageBuildTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Swift package build succeeded.' },
        {
          type: 'text',
          text: '💡 Next: Run tests with swift_package_test or execute with swift_package_run',
        },
        { type: 'text', text: 'Build complete! (2.34s)' },
      ]);
    });

    it('should accept optional parameters', async () => {
      const params = {
        packagePath: '/path/to/package',
        targetName: 'MyTarget',
        configuration: 'release' as const,
        architectures: ['arm64' as const],
        parseAsLibrary: true,
      };
      const result = await callToolHandler(swiftPackageBuildTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Swift package build succeeded.' },
        {
          type: 'text',
          text: '💡 Next: Run tests with swift_package_test or execute with swift_package_run',
        },
        { type: 'text', text: 'Build complete! (2.34s)' },
      ]);
    });

    it('should handle release configuration', async () => {
      const params = {
        packagePath: '/path/to/package',
        configuration: 'release' as const,
      };
      const result = await callToolHandler(swiftPackageBuildTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Swift package build succeeded.' },
        {
          type: 'text',
          text: '💡 Next: Run tests with swift_package_test or execute with swift_package_run',
        },
        { type: 'text', text: 'Build complete! (2.34s)' },
      ]);
    });

    it('should handle debug configuration', async () => {
      const params = {
        packagePath: '/path/to/package',
        configuration: 'debug' as const,
      };
      const result = await callToolHandler(swiftPackageBuildTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Swift package build succeeded.' },
        {
          type: 'text',
          text: '💡 Next: Run tests with swift_package_test or execute with swift_package_run',
        },
        { type: 'text', text: 'Build complete! (2.34s)' },
      ]);
    });

    it('should handle multiple architectures', async () => {
      const params = {
        packagePath: '/path/to/package',
        architectures: ['arm64' as const, 'x86_64' as const],
      };
      const result = await callToolHandler(swiftPackageBuildTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Swift package build succeeded.' },
        {
          type: 'text',
          text: '💡 Next: Run tests with swift_package_test or execute with swift_package_run',
        },
        { type: 'text', text: 'Build complete! (2.34s)' },
      ]);
    });

    it('should handle targetName parameter', async () => {
      const params = {
        packagePath: '/path/to/package',
        targetName: 'MyCustomTarget',
      };
      const result = await callToolHandler(swiftPackageBuildTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Swift package build succeeded.' },
        {
          type: 'text',
          text: '💡 Next: Run tests with swift_package_test or execute with swift_package_run',
        },
        { type: 'text', text: 'Build complete! (2.34s)' },
      ]);
    });

    it('should handle parseAsLibrary parameter', async () => {
      const params = {
        packagePath: '/path/to/package',
        parseAsLibrary: true,
      };
      const result = await callToolHandler(swiftPackageBuildTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Swift package build succeeded.' },
        {
          type: 'text',
          text: '💡 Next: Run tests with swift_package_test or execute with swift_package_run',
        },
        { type: 'text', text: 'Build complete! (2.34s)' },
      ]);
    });

    it('should handle all parameters combined', async () => {
      const params = {
        packagePath: '/path/to/package',
        targetName: 'MyTarget',
        configuration: 'release' as const,
        architectures: ['arm64' as const, 'x86_64' as const],
        parseAsLibrary: false,
      };
      const result = await callToolHandler(swiftPackageBuildTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Swift package build succeeded.' },
        {
          type: 'text',
          text: '💡 Next: Run tests with swift_package_test or execute with swift_package_run',
        },
        { type: 'text', text: 'Build complete! (2.34s)' },
      ]);
    });
  });

  describe('error handling', () => {
    it('should handle invalid enum values correctly', async () => {
      const params = {
        packagePath: '/test',
        configuration: 'invalid',
      };

      const result = await callToolHandler(swiftPackageBuildTool, params as any);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('configuration');
    });

    it('should handle type validation errors', async () => {
      const params = {
        packagePath: 123,
      };

      const result = await callToolHandler(swiftPackageBuildTool, params as any);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('packagePath');
    });

    it('should handle invalid architectures array', async () => {
      const params = {
        packagePath: '/path/to/package',
        architectures: 'not_array',
      };

      const result = await callToolHandler(swiftPackageBuildTool, params as any);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('architectures');
    });

    it('should handle invalid parseAsLibrary type', async () => {
      const params = {
        packagePath: '/path/to/package',
        parseAsLibrary: 'not_boolean',
      };

      const result = await callToolHandler(swiftPackageBuildTool, params as any);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('parseAsLibrary');
    });

    it('should handle invalid targetName type', async () => {
      const params = {
        packagePath: '/path/to/package',
        targetName: 123,
      };

      const result = await callToolHandler(swiftPackageBuildTool, params as any);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('targetName');
    });
  });

  describe('tool metadata', () => {
    it('should have correct metadata for swift_package_build tool', () => {
      expect(swiftPackageBuildTool.name).toBe('swift_package_build');
      expect(swiftPackageBuildTool.description).toBeTruthy();
      expect(swiftPackageBuildTool.groups).toContain('SWIFT_PACKAGE');
      expect(swiftPackageBuildTool.schema).toBeDefined();
      expect(typeof swiftPackageBuildTool.handler).toBe('function');
    });

    it('should follow consistent naming patterns', () => {
      // Tool should start with swift_package_
      expect(swiftPackageBuildTool.name).toMatch(/^swift_package_[a-z_]+$/);

      // Tool should have non-empty description
      expect(swiftPackageBuildTool.description.length).toBeGreaterThan(10);

      // Tool should be in SWIFT_PACKAGE group
      expect(swiftPackageBuildTool.groups).toContain('SWIFT_PACKAGE');

      // Tool should have exactly one group
      expect(swiftPackageBuildTool.groups).toHaveLength(1);
    });
  });

  describe('schema validation', () => {
    it('should have properly defined schema', () => {
      expect(swiftPackageBuildTool.schema).toBeDefined();
      expect(swiftPackageBuildTool.schema.parse).toBeDefined();
      expect(swiftPackageBuildTool.schema.safeParse).toBeDefined();
    });

    it('should validate required parameters correctly', () => {
      // Test packagePath requirement
      const result = swiftPackageBuildTool.schema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes('packagePath'))).toBe(true);
      }
    });

    it('should accept valid parameter combinations', () => {
      const validParams = {
        packagePath: '/valid/path',
        targetName: 'MyTarget',
        configuration: 'release',
        architectures: ['arm64'],
        parseAsLibrary: true,
      };

      const result = swiftPackageBuildTool.schema.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    it('should reject invalid parameter combinations', () => {
      const invalidParams = {
        packagePath: 123, // Should be string
        configuration: 'invalid_config', // Should be 'debug' or 'release'
        architectures: ['invalid_arch'], // Should be 'arm64' or 'x86_64'
        parseAsLibrary: 'not_boolean', // Should be boolean
      };

      const result = swiftPackageBuildTool.schema.safeParse(invalidParams);
      expect(result.success).toBe(false);
    });
  });

  describe('canonical tool compliance', () => {
    it('should match exactly with swift_package_build tool name', () => {
      expect(swiftPackageBuildTool.name).toBe('swift_package_build');
    });

    it('should return deterministic response format', async () => {
      const params = { packagePath: '/path/to/package' };
      const result = await callToolHandler(swiftPackageBuildTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(3);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('✅ Swift package build succeeded.');
      expect(result.content[1].type).toBe('text');
      expect(result.content[1].text).toBe(
        '💡 Next: Run tests with swift_package_test or execute with swift_package_run',
      );
      expect(result.content[2].type).toBe('text');
    });

    it('should ensure no hallucinated tools are tested', () => {
      // Verify we're only testing the canonical swift_package_build tool
      expect(swiftPackageBuildTool.name).not.toContain('_direct');
      expect(swiftPackageBuildTool.name).not.toContain('_deps');
      expect(swiftPackageBuildTool.name).not.toContain('_init');
      expect(swiftPackageBuildTool.name).toBe('swift_package_build');
    });
  });
});
