/**
 * Tests for test_macos_ws plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import testMacosWs from './test_macos_ws.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  executeXcodeBuildCommand: vi.fn(),
  createTextResponse: vi.fn(),
}));

vi.mock('util', () => ({
  promisify: vi.fn(),
}));

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  mkdtemp: vi.fn(),
  rm: vi.fn(),
  stat: vi.fn(),
}));

vi.mock('os', () => ({
  tmpdir: vi.fn(() => '/tmp'),
}));

vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
}));

describe('test_macos_ws plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(testMacosWs.name).toBe('test_macos_ws');
    });

    it('should have correct description', () => {
      expect(testMacosWs.description).toBe(
        'Runs tests for a macOS workspace using xcodebuild test and parses xcresult output.',
      );
    });

    it('should have handler function', () => {
      expect(typeof testMacosWs.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        testMacosWs.schema.workspacePath.safeParse('/path/to/MyProject.xcworkspace').success,
      ).toBe(true);
      expect(testMacosWs.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(testMacosWs.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(testMacosWs.schema.derivedDataPath.safeParse('/path/to/derived-data').success).toBe(
        true,
      );
      expect(testMacosWs.schema.extraArgs.safeParse(['--arg1', '--arg2']).success).toBe(true);
      expect(testMacosWs.schema.preferXcodebuild.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(testMacosWs.schema.workspacePath.safeParse(null).success).toBe(false);
      expect(testMacosWs.schema.scheme.safeParse(null).success).toBe(false);
      expect(testMacosWs.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(testMacosWs.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
    });
  });

  let mockExecuteXcodeBuildCommand: MockedFunction<any>;
  let mockCreateTextResponse: MockedFunction<any>;
  let mockMkdtemp: MockedFunction<any>;
  let mockRm: MockedFunction<any>;
  let mockStat: MockedFunction<any>;
  let mockPromisify: MockedFunction<any>;
  let mockExecPromise: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');
    const utilModule = await import('util');
    const fsPromises = await import('fs/promises');

    mockExecuteXcodeBuildCommand = utils.executeXcodeBuildCommand as MockedFunction<any>;
    mockCreateTextResponse = utils.createTextResponse as MockedFunction<any>;
    mockPromisify = utilModule.promisify as MockedFunction<any>;
    mockMkdtemp = fsPromises.mkdtemp as MockedFunction<any>;
    mockRm = fsPromises.rm as MockedFunction<any>;
    mockStat = fsPromises.stat as MockedFunction<any>;

    // Create a mock function for the promisified exec
    mockExecPromise = vi.fn();
    mockPromisify.mockReturnValue(mockExecPromise);

    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact successful test response with xcresult parsing', async () => {
      // Mock temp directory creation
      mockMkdtemp.mockResolvedValue('/tmp/xcodebuild-test-123');

      // Mock successful test execution
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '✅ macOS Test succeeded for scheme MyScheme\n\nTest completed successfully',
          },
        ],
      });

      // Mock xcresult bundle exists
      mockStat.mockResolvedValue({ isFile: () => true });

      // Mock xcresulttool output
      mockExecPromise.mockResolvedValue({
        stdout:
          '{"title":"Test Results","result":"passed","totalTestCount":5,"passedTests":5,"failedTests":0}',
      });

      // Mock cleanup
      mockRm.mockResolvedValue(undefined);

      const result = await testMacosWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS Test succeeded for scheme MyScheme\n\nTest completed successfully',
          },
          {
            type: 'text',
            text: '\nTest Results Summary:\nTest Summary: Test Results\nOverall Result: passed\n\nTest Counts:\n  Total: 5\n  Passed: 5\n  Failed: 0\n  Skipped: 0\n  Expected Failures: 0\n',
          },
        ],
      });
    });

    it('should return exact test failure response', async () => {
      // Mock temp directory creation
      mockMkdtemp.mockResolvedValue('/tmp/xcodebuild-test-123');

      // Mock failed test execution
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '❌ macOS Test failed for scheme MyScheme',
          },
        ],
        isError: true,
      });

      // Mock xcresult bundle does not exist
      mockStat.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      // Mock cleanup
      mockRm.mockResolvedValue(undefined);

      const result = await testMacosWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ macOS Test failed for scheme MyScheme',
          },
        ],
        isError: true,
      });
    });

    it('should return exact successful test response without xcresult parsing', async () => {
      // Mock temp directory creation
      mockMkdtemp.mockResolvedValue('/tmp/xcodebuild-test-123');

      // Mock successful test execution
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '✅ macOS Test succeeded for scheme MyScheme\n\nTest completed successfully',
          },
        ],
      });

      // Mock xcresult bundle does not exist
      mockStat.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      // Mock cleanup
      mockRm.mockResolvedValue(undefined);

      const result = await testMacosWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS Test succeeded for scheme MyScheme\n\nTest completed successfully',
          },
        ],
      });
    });

    it('should return exact exception handling response', async () => {
      // Mock temp directory creation failure
      mockMkdtemp.mockRejectedValue(new Error('Permission denied'));

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Error during test run: Permission denied',
          },
        ],
        isError: true,
      });

      const result = await testMacosWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during test run: Permission denied',
          },
        ],
        isError: true,
      });
    });

    it('should return exact string error handling response', async () => {
      // Mock temp directory creation with string error
      mockMkdtemp.mockRejectedValue('String error');

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Error during test run: String error',
          },
        ],
        isError: true,
      });

      const result = await testMacosWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during test run: String error',
          },
        ],
        isError: true,
      });
    });
  });
});
