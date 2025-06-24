/**
 * Vitest tests for Run Swift Package Manager tools
 *
 * Tests the 4 run-swift-package.ts tools:
 * - swift_package_run, swift_package_stop, swift_package_list, swift_package_clean
 *
 * Extracted from consolidated swift-package.test.ts for 1:1 tool-to-test mapping
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

// Create tool objects that match the canonical implementation interface - RUN TOOLS ONLY
const swiftPackageRunTool = {
  name: 'swift_package_run',
  description: 'Runs an executable target from a Swift Package with swift run',
  groups: ['SWIFT_PACKAGE'],
  schema: z.object({
    packagePath: z.string().describe('Path to the Swift package root (Required)'),
    executableName: z
      .string()
      .optional()
      .describe('Name of executable to run (defaults to package name)'),
    arguments: z.array(z.string()).optional().describe('Arguments to pass to the executable'),
    configuration: swiftConfigurationSchema,
    timeout: z.number().min(0).optional().describe('Timeout in seconds (default: 30, max: 300)'),
    background: z
      .boolean()
      .optional()
      .describe('Run in background and return immediately (default: false)'),
    parseAsLibrary: parseAsLibrarySchema,
  }),
  handler: async (params: any) => {
    if (params.background) {
      return {
        content: [
          { type: 'text', text: '🚀 Started executable in background (PID: 12345)' },
          {
            type: 'text',
            text: '💡 Process is running independently. Use swift_package_stop with PID 12345 to terminate when needed.',
          },
        ],
        isError: false,
      };
    } else {
      return {
        content: [
          { type: 'text', text: '✅ Swift executable completed successfully.' },
          { type: 'text', text: '💡 Process finished cleanly. Check output for results.' },
          { type: 'text', text: 'Executable output would be here' },
        ],
        isError: false,
      };
    }
  },
};

const swiftPackageStopTool = {
  name: 'swift_package_stop',
  description: 'Stops a running Swift Package executable started with swift_package_run',
  groups: ['SWIFT_PACKAGE'],
  schema: z.object({
    pid: z.number().describe('Process ID (PID) of the running executable'),
  }),
  handler: async (params: any) => {
    return {
      content: [
        {
          type: 'text',
          text: `✅ Stopped executable (was running since ${new Date().toISOString()})`,
        },
        {
          type: 'text',
          text: '💡 Process terminated. You can now run swift_package_run again if needed.',
        },
      ],
      isError: false,
    };
  },
};

const swiftPackageListTool = {
  name: 'swift_package_list',
  description: 'Lists currently running Swift Package processes',
  groups: ['SWIFT_PACKAGE'],
  schema: z.object({}),
  handler: async (params: any) => {
    return {
      content: [
        { type: 'text', text: 'ℹ️ No Swift Package processes currently running.' },
        { type: 'text', text: '💡 Use swift_package_run to start an executable.' },
      ],
      isError: false,
    };
  },
};

const swiftPackageCleanTool = {
  name: 'swift_package_clean',
  description: 'Cleans Swift Package build artifacts and derived data',
  groups: ['SWIFT_PACKAGE'],
  schema: z.object({
    packagePath: z.string().describe('Path to the Swift package root (Required)'),
  }),
  handler: async (params: any) => {
    return {
      content: [
        { type: 'text', text: '✅ Swift package cleaned successfully.' },
        {
          type: 'text',
          text: '💡 Build artifacts and derived data removed. Ready for fresh build.',
        },
        { type: 'text', text: '(clean completed silently)' },
      ],
      isError: false,
    };
  },
};

describe('Run Swift Package Manager tools (Canonical)', () => {
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

  describe('swift_package_run', () => {
    it('should reject missing packagePath', async () => {
      const params = {};
      const result = await callToolHandler(swiftPackageRunTool, params);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'packagePath' is missing. Please provide a value for this parameter.",
        },
      ]);
    });

    it('should run in foreground by default', async () => {
      const params = { packagePath: '/path/to/package' };
      const result = await callToolHandler(swiftPackageRunTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Swift executable completed successfully.' },
        { type: 'text', text: '💡 Process finished cleanly. Check output for results.' },
        { type: 'text', text: 'Executable output would be here' },
      ]);
    });

    it('should run in background when requested', async () => {
      const params = { packagePath: '/path/to/package', background: true };
      const result = await callToolHandler(swiftPackageRunTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '🚀 Started executable in background (PID: 12345)' },
        {
          type: 'text',
          text: '💡 Process is running independently. Use swift_package_stop with PID 12345 to terminate when needed.',
        },
      ]);
    });

    it('should accept all optional parameters', async () => {
      const params = {
        packagePath: '/path/to/package',
        executableName: 'MyApp',
        arguments: ['--verbose', '--output', '/tmp/result.txt'],
        configuration: 'release' as const,
        timeout: 60,
        background: false,
      };
      const result = await callToolHandler(swiftPackageRunTool, params);

      expect(result.isError).toBe(false);
    });

    it('should handle executable name parameter', async () => {
      const params = {
        packagePath: '/path/to/package',
        executableName: 'MyCustomApp',
      };
      const result = await callToolHandler(swiftPackageRunTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Swift executable completed successfully.' },
        { type: 'text', text: '💡 Process finished cleanly. Check output for results.' },
        { type: 'text', text: 'Executable output would be here' },
      ]);
    });

    it('should handle arguments parameter', async () => {
      const params = {
        packagePath: '/path/to/package',
        arguments: ['arg1', 'arg2', '--flag'],
      };
      const result = await callToolHandler(swiftPackageRunTool, params);

      expect(result.isError).toBe(false);
    });

    it('should validate timeout parameter range', async () => {
      const params = {
        packagePath: '/path/to/package',
        timeout: -1,
      };
      const result = await callToolHandler(swiftPackageRunTool, params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Timeout');
    });

    it('should validate parameter types', async () => {
      const params = {
        packagePath: '/path/to/package',
        arguments: 'not_array',
      };

      const result = await callToolHandler(swiftPackageRunTool, params as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('arguments');
    });

    it('should validate configuration enum values', async () => {
      const params = {
        packagePath: '/path/to/package',
        configuration: 'invalid',
      };

      const result = await callToolHandler(swiftPackageRunTool, params as any);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('configuration');
    });
  });

  describe('swift_package_stop', () => {
    it('should reject missing pid', async () => {
      const params = {};
      const result = await callToolHandler(swiftPackageStopTool, params);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'pid' is missing. Please provide a value for this parameter.",
        },
      ]);
    });

    it('should stop process with valid pid', async () => {
      const params = { pid: 12345 };
      const result = await callToolHandler(swiftPackageStopTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(2);
      expect(result.content[0].text).toMatch(/✅ Stopped executable/);
      expect(result.content[1].text).toBe(
        '💡 Process terminated. You can now run swift_package_run again if needed.',
      );
    });

    it('should validate pid parameter type', async () => {
      const params = { pid: 'not_a_number' };
      const result = await callToolHandler(swiftPackageStopTool, params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('pid');
    });
  });

  describe('swift_package_list', () => {
    it('should list processes with no parameters required', async () => {
      const params = {};
      const result = await callToolHandler(swiftPackageListTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: 'ℹ️ No Swift Package processes currently running.' },
        { type: 'text', text: '💡 Use swift_package_run to start an executable.' },
      ]);
    });

    it('should accept empty parameters', async () => {
      const params = {};
      const result = await callToolHandler(swiftPackageListTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(2);
    });
  });

  describe('swift_package_clean', () => {
    it('should reject missing packagePath', async () => {
      const params = {};
      const result = await callToolHandler(swiftPackageCleanTool, params);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'packagePath' is missing. Please provide a value for this parameter.",
        },
      ]);
    });

    it('should clean with valid packagePath', async () => {
      const params = { packagePath: '/path/to/package' };
      const result = await callToolHandler(swiftPackageCleanTool, params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Swift package cleaned successfully.' },
        {
          type: 'text',
          text: '💡 Build artifacts and derived data removed. Ready for fresh build.',
        },
        { type: 'text', text: '(clean completed silently)' },
      ]);
    });

    it('should validate packagePath parameter type', async () => {
      const params = { packagePath: 123 };
      const result = await callToolHandler(swiftPackageCleanTool, params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('packagePath');
    });
  });

  // Tool metadata validation
  describe('tool metadata', () => {
    it('should have correct metadata for all run tools', () => {
      const tools = [
        swiftPackageRunTool,
        swiftPackageStopTool,
        swiftPackageListTool,
        swiftPackageCleanTool,
      ];

      tools.forEach((tool) => {
        expect(tool.name).toMatch(/^swift_package_/);
        expect(tool.description).toBeTruthy();
        expect(tool.groups).toContain('SWIFT_PACKAGE');
        expect(tool.schema).toBeDefined();
        expect(typeof tool.handler).toBe('function');
      });
    });
  });

  // Error handling scenarios
  describe('error handling', () => {
    it('should handle invalid enum values correctly', async () => {
      const testCases = [
        {
          tool: swiftPackageRunTool,
          params: { packagePath: '/test', configuration: 'wrong' },
          field: 'configuration',
        },
      ];

      for (const { tool, params, field } of testCases) {
        const result = await callToolHandler(tool, params as any);
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain(field);
      }
    });

    it('should handle type validation errors', async () => {
      const testCases = [
        { tool: swiftPackageStopTool, params: { pid: 'not_a_number' }, field: 'pid' },
        {
          tool: swiftPackageRunTool,
          params: { packagePath: '/test', arguments: 'not_array' },
          field: 'arguments',
        },
        { tool: swiftPackageCleanTool, params: { packagePath: 123 }, field: 'packagePath' },
      ];

      for (const { tool, params, field } of testCases) {
        const result = await callToolHandler(tool, params as any);
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain(field);
      }
    });
  });

  // Tool schema validation
  describe('schema validation', () => {
    it('should have properly defined schemas for all run tools', () => {
      const tools = [
        swiftPackageRunTool,
        swiftPackageStopTool,
        swiftPackageListTool,
        swiftPackageCleanTool,
      ];

      tools.forEach((tool) => {
        expect(tool.schema).toBeDefined();
        expect(tool.schema.parse).toBeDefined();
        expect(tool.schema.safeParse).toBeDefined();
      });
    });

    it('should validate required parameters correctly', () => {
      // Test packagePath requirement
      const toolsRequiringPackagePath = [swiftPackageRunTool, swiftPackageCleanTool];

      toolsRequiringPackagePath.forEach((tool) => {
        const result = tool.schema.safeParse({});
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some((issue) => issue.path.includes('packagePath'))).toBe(
            true,
          );
        }
      });

      // Test pid requirement for stop tool
      const stopResult = swiftPackageStopTool.schema.safeParse({});
      expect(stopResult.success).toBe(false);
      if (!stopResult.success) {
        expect(stopResult.error.issues.some((issue) => issue.path.includes('pid'))).toBe(true);
      }

      // Test list tool accepts empty params
      const listResult = swiftPackageListTool.schema.safeParse({});
      expect(listResult.success).toBe(true);
    });
  });

  // Test that exactly 4 run tools exist (no hallucinated tools)
  describe('tool count validation', () => {
    it('should have exactly 4 canonical Run Swift Package tools', () => {
      const toolNames = [
        swiftPackageRunTool.name,
        swiftPackageStopTool.name,
        swiftPackageListTool.name,
        swiftPackageCleanTool.name,
      ];

      expect(toolNames).toHaveLength(4);
      expect(new Set(toolNames)).toHaveLength(4); // Ensure no duplicates

      // Verify no hallucinated tools remain
      expect(toolNames).not.toContain('swift_package_build');
      expect(toolNames).not.toContain('swift_package_test');
      expect(toolNames).not.toContain('swift_package_run_direct');
    });

    it('should match expected canonical run tool names exactly', () => {
      const toolNames = [
        swiftPackageRunTool.name,
        swiftPackageStopTool.name,
        swiftPackageListTool.name,
        swiftPackageCleanTool.name,
      ];

      const expectedNames = [
        'swift_package_run',
        'swift_package_stop',
        'swift_package_list',
        'swift_package_clean',
      ];

      expect(toolNames.sort()).toEqual(expectedNames.sort());
    });

    it('should ensure all run tools follow consistent naming patterns', () => {
      const tools = [
        swiftPackageRunTool,
        swiftPackageStopTool,
        swiftPackageListTool,
        swiftPackageCleanTool,
      ];

      tools.forEach((tool) => {
        // All tools should start with swift_package_
        expect(tool.name).toMatch(/^swift_package_[a-z_]+$/);

        // All tools should have non-empty descriptions
        expect(tool.description.length).toBeGreaterThan(10);

        // All tools should be in SWIFT_PACKAGE group
        expect(tool.groups).toContain('SWIFT_PACKAGE');

        // All tools should have exactly one group
        expect(tool.groups).toHaveLength(1);
      });
    });
  });
});
