/**
 * Tests for swift_package_build plugin
 *
 * Tests the swift_package_build plugin specifically
 * Validates plugin exports and tests handler directly
 * Follows CLAUDE.md testing principles exactly.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

// ✅ Import the plugin 
import swiftPackageBuild from './swift_package_build.ts';

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
vi.mock('../../src/utils/command.ts', () => ({
  executeCommand: vi.fn(),
}));

// ✅ Mock logger to prevent real logging during tests
vi.mock('../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

// ✅ Mock error utilities
vi.mock('../../src/utils/errors.ts', () => ({
  createErrorResponse: vi.fn(),
}));

describe('swift_package_build plugin', () => {
  let mockExecuteCommand: MockedFunction<any>;
  let mockCreateErrorResponse: MockedFunction<any>;

  beforeEach(async () => {
    // ✅ Mock external dependencies
    const { executeCommand } = await import('../../src/utils/command.ts');
    mockExecuteCommand = executeCommand as MockedFunction<any>;
    mockExecuteCommand.mockResolvedValue({
      success: true,
      output: 'Build complete! (2.34s)',
      error: '',
    });

    const { createErrorResponse } = await import('../../src/utils/errors.ts');
    mockCreateErrorResponse = createErrorResponse as MockedFunction<any>;
    mockCreateErrorResponse.mockReturnValue({
      content: [{ type: 'text', text: 'Error message' }],
      isError: true,
    });

    vi.clearAllMocks();
  });

  // ✅ Test plugin exports
  describe('plugin structure', () => {
    it('should export correct name', () => {
      expect(swiftPackageBuild.name).toBe('swift_package_build');
    });

    it('should export correct description', () => {
      expect(swiftPackageBuild.description).toBe('Builds a Swift Package with swift build');
    });

    it('should export schema with correct properties', () => {
      expect(swiftPackageBuild.schema).toHaveProperty('packagePath');
      expect(swiftPackageBuild.schema).toHaveProperty('targetName');
      expect(swiftPackageBuild.schema).toHaveProperty('configuration');
      expect(swiftPackageBuild.schema).toHaveProperty('architectures');
      expect(swiftPackageBuild.schema).toHaveProperty('parseAsLibrary');
    });

    it('should have a handler function', () => {
      expect(typeof swiftPackageBuild.handler).toBe('function');
    });
  });

  // ✅ Test plugin handler behavior
  describe('parameter validation', () => {
    it('should reject missing packagePath', async () => {
      const params = {};
      const result = await swiftPackageBuild.handler(params);

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
    it('should accept valid packagePath only', async () => {
      const params = { packagePath: '/path/to/package' };
      const result = await swiftPackageBuild.handler(params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Swift package build succeeded.' },
        {
          type: 'text',
          text: '💡 Next: Run tests with swift_package_test or execute with swift_package_run',
        },
        { type: 'text', text: 'Build complete! (2.34s)' },
      ]);

      // ✅ Verify plugin calls the underlying handler correctly
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
      const result = await swiftPackageBuild.handler(params);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual([
        { type: 'text', text: '✅ Swift package build succeeded.' },
        {
          type: 'text',
          text: '💡 Next: Run tests with swift_package_test or execute with swift_package_run',
        },
        { type: 'text', text: 'Build complete! (2.34s)' },
      ]);

      // ✅ Verify plugin calls the underlying handler with all parameters
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

      const result = await swiftPackageBuild.handler(params);

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

      const result = await swiftPackageBuild.handler(params);

      expect(result.isError).toBe(true);
      expect(mockCreateErrorResponse).toHaveBeenCalledWith(
        'Failed to execute swift build',
        'Command execution failed',
        'SystemError',
      );
    });
  });
});
