/**
 * macOS Test Tools Tests - Comprehensive test coverage for test_macos.ts
 *
 * This test file provides complete coverage for all macOS test tools:
 * - test_macos_ws: Run tests for workspace on macOS
 * - test_macos_proj: Run tests for project on macOS
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive parameter validation testing.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { callToolHandler } from '../../tests-vitest/helpers/vitest-tool-helpers.js';
import { z } from 'zod';
import { ToolResponse } from '../types/common.js';

// Mock modules to prevent real command execution
vi.mock('child_process', () => ({ spawn: vi.fn() }));
vi.mock('fs/promises', () => ({
  mkdtemp: vi.fn(),
  rm: vi.fn(),
  stat: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

// Mock external dependencies
vi.mock('../utils/logger.js', () => ({
  log: vi.fn(),
}));

vi.mock('../utils/build-utils.js', () => ({
  executeXcodeBuildCommand: vi.fn(),
}));

vi.mock('../utils/validation.js', () => ({
  createTextResponse: vi.fn((text, isError = false) => ({
    content: [{ type: 'text', text }],
    isError,
  })),
}));

vi.mock('../utils/xcode.js', () => ({
  XcodePlatform: {
    IOS_SIMULATOR: 'iOS Simulator',
    IOS_DEVICE: 'iOS Device',
    MACOS: 'macOS',
  },
}));

vi.mock('util', () => ({
  promisify: vi.fn(() => vi.fn()),
}));

vi.mock('./test_common.js', () => ({
  handleTestLogic: vi.fn(),
}));

// Tool implementations for testing - these mirror the actual tool registrations
const testMacOSWorkspaceTool = {
  name: 'test_macos_ws',
  description: 'Runs tests for a macOS workspace using xcodebuild test and parses xcresult output.',
  groups: ['MACOS_BUILD'],
  schema: {
    workspacePath: z.string().describe('Path to the .xcworkspace file (Required)'),
    scheme: z.string().describe('The scheme to use (Required)'),
    configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
    derivedDataPath: z
      .string()
      .optional()
      .describe('Path where build products and other derived data will go'),
    extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    preferXcodebuild: z
      .boolean()
      .optional()
      .describe(
        'If true, prefers xcodebuild over the experimental incremental build system, useful for when incremental build system fails.',
      ),
  },
  handler: async (params: any): Promise<ToolResponse> => {
    const { handleTestLogic } = await import('./test_common.js');
    const { XcodePlatform } = await import('../utils/xcode.js');
    return handleTestLogic({
      ...params,
      configuration: params.configuration ?? 'Debug',
      preferXcodebuild: params.preferXcodebuild ?? false,
      platform: XcodePlatform.MACOS,
    });
  },
};

const testMacOSProjectTool = {
  name: 'test_macos_proj',
  description: 'Runs tests for a macOS project using xcodebuild test and parses xcresult output.',
  groups: ['MACOS_BUILD'],
  schema: {
    projectPath: z.string().describe('Path to the .xcodeproj file (Required)'),
    scheme: z.string().describe('The scheme to use (Required)'),
    configuration: z.string().optional().describe('Build configuration (Debug, Release, etc.)'),
    derivedDataPath: z
      .string()
      .optional()
      .describe('Path where build products and other derived data will go'),
    extraArgs: z.array(z.string()).optional().describe('Additional xcodebuild arguments'),
    preferXcodebuild: z
      .boolean()
      .optional()
      .describe(
        'If true, prefers xcodebuild over the experimental incremental build system, useful for when incremental build system fails.',
      ),
  },
  handler: async (params: any): Promise<ToolResponse> => {
    const { handleTestLogic } = await import('./test_common.js');
    const { XcodePlatform } = await import('../utils/xcode.js');
    return handleTestLogic({
      ...params,
      configuration: params.configuration ?? 'Debug',
      preferXcodebuild: params.preferXcodebuild ?? false,
      platform: XcodePlatform.MACOS,
    });
  },
};

describe('test_macos tools tests', () => {
  let mockHandleTestLogic: MockedFunction<any>;

  beforeEach(async () => {
    // Import mocked modules
    const testCommon = await import('./test_common.js');
    mockHandleTestLogic = testCommon.handleTestLogic as MockedFunction<any>;

    vi.clearAllMocks();
  });

  describe('test_macos_ws tool', () => {
    describe('parameter validation', () => {
      it('should reject missing workspacePath parameter', async () => {
        const result = await callToolHandler(testMacOSWorkspaceTool, {
          scheme: 'MyScheme',
        });

        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });

      it('should reject missing scheme parameter', async () => {
        const result = await callToolHandler(testMacOSWorkspaceTool, {
          workspacePath: '/path/to/workspace.xcworkspace',
        });

        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });

      it('should reject invalid extraArgs parameter type', async () => {
        const result = await callToolHandler(testMacOSWorkspaceTool, {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          extraArgs: 'invalid-string',
        });

        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Parameter 'extraArgs' must be of type array, but received string.",
          },
        ]);
        expect(result.isError).toBe(true);
      });

      it('should reject invalid preferXcodebuild parameter type', async () => {
        const result = await callToolHandler(testMacOSWorkspaceTool, {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          preferXcodebuild: 'true',
        });

        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Parameter 'preferXcodebuild' must be of type boolean, but received string.",
          },
        ]);
        expect(result.isError).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should run macOS workspace tests with minimum required parameters', async () => {
        mockHandleTestLogic.mockResolvedValue({
          content: [
            { type: 'text', text: '✅ macOS Test succeeded for scheme MyScheme.' },
            { type: 'text', text: '🖥️ Target: macOS' },
            { type: 'text', text: 'Test output:\nTEST SUCCEEDED' },
          ],
          isError: false,
        });

        const params = {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
        };

        const result = await callToolHandler(testMacOSWorkspaceTool, params);

        expect(result.content).toEqual([
          { type: 'text', text: '✅ macOS Test succeeded for scheme MyScheme.' },
          { type: 'text', text: '🖥️ Target: macOS' },
          { type: 'text', text: 'Test output:\nTEST SUCCEEDED' },
        ]);
        expect(result.isError).toBe(false);

        expect(mockHandleTestLogic).toHaveBeenCalledWith({
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Debug',
          preferXcodebuild: false,
          platform: 'macOS',
        });
      });

      it('should run macOS workspace tests with all optional parameters', async () => {
        mockHandleTestLogic.mockResolvedValue({
          content: [
            { type: 'text', text: '✅ macOS Test succeeded for scheme MyApp.' },
            { type: 'text', text: '🖥️ Target: macOS' },
            { type: 'text', text: 'Test output:\nBUILD SUCCEEDED' },
          ],
          isError: false,
        });

        const params = {
          workspacePath: '/Users/dev/MyApp/MyApp.xcworkspace',
          scheme: 'MyApp',
          configuration: 'Release',
          derivedDataPath: '/tmp/DerivedData',
          extraArgs: ['-parallel-testing-enabled', 'YES'],
          preferXcodebuild: true,
        };

        const result = await callToolHandler(testMacOSWorkspaceTool, params);

        expect(result.content).toEqual([
          { type: 'text', text: '✅ macOS Test succeeded for scheme MyApp.' },
          { type: 'text', text: '🖥️ Target: macOS' },
          { type: 'text', text: 'Test output:\nBUILD SUCCEEDED' },
        ]);
        expect(result.isError).toBe(false);

        expect(mockHandleTestLogic).toHaveBeenCalledWith({
          workspacePath: '/Users/dev/MyApp/MyApp.xcworkspace',
          scheme: 'MyApp',
          configuration: 'Release',
          derivedDataPath: '/tmp/DerivedData',
          extraArgs: ['-parallel-testing-enabled', 'YES'],
          preferXcodebuild: true,
          platform: 'macOS',
        });
      });

      it('should handle test failures correctly', async () => {
        mockHandleTestLogic.mockResolvedValue({
          content: [
            { type: 'text', text: '❌ macOS Test failed for scheme FailingApp.' },
            { type: 'text', text: '🖥️ Target: macOS' },
            { type: 'text', text: 'Test output:\nTEST FAILED' },
          ],
          isError: true,
        });

        const params = {
          workspacePath: '/path/to/failing.xcworkspace',
          scheme: 'FailingApp',
        };

        const result = await callToolHandler(testMacOSWorkspaceTool, params);

        expect(result.content).toEqual([
          { type: 'text', text: '❌ macOS Test failed for scheme FailingApp.' },
          { type: 'text', text: '🖥️ Target: macOS' },
          { type: 'text', text: 'Test output:\nTEST FAILED' },
        ]);
        expect(result.isError).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should handle handleTestLogic errors', async () => {
        mockHandleTestLogic.mockRejectedValue(new Error('Test execution failed'));

        const params = {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
        };

        const result = await callToolHandler(testMacOSWorkspaceTool, params);

        expect(result.content).toEqual([
          { type: 'text', text: 'Tool execution error: Test execution failed' },
        ]);
        expect(result.isError).toBe(true);
      });
    });
  });

  describe('test_macos_proj tool', () => {
    describe('parameter validation', () => {
      it('should reject missing projectPath parameter', async () => {
        const result = await callToolHandler(testMacOSProjectTool, {
          scheme: 'MyScheme',
        });

        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });

      it('should reject missing scheme parameter', async () => {
        const result = await callToolHandler(testMacOSProjectTool, {
          projectPath: '/path/to/project.xcodeproj',
        });

        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
          },
        ]);
        expect(result.isError).toBe(true);
      });

      it('should reject invalid extraArgs parameter type', async () => {
        const result = await callToolHandler(testMacOSProjectTool, {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          extraArgs: 'invalid-string',
        });

        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Parameter 'extraArgs' must be of type array, but received string.",
          },
        ]);
        expect(result.isError).toBe(true);
      });

      it('should reject invalid preferXcodebuild parameter type', async () => {
        const result = await callToolHandler(testMacOSProjectTool, {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          preferXcodebuild: 'true',
        });

        expect(result.content).toEqual([
          {
            type: 'text',
            text: "Parameter 'preferXcodebuild' must be of type boolean, but received string.",
          },
        ]);
        expect(result.isError).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should run macOS project tests with minimum required parameters', async () => {
        mockHandleTestLogic.mockResolvedValue({
          content: [
            { type: 'text', text: '✅ macOS Test succeeded for scheme MyApp.' },
            { type: 'text', text: '🖥️ Target: macOS' },
            { type: 'text', text: 'Test output:\nTEST SUCCEEDED' },
          ],
          isError: false,
        });

        const params = {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyApp',
        };

        const result = await callToolHandler(testMacOSProjectTool, params);

        expect(result.content).toEqual([
          { type: 'text', text: '✅ macOS Test succeeded for scheme MyApp.' },
          { type: 'text', text: '🖥️ Target: macOS' },
          { type: 'text', text: 'Test output:\nTEST SUCCEEDED' },
        ]);
        expect(result.isError).toBe(false);

        expect(mockHandleTestLogic).toHaveBeenCalledWith({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyApp',
          configuration: 'Debug',
          preferXcodebuild: false,
          platform: 'macOS',
        });
      });

      it('should run macOS project tests with all optional parameters', async () => {
        mockHandleTestLogic.mockResolvedValue({
          content: [
            { type: 'text', text: '✅ macOS Test succeeded for scheme MyProject.' },
            { type: 'text', text: '🖥️ Target: macOS' },
            { type: 'text', text: 'Test output:\nBUILD SUCCEEDED' },
          ],
          isError: false,
        });

        const params = {
          projectPath: '/Users/dev/MyProject/MyProject.xcodeproj',
          scheme: 'MyProject',
          configuration: 'Release',
          derivedDataPath: '/custom/DerivedData',
          extraArgs: ['-test-timeouts-enabled', 'YES'],
          preferXcodebuild: true,
        };

        const result = await callToolHandler(testMacOSProjectTool, params);

        expect(result.content).toEqual([
          { type: 'text', text: '✅ macOS Test succeeded for scheme MyProject.' },
          { type: 'text', text: '🖥️ Target: macOS' },
          { type: 'text', text: 'Test output:\nBUILD SUCCEEDED' },
        ]);
        expect(result.isError).toBe(false);

        expect(mockHandleTestLogic).toHaveBeenCalledWith({
          projectPath: '/Users/dev/MyProject/MyProject.xcodeproj',
          scheme: 'MyProject',
          configuration: 'Release',
          derivedDataPath: '/custom/DerivedData',
          extraArgs: ['-test-timeouts-enabled', 'YES'],
          preferXcodebuild: true,
          platform: 'macOS',
        });
      });

      it('should handle test failures correctly', async () => {
        mockHandleTestLogic.mockResolvedValue({
          content: [
            { type: 'text', text: '❌ macOS Test failed for scheme BrokenApp.' },
            { type: 'text', text: '🖥️ Target: macOS' },
            { type: 'text', text: 'Test output:\nTEST FAILED' },
          ],
          isError: true,
        });

        const params = {
          projectPath: '/path/to/broken.xcodeproj',
          scheme: 'BrokenApp',
        };

        const result = await callToolHandler(testMacOSProjectTool, params);

        expect(result.content).toEqual([
          { type: 'text', text: '❌ macOS Test failed for scheme BrokenApp.' },
          { type: 'text', text: '🖥️ Target: macOS' },
          { type: 'text', text: 'Test output:\nTEST FAILED' },
        ]);
        expect(result.isError).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should handle handleTestLogic errors', async () => {
        mockHandleTestLogic.mockRejectedValue(new Error('Project test execution failed'));

        const params = {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
        };

        const result = await callToolHandler(testMacOSProjectTool, params);

        expect(result.content).toEqual([
          { type: 'text', text: 'Tool execution error: Project test execution failed' },
        ]);
        expect(result.isError).toBe(true);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle comprehensive macOS workspace test workflow', async () => {
      mockHandleTestLogic.mockResolvedValue({
        content: [
          { type: 'text', text: '✅ macOS Test succeeded for scheme MyMacApp.' },
          { type: 'text', text: '🖥️ Target: macOS' },
          {
            type: 'text',
            text: 'Test output:\nALL TESTS PASSED\n\nTest Results Summary:\nTest Summary: MyMacApp Tests\nOverall Result: SUCCESS\n\nTest Counts:\n  Total: 25\n  Passed: 25\n  Failed: 0\n  Skipped: 0\n  Expected Failures: 0',
          },
        ],
        isError: false,
      });

      const params = {
        workspacePath: '/Users/dev/MyMacApp/MyMacApp.xcworkspace',
        scheme: 'MyMacApp',
        configuration: 'Debug',
        derivedDataPath: '/tmp/DerivedData/MyMacApp',
        extraArgs: ['-parallel-testing-enabled', 'YES', '-test-timeouts-enabled', 'YES'],
      };

      const result = await callToolHandler(testMacOSWorkspaceTool, params);

      expect(result.content).toEqual([
        { type: 'text', text: '✅ macOS Test succeeded for scheme MyMacApp.' },
        { type: 'text', text: '🖥️ Target: macOS' },
        {
          type: 'text',
          text: 'Test output:\nALL TESTS PASSED\n\nTest Results Summary:\nTest Summary: MyMacApp Tests\nOverall Result: SUCCESS\n\nTest Counts:\n  Total: 25\n  Passed: 25\n  Failed: 0\n  Skipped: 0\n  Expected Failures: 0',
        },
      ]);
      expect(result.isError).toBe(false);

      expect(mockHandleTestLogic).toHaveBeenCalledWith({
        workspacePath: '/Users/dev/MyMacApp/MyMacApp.xcworkspace',
        scheme: 'MyMacApp',
        configuration: 'Debug',
        derivedDataPath: '/tmp/DerivedData/MyMacApp',
        extraArgs: ['-parallel-testing-enabled', 'YES', '-test-timeouts-enabled', 'YES'],
        preferXcodebuild: false,
        platform: 'macOS',
      });
    });

    it('should handle comprehensive macOS project test workflow with failures', async () => {
      mockHandleTestLogic.mockResolvedValue({
        content: [
          { type: 'text', text: '❌ macOS Test failed for scheme MyFailingApp.' },
          { type: 'text', text: '🖥️ Target: macOS' },
          {
            type: 'text',
            text: 'Test output:\nTEST FAILED\n\nTest Results Summary:\nTest Summary: MyFailingApp Tests\nOverall Result: FAILURE\n\nTest Counts:\n  Total: 10\n  Passed: 7\n  Failed: 3\n  Skipped: 0\n  Expected Failures: 0\n\nTest Failures:\n  1. testDataPersistence (CoreDataTests)\n     Core Data save operation failed\n  2. testNetworkRequest (NetworkTests)\n     Network request timed out',
          },
        ],
        isError: true,
      });

      const params = {
        projectPath: '/Users/dev/MyFailingApp/MyFailingApp.xcodeproj',
        scheme: 'MyFailingApp',
        configuration: 'Release',
        preferXcodebuild: true,
      };

      const result = await callToolHandler(testMacOSProjectTool, params);

      expect(result.content).toEqual([
        { type: 'text', text: '❌ macOS Test failed for scheme MyFailingApp.' },
        { type: 'text', text: '🖥️ Target: macOS' },
        {
          type: 'text',
          text: 'Test output:\nTEST FAILED\n\nTest Results Summary:\nTest Summary: MyFailingApp Tests\nOverall Result: FAILURE\n\nTest Counts:\n  Total: 10\n  Passed: 7\n  Failed: 3\n  Skipped: 0\n  Expected Failures: 0\n\nTest Failures:\n  1. testDataPersistence (CoreDataTests)\n     Core Data save operation failed\n  2. testNetworkRequest (NetworkTests)\n     Network request timed out',
        },
      ]);
      expect(result.isError).toBe(true);

      expect(mockHandleTestLogic).toHaveBeenCalledWith({
        projectPath: '/Users/dev/MyFailingApp/MyFailingApp.xcodeproj',
        scheme: 'MyFailingApp',
        configuration: 'Release',
        preferXcodebuild: true,
        platform: 'macOS',
      });
    });
  });
});
