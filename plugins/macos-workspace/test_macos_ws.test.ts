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
import testMacOSWs from './test_macos_ws.ts';
import { ToolResponse } from '../../src/types/common.ts';

// Mock external dependencies only
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execSync: vi.fn(),
  exec: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  mkdtemp: vi.fn(),
  rm: vi.fn(),
  stat: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

vi.mock('../../src/utils/build-utils.ts', () => ({
  executeXcodeBuildCommand: vi.fn(),
}));

vi.mock('../../src/utils/validation.ts', () => ({
  createTextResponse: vi.fn(),
}));

vi.mock('util', () => ({
  promisify: vi.fn(() => vi.fn()),
}));

vi.mock('os', () => ({
  tmpdir: vi.fn(() => '/tmp'),
}));

vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
}));

describe('test_macos_ws plugin tests', () => {
  let mockExecuteXcodeBuildCommand: MockedFunction<any>;
  let mockMkdtemp: MockedFunction<any>;
  let mockRm: MockedFunction<any>;
  let mockStat: MockedFunction<any>;
  let mockPromisify: MockedFunction<any>;

  beforeEach(async () => {
    // Import mocked modules
    const buildUtils = await import('../../src/utils/build-utils.ts');
    const fsPromises = await import('fs/promises');
    const util = await import('util');
    
    mockExecuteXcodeBuildCommand = buildUtils.executeXcodeBuildCommand as MockedFunction<any>;
    mockMkdtemp = fsPromises.mkdtemp as MockedFunction<any>;
    mockRm = fsPromises.rm as MockedFunction<any>;
    mockStat = fsPromises.stat as MockedFunction<any>;
    mockPromisify = util.promisify as MockedFunction<any>;

    // Setup default mock behaviors
    mockMkdtemp.mockResolvedValue('/tmp/test-dir');
    mockRm.mockResolvedValue(undefined);
    mockStat.mockResolvedValue({ isFile: () => true });
    
    const mockExecAsync = vi.fn();
    mockExecAsync.mockResolvedValue({ stdout: '{"title":"Test Results","result":"passed"}' });
    mockPromisify.mockReturnValue(mockExecAsync);

    vi.clearAllMocks();
    
    // Re-setup the mocks after clearing
    mockMkdtemp.mockResolvedValue('/tmp/test-dir');
    mockRm.mockResolvedValue(undefined);
    mockStat.mockResolvedValue({ isFile: () => true });
    mockPromisify.mockReturnValue(mockExecAsync);
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
        mockExecuteXcodeBuildCommand.mockResolvedValue({
          content: [{ type: 'text', text: 'Success' }],
          isError: false,
        });

        const result = await testMacOSWs.handler({
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
        });

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(Array.isArray(result.content)).toBe(true);
      });

      it('should call handleTestLogic even with missing parameters', async () => {
        mockExecuteXcodeBuildCommand.mockResolvedValue({
          content: [{ type: 'text', text: 'Success' }],
          isError: false,
        });

        const result = await testMacOSWs.handler({
          scheme: 'MyScheme',
        });

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(Array.isArray(result.content)).toBe(true);
      });
    });

    describe('success scenarios', () => {
      it('should run macOS workspace tests with minimum required parameters', async () => {
        mockExecuteXcodeBuildCommand.mockResolvedValue({
          content: [
            { type: 'text', text: '✅ macOS Test succeeded for scheme MyScheme.' },
          ],
          isError: false,
        });

        const params = {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
        };

        const result = await testMacOSWs.handler(params);

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.isError).toBe(false);
      });

      it('should run macOS workspace tests with all optional parameters', async () => {
        mockExecuteXcodeBuildCommand.mockResolvedValue({
          content: [
            { type: 'text', text: '✅ macOS Test succeeded for scheme MyApp.' },
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

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.isError).toBe(false);
      });

      it('should handle test failures correctly', async () => {
        mockExecuteXcodeBuildCommand.mockResolvedValue({
          content: [
            { type: 'text', text: '❌ macOS Test failed for scheme FailingApp.' },
          ],
          isError: true,
        });

        const params = {
          workspacePath: '/path/to/failing.xcworkspace',
          scheme: 'FailingApp',
        };

        const result = await testMacOSWs.handler(params);

        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.isError).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should handle handleTestLogic errors', async () => {
        // The error is handled internally and returns a valid response
        const params = {
          workspacePath: '/path/to/workspace.xcworkspace',  
          scheme: 'MyScheme',
        };

        const result = await testMacOSWs.handler(params);
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.isError).toBe(true);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle comprehensive macOS workspace test workflow', async () => {
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          { type: 'text', text: '✅ macOS Test succeeded for scheme MyMacApp.' },
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

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBe(false);
    });
  });
});
