/**
 * Test Common Utilities Tests - Comprehensive test coverage for test_common.ts
 *
 * This test file provides complete coverage for the test_common.ts utilities:
 * - parseXcresultBundle: Parses xcresult bundles using xcrun xcresulttool
 * - handleTestLogic: Shared logic for test-related tools across different platforms
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive functionality testing.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { exec } from 'child_process';
import { mkdtemp, rm, stat } from 'fs/promises';
import { parseXcresultBundle, handleTestLogic } from './test_common.js';
import { XcodePlatform } from '../utils/xcode.js';

// Mock Node.js APIs to prevent real command execution
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  mkdtemp: vi.fn(),
  rm: vi.fn(),
  stat: vi.fn(),
}));

vi.mock('util', () => ({
  promisify: vi.fn(() => vi.fn()),
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

describe('test_common utilities tests', () => {
  let mockExecAsync: MockedFunction<any>;
  let mockMkdtemp: MockedFunction<any>;
  let mockRm: MockedFunction<any>;
  let mockStat: MockedFunction<any>;
  let mockExecuteXcodeBuildCommand: MockedFunction<any>;
  let mockLog: MockedFunction<any>;
  let mockCreateTextResponse: MockedFunction<any>;
  let mockPromisify: MockedFunction<any>;

  beforeEach(async () => {
    // Import mocked modules
    const childProcess = await import('child_process');
    const fsPromises = await import('fs/promises');
    const buildUtils = await import('../utils/build-utils.js');
    const logger = await import('../utils/logger.js');
    const validation = await import('../utils/validation.js');
    const util = await import('util');

    // Create mock for the promisified exec function
    mockExecAsync = vi.fn();
    mockPromisify = util.promisify as MockedFunction<any>;
    mockPromisify.mockReturnValue(mockExecAsync);

    mockMkdtemp = fsPromises.mkdtemp as MockedFunction<any>;
    mockRm = fsPromises.rm as MockedFunction<any>;
    mockStat = fsPromises.stat as MockedFunction<any>;
    mockExecuteXcodeBuildCommand = buildUtils.executeXcodeBuildCommand as MockedFunction<any>;
    mockLog = logger.log as MockedFunction<any>;
    mockCreateTextResponse = validation.createTextResponse as MockedFunction<any>;

    vi.clearAllMocks();
  });

  describe('parseXcresultBundle function', () => {
    it('should parse xcresult bundle successfully', async () => {
      const mockTestSummary = {
        title: 'MyAppTests',
        result: 'SUCCESS',
        totalTestCount: 10,
        passedTests: 8,
        failedTests: 2,
        skippedTests: 0,
        expectedFailures: 0,
        environmentDescription: 'iOS 17.0 Simulator',
        devicesAndConfigurations: [
          {
            device: {
              deviceName: 'iPhone 15',
              platform: 'iOS Simulator',
              osVersion: '17.0',
            },
          },
        ],
        testFailures: [
          {
            testName: 'testExample',
            targetName: 'MyAppTests',
            failureText: 'Assertion failed',
          },
        ],
        topInsights: [
          {
            impact: 'HIGH',
            text: 'Test failure in core functionality',
          },
        ],
      };

      // Mock successful exec call
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(mockTestSummary),
      });

      const result = await parseXcresultBundle('/path/to/result.xcresult');

      expect(result).toContain('Test Summary: MyAppTests');
      expect(result).toContain('Overall Result: SUCCESS');
      expect(result).toContain('Total: 10');
      expect(result).toContain('Passed: 8');
      expect(result).toContain('Failed: 2');
      expect(result).toContain('Skipped: 0');
      expect(result).toContain('Expected Failures: 0');
      expect(result).toContain('Environment: iOS 17.0 Simulator');
      expect(result).toContain('Device: iPhone 15 (iOS Simulator 17.0)');
      expect(result).toContain('Test Failures:');
      expect(result).toContain('1. testExample (MyAppTests)');
      expect(result).toContain('Assertion failed');
      expect(result).toContain('Insights:');
      expect(result).toContain('1. [HIGH] Test failure in core functionality');
    });

    it('should handle minimal test summary', async () => {
      const mockTestSummary = {
        title: 'BasicTests',
        result: 'SUCCESS',
      };

      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(mockTestSummary),
      });

      const result = await parseXcresultBundle('/path/to/result.xcresult');

      expect(result).toContain('Test Summary: BasicTests');
      expect(result).toContain('Overall Result: SUCCESS');
      expect(result).toContain('Total: 0');
      expect(result).toContain('Passed: 0');
      expect(result).toContain('Failed: 0');
      expect(result).toContain('Skipped: 0');
      expect(result).toContain('Expected Failures: 0');
    });

    it('should handle empty test summary', async () => {
      const mockTestSummary = {};

      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(mockTestSummary),
      });

      const result = await parseXcresultBundle('/path/to/result.xcresult');

      expect(result).toContain('Test Summary: Unknown');
      expect(result).toContain('Overall Result: Unknown');
      expect(result).toContain('Total: 0');
    });

    it('should handle xcresulttool command failure', async () => {
      mockExecAsync.mockRejectedValue(new Error('xcresulttool command failed'));

      await expect(parseXcresultBundle('/path/to/result.xcresult')).rejects.toThrow(
        'xcresulttool command failed',
      );
      expect(mockLog).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('Error parsing xcresult bundle'),
      );
    });

    it('should handle invalid JSON response', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'invalid json',
      });

      await expect(parseXcresultBundle('/path/to/result.xcresult')).rejects.toThrow();
      expect(mockLog).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('Error parsing xcresult bundle'),
      );
    });

    it('should handle test summary with multiple failures', async () => {
      const mockTestSummary = {
        title: 'MultiFailureTests',
        result: 'FAILURE',
        totalTestCount: 5,
        passedTests: 2,
        failedTests: 3,
        testFailures: [
          {
            testName: 'testOne',
            targetName: 'TargetA',
            failureText: 'First failure',
          },
          {
            testName: 'testTwo',
            targetName: 'TargetB',
            failureText: 'Second failure',
          },
          {
            testName: 'testThree',
            targetName: 'TargetA',
            failureText: 'Third failure',
          },
        ],
      };

      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(mockTestSummary),
      });

      const result = await parseXcresultBundle('/path/to/result.xcresult');

      expect(result).toContain('Test Failures:');
      expect(result).toContain('1. testOne (TargetA)');
      expect(result).toContain('First failure');
      expect(result).toContain('2. testTwo (TargetB)');
      expect(result).toContain('Second failure');
      expect(result).toContain('3. testThree (TargetA)');
      expect(result).toContain('Third failure');
    });

    it('should handle test summary with multiple insights', async () => {
      const mockTestSummary = {
        title: 'InsightTests',
        result: 'SUCCESS',
        topInsights: [
          {
            impact: 'HIGH',
            text: 'Critical performance issue',
          },
          {
            impact: 'MEDIUM',
            text: 'Memory usage warning',
          },
          {
            impact: 'LOW',
            text: 'Minor code style issue',
          },
        ],
      };

      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(mockTestSummary),
      });

      const result = await parseXcresultBundle('/path/to/result.xcresult');

      expect(result).toContain('Insights:');
      expect(result).toContain('1. [HIGH] Critical performance issue');
      expect(result).toContain('2. [MEDIUM] Memory usage warning');
      expect(result).toContain('3. [LOW] Minor code style issue');
    });
  });

  describe('handleTestLogic function', () => {
    beforeEach(() => {
      // Setup default mocks for handleTestLogic
      mockMkdtemp.mockResolvedValue('/tmp/xcodebuild-test-abc123');
      mockRm.mockResolvedValue(undefined);
      mockStat.mockResolvedValue({ isFile: () => true });
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Build succeeded' }],
        isError: false,
      });
    });

    it('should handle successful test run with xcresult parsing', async () => {
      const mockTestSummary = {
        title: 'SuccessfulTests',
        result: 'SUCCESS',
        totalTestCount: 5,
        passedTests: 5,
        failedTests: 0,
      };

      // Mock parseXcresultBundle by mocking the exec call it makes
      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(mockTestSummary),
      });

      const params = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Debug',
        simulatorName: 'iPhone 15',
        platform: XcodePlatform.IOS_SIMULATOR,
      };

      const result = await handleTestLogic(params);

      expect(mockMkdtemp).toHaveBeenCalledWith(expect.stringContaining('xcodebuild-test-'));
      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Debug',
          extraArgs: expect.arrayContaining(['-resultBundlePath']),
        }),
        expect.objectContaining({
          platform: XcodePlatform.IOS_SIMULATOR,
          simulatorName: 'iPhone 15',
          logPrefix: 'Test Run',
        }),
        undefined,
        'test',
      );
      expect(mockStat).toHaveBeenCalledWith('/tmp/xcodebuild-test-abc123/TestResults.xcresult');
      expect(mockRm).toHaveBeenCalledWith('/tmp/xcodebuild-test-abc123', {
        recursive: true,
        force: true,
      });
      expect(result.content).toEqual([
        { type: 'text', text: 'Build succeeded' },
        {
          type: 'text',
          text: '\nTest Results Summary:\nTest Summary: SuccessfulTests\nOverall Result: SUCCESS\n\nTest Counts:\n  Total: 5\n  Passed: 5\n  Failed: 0\n  Skipped: 0\n  Expected Failures: 0\n',
        },
      ]);
      expect(result.isError).toBe(false);
    });

    it('should handle test run with project path instead of workspace', async () => {
      const mockTestSummary = {
        title: 'ProjectTests',
        result: 'SUCCESS',
      };

      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(mockTestSummary),
      });

      const params = {
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
        configuration: 'Release',
        deviceId: 'device-uuid-123',
        platform: XcodePlatform.IOS_DEVICE,
      };

      const result = await handleTestLogic(params);

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          configuration: 'Release',
        }),
        expect.objectContaining({
          platform: XcodePlatform.IOS_DEVICE,
          deviceId: 'device-uuid-123',
        }),
        undefined,
        'test',
      );
    });

    it('should handle test run with extra arguments', async () => {
      const mockTestSummary = {
        title: 'ExtraArgsTests',
        result: 'SUCCESS',
      };

      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(mockTestSummary),
      });

      const params = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Debug',
        extraArgs: ['-parallel-testing-enabled', 'YES'],
        preferXcodebuild: true,
        platform: XcodePlatform.MACOS,
      };

      const result = await handleTestLogic(params);

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          extraArgs: expect.arrayContaining([
            '-parallel-testing-enabled',
            'YES',
            '-resultBundlePath',
          ]),
        }),
        expect.objectContaining({
          platform: XcodePlatform.MACOS,
        }),
        true,
        'test',
      );
    });

    it('should handle xcresult bundle parsing failure gracefully', async () => {
      // Mock executeXcodeBuildCommand to succeed
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Tests completed' }],
        isError: false,
      });

      // Mock parseXcresultBundle to fail
      mockExecAsync.mockRejectedValue(new Error('xcresulttool failed'));

      const params = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Debug',
        platform: XcodePlatform.IOS_SIMULATOR,
      };

      const result = await handleTestLogic(params);

      expect(mockLog).toHaveBeenCalledWith(
        'warn',
        expect.stringContaining('Failed to parse xcresult bundle'),
      );
      expect(result.content).toEqual([{ type: 'text', text: 'Tests completed' }]);
      expect(result.isError).toBe(false);
    });

    it('should handle missing xcresult bundle file', async () => {
      // Mock executeXcodeBuildCommand to succeed
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Tests completed' }],
        isError: false,
      });

      // Mock stat to reject (file doesn't exist)
      mockStat.mockRejectedValue(new Error('File not found'));

      const params = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Debug',
        platform: XcodePlatform.IOS_SIMULATOR,
      };

      const result = await handleTestLogic(params);

      expect(mockLog).toHaveBeenCalledWith(
        'warn',
        expect.stringContaining('xcresult bundle does not exist'),
      );
      expect(result.content).toEqual([{ type: 'text', text: 'Tests completed' }]);
    });

    it('should handle executeXcodeBuildCommand failure', async () => {
      mockExecuteXcodeBuildCommand.mockRejectedValue(new Error('Build failed'));
      mockCreateTextResponse.mockReturnValue({
        content: [{ type: 'text', text: 'Error during test run: Build failed' }],
        isError: true,
      });

      const params = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Debug',
        platform: XcodePlatform.IOS_SIMULATOR,
      };

      const result = await handleTestLogic(params);

      expect(mockLog).toHaveBeenCalledWith('error', 'Error during test run: Build failed');
      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        'Error during test run: Build failed',
        true,
      );
      expect(result.isError).toBe(true);
    });

    it('should preserve test failure isError flag', async () => {
      const mockTestSummary = {
        title: 'FailedTests',
        result: 'FAILURE',
        totalTestCount: 3,
        passedTests: 1,
        failedTests: 2,
      };

      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(mockTestSummary),
      });

      // Mock executeXcodeBuildCommand to return error (test failures)
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Tests failed' }],
        isError: true,
      });

      const params = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Debug',
        platform: XcodePlatform.IOS_SIMULATOR,
      };

      const result = await handleTestLogic(params);

      expect(result.content).toEqual([
        { type: 'text', text: 'Tests failed' },
        {
          type: 'text',
          text: '\nTest Results Summary:\nTest Summary: FailedTests\nOverall Result: FAILURE\n\nTest Counts:\n  Total: 3\n  Passed: 1\n  Failed: 2\n  Skipped: 0\n  Expected Failures: 0\n',
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should clean up temporary directory even on parsing failure', async () => {
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Tests completed' }],
        isError: false,
      });

      // Mock parseXcresultBundle to fail
      mockExecAsync.mockRejectedValue(new Error('Parsing failed'));

      const params = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Debug',
        platform: XcodePlatform.IOS_SIMULATOR,
      };

      await handleTestLogic(params);

      expect(mockRm).toHaveBeenCalledWith('/tmp/xcodebuild-test-abc123', {
        recursive: true,
        force: true,
      });
    });

    it('should handle cleanup failure gracefully', async () => {
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Tests completed' }],
        isError: false,
      });

      mockExecAsync.mockRejectedValue(new Error('Parsing failed'));

      // Mock rm to fail
      mockRm.mockRejectedValue(new Error('Cleanup failed'));

      const params = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Debug',
        platform: XcodePlatform.IOS_SIMULATOR,
      };

      const result = await handleTestLogic(params);

      expect(mockLog).toHaveBeenCalledWith(
        'warn',
        'Failed to clean up temporary directory: Error: Cleanup failed',
      );
      expect(result.content).toEqual([{ type: 'text', text: 'Tests completed' }]);
    });

    it('should handle all optional parameters', async () => {
      const mockTestSummary = {
        title: 'CompleteTests',
        result: 'SUCCESS',
      };

      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(mockTestSummary),
      });

      const params = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Debug',
        simulatorName: 'iPhone 15',
        simulatorId: 'sim-uuid-123',
        deviceId: 'device-uuid-123',
        useLatestOS: true,
        derivedDataPath: '/custom/derived/data',
        extraArgs: ['-test-timeouts-enabled', 'YES'],
        preferXcodebuild: false,
        platform: XcodePlatform.IOS_SIMULATOR,
      };

      const result = await handleTestLogic(params);

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Debug',
          derivedDataPath: '/custom/derived/data',
          extraArgs: expect.arrayContaining(['-test-timeouts-enabled', 'YES', '-resultBundlePath']),
        }),
        expect.objectContaining({
          platform: XcodePlatform.IOS_SIMULATOR,
          simulatorName: 'iPhone 15',
          simulatorId: 'sim-uuid-123',
          deviceId: 'device-uuid-123',
          useLatestOS: true,
          logPrefix: 'Test Run',
        }),
        false,
        'test',
      );
      expect(result.isError).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete iOS simulator test workflow', async () => {
      const mockTestSummary = {
        title: 'MyApp iOS Tests',
        result: 'SUCCESS',
        totalTestCount: 25,
        passedTests: 23,
        failedTests: 2,
        skippedTests: 0,
        expectedFailures: 0,
        environmentDescription: 'iOS 17.0 Simulator',
        devicesAndConfigurations: [
          {
            device: {
              deviceName: 'iPhone 15 Pro',
              platform: 'iOS Simulator',
              osVersion: '17.0',
            },
          },
        ],
        testFailures: [
          {
            testName: 'testNetworkTimeout',
            targetName: 'MyAppTests',
            failureText: 'Request timed out after 30 seconds',
          },
        ],
      };

      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(mockTestSummary),
      });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          { type: 'text', text: '✅ iOS Simulator Test succeeded for scheme MyApp.' },
          { type: 'text', text: '📱 Target: iPhone 15 Pro' },
          { type: 'text', text: 'Test output:\nTEST SUCCEEDED' },
        ],
        isError: false,
      });

      const params = {
        workspacePath: '/Users/dev/MyApp/MyApp.xcworkspace',
        scheme: 'MyApp',
        configuration: 'Debug',
        simulatorName: 'iPhone 15 Pro',
        useLatestOS: true,
        platform: XcodePlatform.IOS_SIMULATOR,
      };

      const result = await handleTestLogic(params);

      expect(result.content).toEqual([
        { type: 'text', text: '✅ iOS Simulator Test succeeded for scheme MyApp.' },
        { type: 'text', text: '📱 Target: iPhone 15 Pro' },
        { type: 'text', text: 'Test output:\nTEST SUCCEEDED' },
        {
          type: 'text',
          text: '\nTest Results Summary:\nTest Summary: MyApp iOS Tests\nOverall Result: SUCCESS\n\nTest Counts:\n  Total: 25\n  Passed: 23\n  Failed: 2\n  Skipped: 0\n  Expected Failures: 0\n\nEnvironment: iOS 17.0 Simulator\n\nDevice: iPhone 15 Pro (iOS Simulator 17.0)\n\nTest Failures:\n  1. testNetworkTimeout (MyAppTests)\n     Request timed out after 30 seconds\n',
        },
      ]);
      expect(result.isError).toBe(false);
    });

    it('should handle complete macOS test workflow', async () => {
      const mockTestSummary = {
        title: 'MyMacApp Tests',
        result: 'SUCCESS',
        totalTestCount: 15,
        passedTests: 15,
        failedTests: 0,
      };

      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(mockTestSummary),
      });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          { type: 'text', text: '✅ macOS Test succeeded for scheme MyMacApp.' },
          { type: 'text', text: '🖥️ Target: macOS' },
          { type: 'text', text: 'Test output:\nALL TESTS PASSED' },
        ],
        isError: false,
      });

      const params = {
        projectPath: '/Users/dev/MyMacApp/MyMacApp.xcodeproj',
        scheme: 'MyMacApp',
        configuration: 'Release',
        derivedDataPath: '/tmp/DerivedData',
        platform: XcodePlatform.MACOS,
      };

      const result = await handleTestLogic(params);

      expect(result.content).toEqual([
        { type: 'text', text: '✅ macOS Test succeeded for scheme MyMacApp.' },
        { type: 'text', text: '🖥️ Target: macOS' },
        { type: 'text', text: 'Test output:\nALL TESTS PASSED' },
        {
          type: 'text',
          text: '\nTest Results Summary:\nTest Summary: MyMacApp Tests\nOverall Result: SUCCESS\n\nTest Counts:\n  Total: 15\n  Passed: 15\n  Failed: 0\n  Skipped: 0\n  Expected Failures: 0\n',
        },
      ]);
      expect(result.isError).toBe(false);
    });

    it('should handle test failure with detailed error information', async () => {
      const mockTestSummary = {
        title: 'FailingApp Tests',
        result: 'FAILURE',
        totalTestCount: 10,
        passedTests: 6,
        failedTests: 4,
        skippedTests: 0,
        expectedFailures: 0,
        testFailures: [
          {
            testName: 'testUserAuthentication',
            targetName: 'AuthTests',
            failureText: 'Authentication failed: Invalid credentials',
          },
          {
            testName: 'testDataPersistence',
            targetName: 'CoreDataTests',
            failureText: 'Core Data save operation failed',
          },
        ],
        topInsights: [
          {
            impact: 'HIGH',
            text: 'Authentication system needs immediate attention',
          },
        ],
      };

      mockExecAsync.mockResolvedValue({
        stdout: JSON.stringify(mockTestSummary),
      });

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          { type: 'text', text: '❌ iOS Device Test failed for scheme FailingApp.' },
          { type: 'text', text: '📱 Target: iPhone 14' },
          { type: 'text', text: 'Test output:\nTEST FAILED' },
        ],
        isError: true,
      });

      const params = {
        workspacePath: '/Users/dev/FailingApp/FailingApp.xcworkspace',
        scheme: 'FailingApp',
        configuration: 'Debug',
        deviceId: 'iphone-14-uuid',
        platform: XcodePlatform.IOS_DEVICE,
      };

      const result = await handleTestLogic(params);

      expect(result.content).toEqual([
        { type: 'text', text: '❌ iOS Device Test failed for scheme FailingApp.' },
        { type: 'text', text: '📱 Target: iPhone 14' },
        { type: 'text', text: 'Test output:\nTEST FAILED' },
        {
          type: 'text',
          text: '\nTest Results Summary:\nTest Summary: FailingApp Tests\nOverall Result: FAILURE\n\nTest Counts:\n  Total: 10\n  Passed: 6\n  Failed: 4\n  Skipped: 0\n  Expected Failures: 0\n\nTest Failures:\n  1. testUserAuthentication (AuthTests)\n     Authentication failed: Invalid credentials\n  2. testDataPersistence (CoreDataTests)\n     Core Data save operation failed\n\nInsights:\n  1. [HIGH] Authentication system needs immediate attention',
        },
      ]);
      expect(result.isError).toBe(true);
    });
  });
});
