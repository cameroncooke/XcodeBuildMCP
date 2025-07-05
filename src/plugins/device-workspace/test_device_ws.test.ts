/**
 * Tests for test_device_ws plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import testDeviceWs from './test_device_ws.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  XcodePlatform: {
    iOS: 'iOS',
    watchOS: 'watchOS',
    tvOS: 'tvOS',
    visionOS: 'visionOS',
  },
  executeXcodeBuildCommand: vi.fn(),
  createTextResponse: vi.fn(),
}));

// Mock fs/promises with dynamic import support
vi.mock('fs/promises', async () => {
  const originalModule = await vi.importActual('fs/promises');
  return {
    ...originalModule,
    mkdtemp: vi.fn(),
    rm: vi.fn(),
    stat: vi.fn(),
  };
});

vi.mock('util', () => ({
  promisify: vi.fn(),
}));

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('os', () => ({
  tmpdir: vi.fn().mockReturnValue('/tmp'),
}));

vi.mock('path', () => ({
  join: vi.fn(),
}));

describe('test_device_ws plugin', () => {
  let mockLog: MockedFunction<any>;
  let mockExecuteXcodeBuildCommand: MockedFunction<any>;
  let mockCreateTextResponse: MockedFunction<any>;
  let mockMkdtemp: MockedFunction<any>;
  let mockRm: MockedFunction<any>;
  let mockStat: MockedFunction<any>;
  let mockPromisify: MockedFunction<any>;
  let mockExec: MockedFunction<any>;
  let mockTmpdir: MockedFunction<any>;
  let mockJoin: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');
    const fsPromises = await import('fs/promises');
    const util = await import('util');
    const childProcess = await import('child_process');
    const os = await import('os');
    const path = await import('path');

    mockLog = utils.log as MockedFunction<any>;
    mockExecuteXcodeBuildCommand = utils.executeXcodeBuildCommand as MockedFunction<any>;
    mockCreateTextResponse = utils.createTextResponse as MockedFunction<any>;
    mockMkdtemp = fsPromises.mkdtemp as MockedFunction<any>;
    mockRm = fsPromises.rm as MockedFunction<any>;
    mockStat = fsPromises.stat as MockedFunction<any>;
    mockPromisify = util.promisify as MockedFunction<any>;
    mockExec = childProcess.exec as MockedFunction<any>;
    mockTmpdir = os.tmpdir as MockedFunction<any>;
    mockJoin = path.join as MockedFunction<any>;

    vi.clearAllMocks();

    // Set up default mock returns
    mockTmpdir.mockReturnValue('/tmp');
    mockJoin.mockReturnValue('/tmp/test-123/TestResults.xcresult');
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(testDeviceWs.name).toBe('test_device_ws');
    });

    it('should have correct description', () => {
      expect(testDeviceWs.description).toBe(
        'Runs tests for an Apple workspace on a physical device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro) using xcodebuild test and parses xcresult output. IMPORTANT: Requires workspacePath, scheme, and deviceId.',
      );
    });

    it('should have handler function', () => {
      expect(typeof testDeviceWs.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        testDeviceWs.schema.workspacePath.safeParse('/path/to/workspace.xcworkspace').success,
      ).toBe(true);
      expect(testDeviceWs.schema.scheme.safeParse('MyScheme').success).toBe(true);
      expect(testDeviceWs.schema.deviceId.safeParse('test-device-123').success).toBe(true);

      // Test optional fields
      expect(testDeviceWs.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(testDeviceWs.schema.platform.safeParse('iOS').success).toBe(true);
      expect(testDeviceWs.schema.extraArgs.safeParse(['--quiet']).success).toBe(true);
      expect(testDeviceWs.schema.preferXcodebuild.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(testDeviceWs.schema.workspacePath.safeParse(123).success).toBe(false);
      expect(testDeviceWs.schema.platform.safeParse('invalidPlatform').success).toBe(false);
      expect(testDeviceWs.schema.extraArgs.safeParse('not-array').success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return successful test response with xcresult parsing', async () => {
      // Mock temporary directory creation
      mockMkdtemp.mockResolvedValue('/tmp/xcodebuild-test-abc123');

      // Mock join to return the expected result bundle path
      mockJoin.mockReturnValue('/tmp/xcodebuild-test-abc123/TestResults.xcresult');

      // Mock successful test run
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: '✅ Tests completed successfully' }],
        isError: false,
      });

      // Mock successful xcresult parsing
      const mockExecAsync = vi.fn().mockResolvedValue({
        stdout: JSON.stringify({
          title: 'Test Run Results',
          result: 'SUCCESS',
          totalTestCount: 10,
          passedTests: 8,
          failedTests: 2,
          skippedTests: 0,
          expectedFailures: 0,
          environmentDescription: 'iOS 17.0 Simulator',
        }),
      });
      mockPromisify.mockReturnValue(mockExecAsync);

      // Mock successful file stat (xcresult bundle exists)
      mockStat.mockResolvedValue({ isFile: () => true });

      // Mock successful cleanup
      mockRm.mockResolvedValue(undefined);

      const result = await testDeviceWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        deviceId: 'test-device-123',
        configuration: 'Debug',
        platform: 'iOS',
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: '✅ Tests completed successfully' },
          {
            type: 'text',
            text: '\nTest Results Summary:\nTest Summary: Test Run Results\nOverall Result: SUCCESS\n\nTest Counts:\n  Total: 10\n  Passed: 8\n  Failed: 2\n  Skipped: 0\n  Expected Failures: 0\n\nEnvironment: iOS 17.0 Simulator\n',
          },
        ],
        isError: false,
      });

      // Verify xcresulttool was called
      expect(mockExecAsync).toHaveBeenCalledWith(
        'xcrun xcresulttool get test-results summary --path "/tmp/xcodebuild-test-abc123/TestResults.xcresult"',
      );

      // Verify cleanup was called
      expect(mockRm).toHaveBeenCalledWith('/tmp/xcodebuild-test-abc123', {
        recursive: true,
        force: true,
      });
    });

    it('should use default values when not provided', async () => {
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: '✅ Tests completed successfully' }],
      });

      await testDeviceWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        deviceId: 'test-device-123',
      });

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          configuration: 'Debug',
          preferXcodebuild: false,
          platform: 'iOS',
        }),
        expect.objectContaining({
          platform: 'iOS',
          logPrefix: 'Test Run',
        }),
        false,
        'test',
      );
    });

    it('should return exact test failure response', async () => {
      // Mock temporary directory creation
      mockMkdtemp.mockResolvedValue('/tmp/xcodebuild-test-failure-abc');
      mockJoin.mockReturnValue('/tmp/xcodebuild-test-failure-abc/TestResults.xcresult');

      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Tests failed: 2 of 10 tests failed' }],
        isError: true,
      });

      // Mock xcresult bundle doesn't exist to skip parsing
      mockStat.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      // Mock cleanup
      mockRm.mockResolvedValue(undefined);

      const result = await testDeviceWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        deviceId: 'test-device-123',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Tests failed: 2 of 10 tests failed' }],
        isError: true,
      });
    });

    it('should handle xcresult parsing failure gracefully', async () => {
      // Mock temporary directory creation
      mockMkdtemp.mockResolvedValue('/tmp/xcodebuild-test-def456');
      mockJoin.mockReturnValue('/tmp/xcodebuild-test-def456/TestResults.xcresult');

      // Mock successful test run
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: '✅ Tests completed successfully' }],
        isError: false,
      });

      // Mock file exists check
      mockStat.mockResolvedValue({ isFile: () => true });

      // Mock xcresulttool parse failure
      const mockExecAsync = vi.fn().mockRejectedValue(new Error('Parse error'));
      mockPromisify.mockReturnValue(mockExecAsync);

      // Mock cleanup
      mockRm.mockResolvedValue(undefined);

      const result = await testDeviceWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        deviceId: 'test-device-123',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: '✅ Tests completed successfully' }],
        isError: false,
      });

      // Verify warning was logged
      expect(mockLog).toHaveBeenCalledWith(
        'warn',
        expect.stringContaining('Failed to parse xcresult bundle'),
      );

      // Verify cleanup was attempted
      expect(mockRm).toHaveBeenCalledWith('/tmp/xcodebuild-test-def456', {
        recursive: true,
        force: true,
      });
    });

    it('should handle xcresult bundle not found', async () => {
      // Mock temporary directory creation
      mockMkdtemp.mockResolvedValue('/tmp/xcodebuild-test-ghi789');
      mockJoin.mockReturnValue('/tmp/xcodebuild-test-ghi789/TestResults.xcresult');

      // Mock successful test run
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: '✅ Tests completed successfully' }],
        isError: false,
      });

      // Mock file doesn't exist
      mockStat.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      // Mock cleanup
      mockRm.mockResolvedValue(undefined);

      const result = await testDeviceWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        deviceId: 'test-device-123',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: '✅ Tests completed successfully' }],
        isError: false,
      });

      // Verify warning was logged
      expect(mockLog).toHaveBeenCalledWith(
        'warn',
        expect.stringContaining('xcresult bundle does not exist'),
      );
    });

    it('should handle xcresult with device and test failure details', async () => {
      // Mock temporary directory creation
      mockMkdtemp.mockResolvedValue('/tmp/xcodebuild-test-jkl012');
      mockJoin.mockReturnValue('/tmp/xcodebuild-test-jkl012/TestResults.xcresult');

      // Mock test run with failures
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: 'Tests failed: 3 of 10 tests failed' }],
        isError: true,
      });

      // Mock successful xcresult parsing with detailed failure info
      const mockExecAsync = vi.fn().mockResolvedValue({
        stdout: JSON.stringify({
          title: 'Failed Test Run',
          result: 'FAILURE',
          totalTestCount: 10,
          passedTests: 7,
          failedTests: 3,
          skippedTests: 0,
          expectedFailures: 0,
          environmentDescription: 'iOS 17.0 Device',
          devicesAndConfigurations: [
            {
              device: {
                deviceName: 'iPhone 15 Pro',
                platform: 'iOS',
                osVersion: '17.0',
              },
            },
          ],
          testFailures: [
            {
              testName: 'testLoginFlow',
              targetName: 'MyAppTests',
              failureText: 'Assertion failed: Expected login to succeed',
            },
            {
              testName: 'testDataPersistence',
              targetName: 'MyAppTests',
              failureText: 'Core Data save failed',
            },
          ],
          topInsights: [
            {
              impact: 'HIGH',
              text: 'Authentication failures detected',
            },
          ],
        }),
      });
      mockPromisify.mockReturnValue(mockExecAsync);

      // Mock file exists
      mockStat.mockResolvedValue({ isFile: () => true });

      // Mock cleanup
      mockRm.mockResolvedValue(undefined);

      const result = await testDeviceWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        deviceId: 'test-device-123',
        platform: 'iOS',
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'Tests failed: 3 of 10 tests failed' },
          {
            type: 'text',
            text: '\nTest Results Summary:\nTest Summary: Failed Test Run\nOverall Result: FAILURE\n\nTest Counts:\n  Total: 10\n  Passed: 7\n  Failed: 3\n  Skipped: 0\n  Expected Failures: 0\n\nEnvironment: iOS 17.0 Device\n\nDevice: iPhone 15 Pro (iOS 17.0)\n\nTest Failures:\n  1. testLoginFlow (MyAppTests)\n     Assertion failed: Expected login to succeed\n  2. testDataPersistence (MyAppTests)\n     Core Data save failed\n\nInsights:\n  1. [HIGH] Authentication failures detected',
          },
        ],
        isError: true,
      });
    });

    it('should handle all platform mappings correctly', async () => {
      // Mock basic setup
      mockMkdtemp.mockResolvedValue('/tmp/xcodebuild-test-mno345');
      mockJoin.mockReturnValue('/tmp/xcodebuild-test-mno345/TestResults.xcresult');
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: '✅ Tests completed' }],
      });
      mockStat.mockRejectedValue(new Error('No xcresult'));
      mockRm.mockResolvedValue(undefined);

      // Test all platform mappings
      const platforms = ['iOS', 'watchOS', 'tvOS', 'visionOS'];

      for (const platform of platforms) {
        await testDeviceWs.handler({
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          deviceId: 'test-device-123',
          platform: platform,
        });

        expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            platform: platform,
          }),
          expect.objectContaining({
            platform: platform,
          }),
          false,
          'test',
        );
      }
    });

    it('should handle cleanup failure gracefully', async () => {
      // Mock temporary directory creation
      mockMkdtemp.mockResolvedValue('/tmp/xcodebuild-test-pqr678');
      mockJoin.mockReturnValue('/tmp/xcodebuild-test-pqr678/TestResults.xcresult');

      // Mock test run
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: '✅ Tests completed' }],
      });

      // Mock xcresult doesn't exist
      mockStat.mockRejectedValue(new Error('No file'));

      // Mock cleanup failure
      mockRm.mockRejectedValue(new Error('Permission denied'));

      const result = await testDeviceWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        deviceId: 'test-device-123',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: '✅ Tests completed' }],
      });

      // Verify cleanup warning was logged
      expect(mockLog).toHaveBeenCalledWith(
        'warn',
        expect.stringContaining('Failed to clean up temporary directory'),
      );
    });

    it('should return exact error response when exception occurs', async () => {
      mockExecuteXcodeBuildCommand.mockRejectedValue(new Error('Network error'));

      mockCreateTextResponse.mockReturnValue({
        content: [{ type: 'text', text: 'Error during test run: Network error' }],
        isError: true,
      });

      const result = await testDeviceWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        deviceId: 'test-device-123',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error during test run: Network error' }],
        isError: true,
      });
    });

    it('should handle string error in main catch block', async () => {
      mockExecuteXcodeBuildCommand.mockRejectedValue('String error');

      mockCreateTextResponse.mockReturnValue({
        content: [{ type: 'text', text: 'Error during test run: String error' }],
        isError: true,
      });

      const result = await testDeviceWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        deviceId: 'test-device-123',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error during test run: String error' }],
        isError: true,
      });

      expect(mockLog).toHaveBeenCalledWith('error', 'Error during test run: String error');
    });
  });
});
