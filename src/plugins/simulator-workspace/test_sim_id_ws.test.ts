import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';

// Import the plugin
import testSimIdWs from './test_sim_id_ws.ts';

// Mock external dependencies
vi.mock('../../utils/index.js', () => ({
  log: vi.fn(),
  executeXcodeBuildCommand: vi.fn(),
  createTextResponse: vi.fn(),
}));

// Mock Node.js modules
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

describe('test_sim_id_ws tool', () => {
  let mockExecuteXcodeBuildCommand: MockedFunction<any>;
  let mockCreateTextResponse: MockedFunction<any>;
  let mockLog: MockedFunction<any>;
  let mockMkdtemp: MockedFunction<any>;
  let mockRm: MockedFunction<any>;
  let mockStat: MockedFunction<any>;
  let mockTmpdir: MockedFunction<any>;
  let mockJoin: MockedFunction<any>;
  let mockPromisify: MockedFunction<any>;
  let mockExec: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../utils/index.js');
    const utilModule = await import('util');
    const childProcessModule = await import('child_process');
    const fsModule = await import('fs/promises');
    const osModule = await import('os');
    const pathModule = await import('path');

    mockExecuteXcodeBuildCommand = utils.executeXcodeBuildCommand as MockedFunction<any>;
    mockCreateTextResponse = utils.createTextResponse as MockedFunction<any>;
    mockLog = utils.log as MockedFunction<any>;
    mockMkdtemp = fsModule.mkdtemp as MockedFunction<any>;
    mockRm = fsModule.rm as MockedFunction<any>;
    mockStat = fsModule.stat as MockedFunction<any>;
    mockTmpdir = osModule.tmpdir as MockedFunction<any>;
    mockJoin = pathModule.join as MockedFunction<any>;
    mockPromisify = utilModule.promisify as MockedFunction<any>;
    mockExec = childProcessModule.exec as MockedFunction<any>;

    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(testSimIdWs.name).toBe('test_sim_id_ws');
    });

    it('should have correct description', () => {
      expect(testSimIdWs.description).toBe(
        'Runs tests for a workspace on a simulator by UUID using xcodebuild test and parses xcresult output.',
      );
    });

    it('should have handler function', () => {
      expect(typeof testSimIdWs.handler).toBe('function');
    });

    it('should have correct schema with all required fields', () => {
      const schema = z.object(testSimIdWs.schema);

      // Valid inputs
      expect(
        schema.safeParse({
          workspacePath: '/path/to/App.xcworkspace',
          scheme: 'AppScheme',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(true);
      expect(
        schema.safeParse({
          workspacePath: '/path/to/App.xcworkspace',
          scheme: 'AppScheme',
          simulatorId: 'test-uuid-123',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived',
          extraArgs: ['--verbose'],
          useLatestOS: true,
          preferXcodebuild: true,
        }).success,
      ).toBe(true);

      // Invalid inputs
      expect(schema.safeParse({ scheme: 'AppScheme', simulatorId: 'test-uuid-123' }).success).toBe(
        false,
      );
      expect(
        schema.safeParse({
          workspacePath: '/path/to/App.xcworkspace',
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(false);
      expect(
        schema.safeParse({ workspacePath: '/path/to/App.xcworkspace', scheme: 'AppScheme' })
          .success,
      ).toBe(false);
      expect(
        schema.safeParse({ workspacePath: 123, scheme: 'AppScheme', simulatorId: 'test-uuid-123' })
          .success,
      ).toBe(false);
      expect(
        schema.safeParse({
          workspacePath: '/path/to/App.xcworkspace',
          scheme: 123,
          simulatorId: 'test-uuid-123',
        }).success,
      ).toBe(false);
      expect(
        schema.safeParse({
          workspacePath: '/path/to/App.xcworkspace',
          scheme: 'AppScheme',
          simulatorId: 123,
        }).success,
      ).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle successful test run with xcresult parsing', async () => {
      // Mock file system operations
      mockTmpdir.mockReturnValue('/tmp');
      mockJoin.mockReturnValue('/tmp/xcodebuild-test-abc123/TestResults.xcresult');
      mockMkdtemp.mockResolvedValue('/tmp/xcodebuild-test-abc123');
      mockRm.mockResolvedValue(undefined);
      mockStat.mockResolvedValue({ isFile: () => true });

      // Mock successful xcodebuild execution
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Test run completed successfully',
          },
        ],
        isError: false,
      });

      // Mock xcresulttool execution
      const mockExecAsync = vi.fn().mockResolvedValue({
        stdout: JSON.stringify({
          title: 'Test Run',
          result: 'SUCCESS',
          totalTestCount: 5,
          passedTests: 5,
          failedTests: 0,
          skippedTests: 0,
          expectedFailures: 0,
        }),
      });
      mockPromisify.mockReturnValue(mockExecAsync);

      const result = await testSimIdWs.handler({
        workspacePath: '/path/to/App.xcworkspace',
        scheme: 'AppScheme',
        simulatorId: 'test-uuid-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Test run completed successfully',
          },
          {
            type: 'text',
            text: '\nTest Results Summary:\nTest Summary: Test Run\nOverall Result: SUCCESS\n\nTest Counts:\n  Total: 5\n  Passed: 5\n  Failed: 0\n  Skipped: 0\n  Expected Failures: 0\n',
          },
        ],
        isError: false,
      });
    });

    it('should handle test run failure with xcresult parsing', async () => {
      // Mock file system operations
      mockTmpdir.mockReturnValue('/tmp');
      mockJoin.mockReturnValue('/tmp/xcodebuild-test-abc123/TestResults.xcresult');
      mockMkdtemp.mockResolvedValue('/tmp/xcodebuild-test-abc123');
      mockRm.mockResolvedValue(undefined);
      mockStat.mockResolvedValue({ isFile: () => true });

      // Mock failed xcodebuild execution
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Test run failed with errors',
          },
        ],
        isError: true,
      });

      // Mock xcresulttool execution
      const mockExecAsync = vi.fn().mockResolvedValue({
        stdout: JSON.stringify({
          title: 'Test Run',
          result: 'FAILURE',
          totalTestCount: 5,
          passedTests: 3,
          failedTests: 2,
          skippedTests: 0,
          expectedFailures: 0,
          testFailures: [
            {
              testName: 'testExample',
              targetName: 'AppTests',
              failureText: 'Assertion failed',
            },
          ],
        }),
      });
      mockPromisify.mockReturnValue(mockExecAsync);

      const result = await testSimIdWs.handler({
        workspacePath: '/path/to/App.xcworkspace',
        scheme: 'AppScheme',
        simulatorId: 'test-uuid-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Test run failed with errors',
          },
          {
            type: 'text',
            text: '\nTest Results Summary:\nTest Summary: Test Run\nOverall Result: FAILURE\n\nTest Counts:\n  Total: 5\n  Passed: 3\n  Failed: 2\n  Skipped: 0\n  Expected Failures: 0\n\nTest Failures:\n  1. testExample (AppTests)\n     Assertion failed\n',
          },
        ],
        isError: true,
      });
    });

    it('should handle test run without xcresult parsing when bundle missing', async () => {
      // Mock file system operations
      mockTmpdir.mockReturnValue('/tmp');
      mockJoin.mockReturnValue('/tmp/xcodebuild-test-abc123/TestResults.xcresult');
      mockMkdtemp.mockResolvedValue('/tmp/xcodebuild-test-abc123');
      mockRm.mockResolvedValue(undefined);
      mockStat.mockRejectedValue(new Error('File not found'));

      // Mock successful xcodebuild execution
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Test run completed successfully',
          },
        ],
        isError: false,
      });

      const result = await testSimIdWs.handler({
        workspacePath: '/path/to/App.xcworkspace',
        scheme: 'AppScheme',
        simulatorId: 'test-uuid-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Test run completed successfully',
          },
        ],
        isError: false,
      });
    });

    it('should handle exception during test execution', async () => {
      // Mock file system operations
      mockTmpdir.mockReturnValue('/tmp');
      mockJoin.mockReturnValue('/tmp/xcodebuild-test-abc123/TestResults.xcresult');
      mockMkdtemp.mockResolvedValue('/tmp/xcodebuild-test-abc123');

      // Mock executeXcodeBuildCommand to return error response
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Error during iOS Simulator Test build: Build failed',
          },
        ],
        isError: true,
      });

      const result = await testSimIdWs.handler({
        workspacePath: '/path/to/App.xcworkspace',
        scheme: 'AppScheme',
        simulatorId: 'test-uuid-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during iOS Simulator Test build: Build failed',
          },
        ],
        isError: true,
      });
    });

    it('should handle exception with string error', async () => {
      // Mock file system operations
      mockTmpdir.mockReturnValue('/tmp');
      mockJoin.mockReturnValue('/tmp/xcodebuild-test-abc123/TestResults.xcresult');
      mockMkdtemp.mockResolvedValue('/tmp/xcodebuild-test-abc123');

      // Mock executeXcodeBuildCommand to return string error
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Error during iOS Simulator Test build: String error',
          },
        ],
        isError: true,
      });

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Error during iOS Simulator Test build: String error',
          },
        ],
        isError: true,
      });

      const result = await testSimIdWs.handler({
        workspacePath: '/path/to/App.xcworkspace',
        scheme: 'AppScheme',
        simulatorId: 'test-uuid-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during iOS Simulator Test build: String error',
          },
        ],
        isError: true,
      });
    });
  });
});
