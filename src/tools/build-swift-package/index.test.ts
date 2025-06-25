/**
 * Tests for build-swift-package.ts tool
 *
 * Tests the swift_package_build tool specifically from build-swift-package.ts
 * Refactored to test actual production functions instead of mock implementations.
 * Follows CLAUDE.md testing principles exactly.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

// ✅ Import actual production function
import { registerBuildSwiftPackageTool } from './index.js';

// ✅ Mock external dependencies only
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
}));

// ✅ Mock the executeCommand function
vi.mock('../../utils/command.js', () => ({
  executeCommand: vi.fn(),
}));

// ✅ Mock logger to prevent real logging during tests
vi.mock('../../utils/logger.js', () => ({
  log: vi.fn(),
}));

// ✅ Mock error utilities
vi.mock('../../utils/errors.js', () => ({
  createErrorResponse: vi.fn(),
}));

// ✅ Helper function to create mock server for testing tool registration
function createMockServer() {
  const tools = new Map();
  return {
    setRequestHandler: vi.fn(),
    tool: vi.fn((name: string, description: string, schema: any, handler: any) => {
      tools.set(name, { name, description, schema, handler });
    }),
    tools,
  } as any;
}

// ✅ Helper function to extract registered tool handler
function getRegisteredTool(registerFunction: any, toolName: string) {
  const mockServer = createMockServer();
  registerFunction(mockServer);
  return mockServer.tools.get(toolName);
}

describe('swift_package_build tool', () => {
  let mockExecuteCommand: MockedFunction<any>;
  let mockCreateErrorResponse: MockedFunction<any>;

  beforeEach(async () => {
    // ✅ Mock external dependencies
    const { executeCommand } = await import('../../utils/command.js');
    mockExecuteCommand = executeCommand as MockedFunction<any>;
    mockExecuteCommand.mockResolvedValue({
      success: true,
      output: 'Build complete! (2.34s)',
      error: '',
    });

    const { createErrorResponse } = await import('../../utils/errors.js');
    mockCreateErrorResponse = createErrorResponse as MockedFunction<any>;
    mockCreateErrorResponse.mockReturnValue({
      content: [{ type: 'text', text: 'Error message' }],
      isError: true,
    });

    vi.clearAllMocks();
  });

  // ✅ Test actual production function
  describe('parameter validation', () => {
    let buildTool: any;

    beforeEach(() => {
      buildTool = getRegisteredTool(registerBuildSwiftPackageTool, 'swift_package_build');
    });

    it('should reject missing packagePath', async () => {
      const params = {};
      const result = await buildTool.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'packagePath' is missing. Please provide a value for this parameter.",
        },
      ]);
    });
  });

  describe('success scenarios', () => {
    let buildTool: any;

    beforeEach(() => {
      buildTool = getRegisteredTool(registerBuildSwiftPackageTool, 'swift_package_build');
    });

    it('should accept valid packagePath only', async () => {
      const params = { packagePath: '/path/to/package' };
      const result = await buildTool.handler(params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Swift package build succeeded.' },
        {
          type: 'text',
          text: '💡 Next: Run tests with swift_package_test or execute with swift_package_run',
        },
        { type: 'text', text: 'Build complete! (2.34s)' },
      ]);

      // ✅ Verify actual production function called external dependency correctly
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        ['swift', 'build', '--package-path', '/path/to/package'],
        'Swift Package Build',
      );
    });

    it('should accept optional parameters', async () => {
      const params = {
        packagePath: '/path/to/package',
        targetName: 'MyTarget',
        configuration: 'release' as const,
        architectures: ['arm64' as const],
        parseAsLibrary: true,
      };
      const result = await buildTool.handler(params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Swift package build succeeded.' },
        {
          type: 'text',
          text: '💡 Next: Run tests with swift_package_test or execute with swift_package_run',
        },
        { type: 'text', text: 'Build complete! (2.34s)' },
      ]);

      // ✅ Verify actual production function called external dependency with all parameters
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        [
          'swift',
          'build',
          '--package-path',
          '/path/to/package',
          '-c',
          'release',
          '--target',
          'MyTarget',
          '--arch',
          'arm64',
          '-Xswiftc',
          '-parse-as-library',
        ],
        'Swift Package Build',
      );
    });
  });

  describe('error handling', () => {
    let buildTool: any;

    beforeEach(() => {
      buildTool = getRegisteredTool(registerBuildSwiftPackageTool, 'swift_package_build');
    });

    it('should handle command execution failure', async () => {
      // ✅ Mock external dependency failure
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Swift build failed',
      });

      const params = {
        packagePath: '/path/to/package',
      };

      const result = await buildTool.handler(params);

      expect(result.isError).toBe(true);
      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        'Swift package build failed',
        'Swift build failed',
        'BuildError',
      );
    });

    it('should handle execution exceptions', async () => {
      // ✅ Mock external dependency to throw an error
      mockExecuteCommand.mockRejectedValue(new Error('Command execution failed'));

      const params = {
        packagePath: '/path/to/package',
      };

      const result = await buildTool.handler(params);

      expect(result.isError).toBe(true);
      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        'Failed to execute swift build',
        'Command execution failed',
        'SystemError',
      );
    });
  });

  // ✅ Tool registration verification
  describe('tool registration', () => {
    it('should register swift_package_build tool with correct name', () => {
      const mockServer = createMockServer();
      registerBuildSwiftPackageTool(mockServer);

      expect(mockServer.tools.has('swift_package_build')).toBe(true);
      const tool = mockServer.tools.get('swift_package_build');
      expect(tool.name).toBe('swift_package_build');
    });
  });
});
