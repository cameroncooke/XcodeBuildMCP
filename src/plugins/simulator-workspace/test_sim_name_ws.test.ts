import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import testSimNameWs from './test_sim_name_ws.ts';

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('util', () => ({
  promisify: vi.fn(),
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

vi.mock('../../utils/index.js', () => ({
  executeXcodeBuildCommand: vi.fn(),
  createTextResponse: vi.fn(),
  createErrorResponse: vi.fn(),
  log: vi.fn(),
}));

describe('test_sim_name_ws plugin', () => {
  let mockExecuteXcodeBuildCommand: MockedFunction<any>;
  let mockCreateTextResponse: MockedFunction<any>;
  let mockMkdtemp: MockedFunction<any>;
  let mockRm: MockedFunction<any>;
  let mockStat: MockedFunction<any>;
  let mockTmpdir: MockedFunction<any>;
  let mockJoin: MockedFunction<any>;
  let mockPromisify: MockedFunction<any>;
  let mockExec: MockedFunction<any>;

  beforeEach(async () => {
    const utilsModule = await import('../../src/utils/index.ts');
    const utilModule = await import('util');
    const childProcessModule = await import('child_process');
    const fsModule = await import('fs/promises');
    const osModule = await import('os');
    const pathModule = await import('path');

    mockExecuteXcodeBuildCommand = utilsModule.executeXcodeBuildCommand as MockedFunction<any>;
    mockCreateTextResponse = utilsModule.createTextResponse as MockedFunction<any>;
    mockMkdtemp = fsModule.mkdtemp as MockedFunction<any>;
    mockRm = fsModule.rm as MockedFunction<any>;
    mockStat = fsModule.stat as MockedFunction<any>;
    mockTmpdir = osModule.tmpdir as MockedFunction<any>;
    mockJoin = pathModule.join as MockedFunction<any>;
    mockPromisify = utilModule.promisify as MockedFunction<any>;
    mockExec = childProcessModule.exec as MockedFunction<any>;

    mockCreateTextResponse.mockImplementation((text: string, isError: boolean = false) => ({
      content: [{ type: 'text', text }],
      isError,
    }));

    // Setup default mock values
    mockTmpdir.mockReturnValue('/tmp');
    mockJoin.mockReturnValue('/tmp/xcodebuild-test-abc123/TestResults.xcresult');
    mockMkdtemp.mockResolvedValue('/tmp/xcodebuild-test-abc123');
    mockRm.mockResolvedValue(undefined);
    mockStat.mockResolvedValue({ isFile: () => true });

    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(testSimNameWs.name).toBe('test_sim_name_ws');
    });

    it('should have correct description field', () => {
      expect(testSimNameWs.description).toBe(
        'Runs tests for a workspace on a simulator by name using xcodebuild test and parses xcresult output.',
      );
    });

    it('should have handler function', () => {
      expect(typeof testSimNameWs.handler).toBe('function');
    });

    it('should have correct schema validation', () => {
      const schema = z.object(testSimNameWs.schema);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          workspacePath: '/path/to/workspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
          useLatestOS: true,
          preferXcodebuild: false,
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          workspacePath: 123,
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle successful test execution', async () => {
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Tests completed successfully',
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

      const result = await testSimNameWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Tests completed successfully',
          },
          {
            type: 'text',
            text: '\nTest Results Summary:\nTest Summary: Test Run\nOverall Result: SUCCESS\n\nTest Counts:\n  Total: 5\n  Passed: 5\n  Failed: 0\n  Skipped: 0\n  Expected Failures: 0\n',
          },
        ],
        isError: false,
      });
    });

    it('should handle test failure', async () => {
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Test execution failed',
          },
        ],
        isError: true,
      });

      // Mock xcresulttool execution for failed tests
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

      const result = await testSimNameWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Test execution failed',
          },
          {
            type: 'text',
            text: '\nTest Results Summary:\nTest Summary: Test Run\nOverall Result: FAILURE\n\nTest Counts:\n  Total: 5\n  Passed: 3\n  Failed: 2\n  Skipped: 0\n  Expected Failures: 0\n\nTest Failures:\n  1. testExample (AppTests)\n     Assertion failed\n',
          },
        ],
        isError: true,
      });
    });

    it('should set default values correctly', async () => {
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Success' }],
        isError: false,
      });

      // Mock xcresulttool execution to prevent path errors
      const mockExecAsync = vi.fn().mockResolvedValue({
        stdout: JSON.stringify({
          title: 'Test Run',
          result: 'SUCCESS',
          totalTestCount: 1,
          passedTests: 1,
          failedTests: 0,
          skippedTests: 0,
          expectedFailures: 0,
        }),
      });
      mockPromisify.mockReturnValue(mockExecAsync);

      await testSimNameWs.handler({
        workspacePath: '/path/to/workspace',
        scheme: 'MyScheme',
        simulatorName: 'iPhone 16',
      });

      // The handler should call with default values
      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          configuration: 'Debug',
          useLatestOS: false,
          preferXcodebuild: false,
          platform: 'iOS Simulator',
        }),
        expect.any(Object),
        false,
        'test',
      );
    });
  });
});
