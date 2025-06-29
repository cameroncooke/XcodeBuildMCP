/**
 * test_macos_ws Plugin Tests - Plugin validation and functionality tests
 *
 * This test file provides complete test coverage for the test_macos_ws plugin:
 * - Plugin structure validation
 * - Tool functionality via extracted components
 * - Parameter validation and error handling
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive parameter validation testing.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import testMacOSWs from './test_macos_ws.js';
import { ToolResponse } from '../../src/types/common.js';

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

vi.mock('../../src/tools/test-common/index.js', () => ({
  handleTestLogic: vi.fn(),
}));

describe('test_macos_ws plugin tests', () => {
  let mockHandleTestLogic: MockedFunction<any>;

  beforeEach(async () => {
    // Import mocked modules
    const testCommon = await import('../../src/tools/test-common/index.js');
    mockHandleTestLogic = testCommon.handleTestLogic as MockedFunction<any>;

    vi.clearAllMocks();
  });

  describe('plugin structure', () => {
    it('should have correct plugin structure', () => {
      expect(testMacOSWs).toBeDefined();
      expect(testMacOSWs.name).toBe('test_macos_ws');
      expect(testMacOSWs.description).toBe('Runs tests for a macOS workspace using xcodebuild test and parses xcresult output.');
      expect(testMacOSWs.schema).toBeDefined();
      expect(testMacOSWs.handler).toBeTypeOf('function');
    });

    it('should have expected schema properties', () => {
      const schema = testMacOSWs.schema;
      expect(schema.workspacePath).toBeDefined();
      expect(schema.scheme).toBeDefined();
      expect(schema.configuration).toBeDefined();
      expect(schema.derivedDataPath).toBeDefined();
      expect(schema.extraArgs).toBeDefined();
      expect(schema.preferXcodebuild).toBeDefined();
    });
  });

  describe('test_macos_ws tool', () => {
    describe('parameter validation', () => {
      it('should call handleTestLogic with provided parameters', async () => {
        mockHandleTestLogic.mockResolvedValue({
          content: [{ type: 'text', text: 'Success' }],
          isError: false,
        });

        const result = await testMacOSWs.handler({
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

        const result = await testMacOSWs.handler({
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

        const result = await testMacOSWs.handler(params);

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

        const result = await testMacOSWs.handler(params);

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

        const result = await testMacOSWs.handler(params);

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

        await expect(testMacOSWs.handler(params)).rejects.toThrow('Test execution failed');
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

      const result = await testMacOSWs.handler(params);

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
  });
});
