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
import { registerMacOSTestWorkspaceTool, registerMacOSTestProjectTool } from './index.js';
import { ToolResponse } from '../../types/common.js';

// Mock external dependencies only
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execSync: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  mkdtemp: vi.fn(),
  rm: vi.fn(),
  stat: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('../../utils/logger.js', () => ({
  log: vi.fn(),
}));

vi.mock('../../utils/build-utils.js', () => ({
  executeXcodeBuildCommand: vi.fn(),
}));

vi.mock('../test-common/index.js', () => ({
  handleTestLogic: vi.fn(),
}));

// Create actual tool functions for testing
let testMacOSWorkspaceHandler: (params: any) => Promise<ToolResponse>;
let testMacOSProjectHandler: (params: any) => Promise<ToolResponse>;

// Mock server to capture tool handlers
const mockServer = {
  tool: vi.fn((name: string, description: string, schema: any, handler: any) => {
    if (name === 'test_macos_ws') {
      testMacOSWorkspaceHandler = handler;
    } else if (name === 'test_macos_proj') {
      testMacOSProjectHandler = handler;
    }
  }),
} as any;

// Register the actual tools to capture their handlers
registerMacOSTestWorkspaceTool(mockServer);
registerMacOSTestProjectTool(mockServer);

describe('test_macos tools tests', () => {
  let mockHandleTestLogic: MockedFunction<any>;

  beforeEach(async () => {
    // Import mocked modules
    const testCommon = await import('../test-common/index.js');
    mockHandleTestLogic = testCommon.handleTestLogic as MockedFunction<any>;

    vi.clearAllMocks();
  });

  describe('test_macos_ws tool', () => {
    describe('parameter validation', () => {
      it('should call handleTestLogic with provided parameters', async () => {
        mockHandleTestLogic.mockResolvedValue({
          content: [{ type: 'text', text: 'Success' }],
          isError: false,
        });

        const result = await testMacOSWorkspaceHandler({
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
        });

        expect(result).toBeDefined();
        expect(mockHandleTestLogic).toHaveBeenCalledWith({
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Debug',
          preferXcodebuild: false,
          platform: 'macOS',
        });
      });

      it('should call handleTestLogic even with missing parameters', async () => {
        mockHandleTestLogic.mockResolvedValue({
          content: [{ type: 'text', text: 'Success' }],
          isError: false,
        });

        const result = await testMacOSWorkspaceHandler({
          scheme: 'MyScheme',
        });

        expect(result).toBeDefined();
        expect(mockHandleTestLogic).toHaveBeenCalledWith({
          scheme: 'MyScheme',
          configuration: 'Debug',
          preferXcodebuild: false,
          platform: 'macOS',
        });
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

        const result = await testMacOSWorkspaceHandler(params);

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

        const result = await testMacOSWorkspaceHandler(params);

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

        const result = await testMacOSWorkspaceHandler(params);

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

        await expect(testMacOSWorkspaceHandler(params)).rejects.toThrow('Test execution failed');
      });
    });
  });

  describe('test_macos_proj tool', () => {
    describe('parameter validation', () => {
      it('should call handleTestLogic with project parameters', async () => {
        mockHandleTestLogic.mockResolvedValue({
          content: [{ type: 'text', text: 'Success' }],
          isError: false,
        });

        const result = await testMacOSProjectHandler({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
        });

        expect(result).toBeDefined();
        expect(mockHandleTestLogic).toHaveBeenCalledWith({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          configuration: 'Debug',
          preferXcodebuild: false,
          platform: 'macOS',
        });
      });

      it('should call handleTestLogic even with missing projectPath', async () => {
        mockHandleTestLogic.mockResolvedValue({
          content: [{ type: 'text', text: 'Success' }],
          isError: false,
        });

        const result = await testMacOSProjectHandler({
          scheme: 'MyScheme',
        });

        expect(result).toBeDefined();
        expect(mockHandleTestLogic).toHaveBeenCalledWith({
          scheme: 'MyScheme',
          configuration: 'Debug',
          preferXcodebuild: false,
          platform: 'macOS',
        });
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

        const result = await testMacOSProjectHandler(params);

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

        const result = await testMacOSProjectHandler(params);

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

        const result = await testMacOSProjectHandler(params);

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

        await expect(testMacOSProjectHandler(params)).rejects.toThrow(
          'Project test execution failed',
        );
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

      const result = await testMacOSWorkspaceHandler(params);

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

      const result = await testMacOSProjectHandler(params);

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
