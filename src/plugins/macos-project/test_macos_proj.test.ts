import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import tool from './test_macos_proj.ts';
import { log, executeXcodeBuildCommand, createTextResponse } from '../../utils/index.js';
import { promisify } from 'util';
import { exec } from 'child_process';
import { mkdtemp, rm, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { MockedFunction } from 'vitest';

// Mock all dependencies
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
  tmpdir: vi.fn(),
}));

vi.mock('path', () => ({
  join: vi.fn(),
}));

const mockLog = log as MockedFunction<typeof log>;
const mockExecuteXcodeBuildCommand = executeXcodeBuildCommand as MockedFunction<
  typeof executeXcodeBuildCommand
>;
const mockCreateTextResponse = createTextResponse as MockedFunction<typeof createTextResponse>;
const mockPromisify = promisify as MockedFunction<typeof promisify>;
const mockExec = exec as MockedFunction<typeof exec>;
const mockMkdtemp = mkdtemp as MockedFunction<typeof mkdtemp>;
const mockRm = rm as MockedFunction<typeof rm>;
const mockStat = stat as MockedFunction<typeof stat>;
const mockTmpdir = tmpdir as MockedFunction<typeof tmpdir>;
const mockJoin = join as MockedFunction<typeof join>;

describe('test_macos_proj', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should export the correct name', () => {
      expect(tool.name).toBe('test_macos_proj');
    });

    it('should export the correct description', () => {
      expect(tool.description).toBe(
        'Runs tests for a macOS project using xcodebuild test and parses xcresult output.',
      );
    });

    it('should export a handler function', () => {
      expect(typeof tool.handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      const validInput = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        configuration: 'Debug',
        derivedDataPath: '/path/to/derived',
        extraArgs: ['--verbose'],
        preferXcodebuild: true,
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(validInput).success).toBe(true);
    });

    it('should validate schema with minimal valid inputs', () => {
      const validInput = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(validInput).success).toBe(true);
    });

    it('should reject invalid projectPath', () => {
      const invalidInput = {
        projectPath: 123,
        scheme: 'MyApp',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });

    it('should reject invalid scheme', () => {
      const invalidInput = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 123,
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });

    it('should reject invalid extraArgs', () => {
      const invalidInput = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        extraArgs: 'not-array',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });

    it('should reject invalid preferXcodebuild', () => {
      const invalidInput = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        preferXcodebuild: 'yes',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle successful test run with xcresult parsing', async () => {
      // Mock temp directory setup
      mockTmpdir.mockReturnValue('/tmp');
      mockJoin
        .mockReturnValueOnce('/tmp/prefix-abc123')
        .mockReturnValueOnce('/tmp/prefix-abc123/TestResults.xcresult');
      mockMkdtemp.mockResolvedValue('/tmp/prefix-abc123');

      // Mock successful test run
      const mockTestResult = {
        content: [
          {
            type: 'text',
            text: 'Test run completed',
          },
        ],
        isError: false,
      };
      mockExecuteXcodeBuildCommand.mockResolvedValue(mockTestResult);

      // Mock xcresult bundle exists
      mockStat.mockResolvedValue({} as any);

      // Mock xcresulttool parsing
      const mockExecAsync = vi.fn().mockResolvedValue({
        stdout: JSON.stringify({
          title: 'MyAppTests',
          result: 'passed',
          totalTestCount: 10,
          passedTests: 10,
          failedTests: 0,
          skippedTests: 0,
          expectedFailures: 0,
        }),
      });
      mockPromisify.mockReturnValue(mockExecAsync);

      // Mock cleanup
      mockRm.mockResolvedValue(undefined);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(mockLog).toHaveBeenCalledWith(
        'info',
        'Starting test run for scheme MyApp on platform macOS (internal)',
      );
      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyApp',
          configuration: 'Debug',
          preferXcodebuild: false,
          platform: 'macOS',
          extraArgs: ['-resultBundlePath', '/tmp/prefix-abc123/TestResults.xcresult'],
        },
        {
          platform: 'macOS',
          simulatorName: undefined,
          simulatorId: undefined,
          deviceId: undefined,
          useLatestOS: undefined,
          logPrefix: 'Test Run',
        },
        false,
        'test',
      );
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Test run completed',
          },
          {
            type: 'text',
            text: '\nTest Results Summary:\nTest Summary: MyAppTests\nOverall Result: passed\n\nTest Counts:\n  Total: 10\n  Passed: 10\n  Failed: 0\n  Skipped: 0\n  Expected Failures: 0\n',
          },
        ],
        isError: false,
      });
    });

    it('should handle test run failure', async () => {
      // Mock temp directory setup
      mockTmpdir.mockReturnValue('/tmp');
      mockJoin
        .mockReturnValueOnce('/tmp/prefix-abc123')
        .mockReturnValueOnce('/tmp/prefix-abc123/TestResults.xcresult');
      mockMkdtemp.mockResolvedValue('/tmp/prefix-abc123');

      // Mock failed test run
      const mockTestResult = {
        content: [
          {
            type: 'text',
            text: 'Test run failed',
          },
        ],
        isError: true,
      };
      mockExecuteXcodeBuildCommand.mockResolvedValue(mockTestResult);

      // Mock xcresult bundle exists
      mockStat.mockResolvedValue({} as any);

      // Mock xcresulttool parsing
      const mockExecAsync = vi.fn().mockResolvedValue({
        stdout: JSON.stringify({
          title: 'MyAppTests',
          result: 'failed',
          totalTestCount: 10,
          passedTests: 8,
          failedTests: 2,
          skippedTests: 0,
          expectedFailures: 0,
          testFailures: [
            {
              testName: 'testExample',
              targetName: 'MyAppTests',
              failureText: 'Assertion failed',
            },
          ],
        }),
      });
      mockPromisify.mockReturnValue(mockExecAsync);

      // Mock cleanup
      mockRm.mockResolvedValue(undefined);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Test run failed',
          },
          {
            type: 'text',
            text: '\nTest Results Summary:\nTest Summary: MyAppTests\nOverall Result: failed\n\nTest Counts:\n  Total: 10\n  Passed: 8\n  Failed: 2\n  Skipped: 0\n  Expected Failures: 0\n\nTest Failures:\n  1. testExample (MyAppTests)\n     Assertion failed\n',
          },
        ],
        isError: true,
      });
    });

    it('should handle xcresult parsing failure', async () => {
      // Mock temp directory setup
      mockTmpdir.mockReturnValue('/tmp');
      mockJoin
        .mockReturnValueOnce('/tmp/prefix-abc123')
        .mockReturnValueOnce('/tmp/prefix-abc123/TestResults.xcresult');
      mockMkdtemp.mockResolvedValue('/tmp/prefix-abc123');

      // Mock successful test run
      const mockTestResult = {
        content: [
          {
            type: 'text',
            text: 'Test run completed',
          },
        ],
        isError: false,
      };
      mockExecuteXcodeBuildCommand.mockResolvedValue(mockTestResult);

      // Mock xcresult bundle does not exist
      mockStat.mockRejectedValue(new Error('File not found'));

      // Mock cleanup
      mockRm.mockResolvedValue(undefined);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(mockLog).toHaveBeenCalledWith(
        'warn',
        'xcresult bundle does not exist at: /tmp/prefix-abc123/TestResults.xcresult',
      );
      expect(mockLog).toHaveBeenCalledWith(
        'warn',
        expect.stringContaining('Failed to parse xcresult bundle:'),
      );
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Test run completed',
          },
        ],
        isError: false,
      });
    });

    it('should handle exception during test execution', async () => {
      // Mock temp directory setup
      mockTmpdir.mockReturnValue('/tmp');
      mockJoin.mockReturnValueOnce('/tmp/prefix-abc123');
      mockMkdtemp.mockResolvedValue('/tmp/prefix-abc123');

      // Mock exception during test run
      const error = new Error('Test execution failed');
      mockExecuteXcodeBuildCommand.mockRejectedValue(error);

      const mockErrorResponse = {
        content: [
          {
            type: 'text',
            text: 'Error during test run: Test execution failed',
          },
        ],
        isError: true,
      };
      mockCreateTextResponse.mockReturnValue(mockErrorResponse);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(mockLog).toHaveBeenCalledWith('error', 'Error during test run: Test execution failed');
      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        'Error during test run: Test execution failed',
        true,
      );
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during test run: Test execution failed',
          },
        ],
        isError: true,
      });
    });

    it('should handle string error during test execution', async () => {
      // Mock temp directory setup
      mockTmpdir.mockReturnValue('/tmp');
      mockJoin.mockReturnValueOnce('/tmp/prefix-abc123');
      mockMkdtemp.mockResolvedValue('/tmp/prefix-abc123');

      // Mock string error during test run
      mockExecuteXcodeBuildCommand.mockRejectedValue('String error');

      const mockErrorResponse = {
        content: [
          {
            type: 'text',
            text: 'Error during test run: String error',
          },
        ],
        isError: true,
      };
      mockCreateTextResponse.mockReturnValue(mockErrorResponse);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(mockLog).toHaveBeenCalledWith('error', 'Error during test run: String error');
      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        'Error during test run: String error',
        true,
      );
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

    it('should use custom configuration and prefer xcodebuild', async () => {
      // Mock temp directory setup
      mockTmpdir.mockReturnValue('/tmp');
      mockJoin
        .mockReturnValueOnce('/tmp/prefix-abc123')
        .mockReturnValueOnce('/tmp/prefix-abc123/TestResults.xcresult');
      mockMkdtemp.mockResolvedValue('/tmp/prefix-abc123');

      // Mock successful test run
      const mockTestResult = {
        content: [
          {
            type: 'text',
            text: 'Test run completed',
          },
        ],
        isError: false,
      };
      mockExecuteXcodeBuildCommand.mockResolvedValue(mockTestResult);

      const args = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyApp',
        configuration: 'Release',
        preferXcodebuild: true,
        extraArgs: ['--test-target', 'MyAppTests'],
      };

      await tool.handler(args);

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyApp',
          configuration: 'Release',
          preferXcodebuild: true,
          platform: 'macOS',
          extraArgs: [
            '--test-target',
            'MyAppTests',
            '-resultBundlePath',
            '/tmp/prefix-abc123/TestResults.xcresult',
          ],
        },
        {
          platform: 'macOS',
          simulatorName: undefined,
          simulatorId: undefined,
          deviceId: undefined,
          useLatestOS: undefined,
          logPrefix: 'Test Run',
        },
        true,
        'test',
      );
    });
  });
});
