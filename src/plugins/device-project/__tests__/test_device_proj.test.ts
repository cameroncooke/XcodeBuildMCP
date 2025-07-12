/**
 * Tests for test_device_proj plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createMockExecutor } from '../../../utils/command.js';
import testDeviceProj from '../test_device_proj.ts';

// Mock fs promises for temp file handling
vi.mock('fs/promises', () => ({
  mkdtemp: vi.fn(),
  rm: vi.fn(),
  stat: vi.fn(),
}));

vi.mock('os', () => ({
  tmpdir: vi.fn(() => '/tmp'),
}));

// Mock executeXcodeBuildCommand since it doesn't support CommandExecutor yet
vi.mock('../../../utils/build-utils.js', () => ({
  executeXcodeBuildCommand: vi.fn(),
}));

describe('test_device_proj plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(testDeviceProj.name).toBe('test_device_proj');
    });

    it('should have correct description', () => {
      expect(testDeviceProj.description).toBe(
        'Runs tests for an Apple project on a physical device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro) using xcodebuild test and parses xcresult output. IMPORTANT: Requires projectPath, scheme, and deviceId.',
      );
    });

    it('should have handler function', () => {
      expect(typeof testDeviceProj.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        testDeviceProj.schema.projectPath.safeParse('/path/to/project.xcodeproj').success,
      ).toBe(true);
      expect(testDeviceProj.schema.scheme.safeParse('MyScheme').success).toBe(true);
      expect(testDeviceProj.schema.deviceId.safeParse('test-device-123').success).toBe(true);

      // Test optional fields
      expect(testDeviceProj.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(testDeviceProj.schema.derivedDataPath.safeParse('/path/to/derived-data').success).toBe(
        true,
      );
      expect(testDeviceProj.schema.extraArgs.safeParse(['--arg1', '--arg2']).success).toBe(true);
      expect(testDeviceProj.schema.preferXcodebuild.safeParse(true).success).toBe(true);
      expect(testDeviceProj.schema.platform.safeParse('iOS').success).toBe(true);
      expect(testDeviceProj.schema.platform.safeParse('watchOS').success).toBe(true);
      expect(testDeviceProj.schema.platform.safeParse('tvOS').success).toBe(true);
      expect(testDeviceProj.schema.platform.safeParse('visionOS').success).toBe(true);

      // Test invalid inputs
      expect(testDeviceProj.schema.projectPath.safeParse(null).success).toBe(false);
      expect(testDeviceProj.schema.scheme.safeParse(null).success).toBe(false);
      expect(testDeviceProj.schema.deviceId.safeParse(null).success).toBe(false);
      expect(testDeviceProj.schema.platform.safeParse('invalidPlatform').success).toBe(false);
    });
  });

  let mockMkdtemp: ReturnType<typeof vi.fn>;
  let mockRm: ReturnType<typeof vi.fn>;
  let mockStat: ReturnType<typeof vi.fn>;
  let mockExecuteXcodeBuildCommand: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const fs = await import('fs/promises');
    const buildUtils = await import('../../../utils/build-utils.js');

    mockMkdtemp = vi.mocked(fs.mkdtemp);
    mockRm = vi.mocked(fs.rm);
    mockStat = vi.mocked(fs.stat);
    mockExecuteXcodeBuildCommand = vi.mocked(buildUtils.executeXcodeBuildCommand);

    vi.clearAllMocks();

    // Setup default mock behavior
    mockMkdtemp.mockResolvedValue('/tmp/xcodebuild-test-123456');
    mockRm.mockResolvedValue(undefined);
    mockStat.mockResolvedValue({ isFile: () => true } as any);
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should generate correct xcodebuild test command for iOS device', async () => {
      // Mock successful test execution
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: '✅ Test Run test succeeded for scheme MyScheme.' }],
      });

      // Mock xcresulttool output
      const mockExecutor = createMockExecutor({
        success: true,
        output: JSON.stringify({
          title: 'MyScheme Tests',
          result: 'SUCCESS',
          totalTestCount: 5,
          passedTests: 5,
          failedTests: 0,
          skippedTests: 0,
          expectedFailures: 0,
        }),
      });

      await testDeviceProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          deviceId: 'test-device-123',
        },
        mockExecutor,
      );

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          deviceId: 'test-device-123',
          configuration: 'Debug',
          preferXcodebuild: false,
          platform: 'iOS',
          extraArgs: ['-resultBundlePath', '/tmp/xcodebuild-test-123456/TestResults.xcresult'],
        },
        {
          platform: 'iOS',
          simulatorName: undefined,
          simulatorId: undefined,
          deviceId: 'test-device-123',
          useLatestOS: undefined,
          logPrefix: 'Test Run',
        },
        false,
        'test',
      );
    });

    it('should return exact successful test response with parsed results', async () => {
      // Mock successful test execution
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: '✅ Test Run test succeeded for scheme MyScheme.' }],
      });

      // Mock xcresulttool output
      const mockExecutor = createMockExecutor({
        success: true,
        output: JSON.stringify({
          title: 'MyScheme Tests',
          result: 'SUCCESS',
          totalTestCount: 5,
          passedTests: 5,
          failedTests: 0,
          skippedTests: 0,
          expectedFailures: 0,
          environmentDescription: 'iOS 17.5',
          devicesAndConfigurations: [
            {
              device: {
                deviceName: 'iPhone 15 Pro',
                platform: 'iOS',
                osVersion: '17.5',
              },
            },
          ],
        }),
      });

      const result = await testDeviceProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          deviceId: 'test-device-123',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Test Run test succeeded for scheme MyScheme.',
          },
          {
            type: 'text',
            text: '\nTest Results Summary:\nTest Summary: MyScheme Tests\nOverall Result: SUCCESS\n\nTest Counts:\n  Total: 5\n  Passed: 5\n  Failed: 0\n  Skipped: 0\n  Expected Failures: 0\n\nEnvironment: iOS 17.5\n\nDevice: iPhone 15 Pro (iOS 17.5)\n',
          },
        ],
      });
    });

    it('should return exact test failure response with parsed results', async () => {
      // Mock failed test execution
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: '❌ Test Run test failed for scheme MyScheme.' }],
        isError: true,
      });

      // Mock xcresulttool output for failed tests
      const mockExecutor = createMockExecutor({
        success: true,
        output: JSON.stringify({
          title: 'MyScheme Tests',
          result: 'FAILURE',
          totalTestCount: 5,
          passedTests: 3,
          failedTests: 2,
          skippedTests: 0,
          expectedFailures: 0,
          testFailures: [
            {
              testName: 'testExample',
              targetName: 'MyTarget',
              failureText: 'Expected true but was false',
            },
          ],
        }),
      });

      const result = await testDeviceProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          deviceId: 'test-device-123',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Test Run test failed for scheme MyScheme.',
          },
          {
            type: 'text',
            text: '\nTest Results Summary:\nTest Summary: MyScheme Tests\nOverall Result: FAILURE\n\nTest Counts:\n  Total: 5\n  Passed: 3\n  Failed: 2\n  Skipped: 0\n  Expected Failures: 0\n\nTest Failures:\n  1. testExample (MyTarget)\n     Expected true but was false\n',
          },
        ],
        isError: true,
      });
    });

    it('should fallback to original response if xcresult parsing fails', async () => {
      // Mock successful test execution
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: '✅ Test Run test succeeded for scheme MyScheme.' }],
      });

      // Mock xcresulttool to fail
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'xcresulttool failed',
      });
      mockStat.mockRejectedValue(new Error('File not found'));

      const result = await testDeviceProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          deviceId: 'test-device-123',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Test Run test succeeded for scheme MyScheme.',
          },
        ],
      });
    });

    it('should use different platforms correctly', async () => {
      // Mock successful test execution
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: '✅ Test Run test succeeded for scheme WatchApp.' }],
      });

      // Mock xcresulttool output
      const mockExecutor = createMockExecutor({
        success: true,
        output: JSON.stringify({
          title: 'WatchApp Tests',
          result: 'SUCCESS',
          totalTestCount: 3,
          passedTests: 3,
          failedTests: 0,
          skippedTests: 0,
          expectedFailures: 0,
        }),
      });

      await testDeviceProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'WatchApp',
          deviceId: 'watch-device-456',
          platform: 'watchOS',
        },
        mockExecutor,
      );

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'WatchApp',
          deviceId: 'watch-device-456',
          platform: 'watchOS',
          configuration: 'Debug',
          preferXcodebuild: false,
          extraArgs: ['-resultBundlePath', '/tmp/xcodebuild-test-123456/TestResults.xcresult'],
        },
        {
          platform: 'watchOS',
          simulatorName: undefined,
          simulatorId: undefined,
          deviceId: 'watch-device-456',
          useLatestOS: undefined,
          logPrefix: 'Test Run',
        },
        false,
        'test',
      );
    });

    it('should clean up temp directory after processing', async () => {
      // Mock successful test execution
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: '✅ Test Run test succeeded for scheme MyScheme.' }],
      });

      // Mock xcresulttool output
      const mockExecutor = createMockExecutor({
        success: true,
        output: JSON.stringify({
          title: 'Tests',
          result: 'SUCCESS',
          totalTestCount: 1,
          passedTests: 1,
          failedTests: 0,
          skippedTests: 0,
          expectedFailures: 0,
        }),
      });

      await testDeviceProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          deviceId: 'test-device-123',
        },
        mockExecutor,
      );

      expect(mockRm).toHaveBeenCalledWith('/tmp/xcodebuild-test-123456', {
        recursive: true,
        force: true,
      });
    });

    it('should include optional parameters in command', async () => {
      // Mock successful test execution
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [{ type: 'text', text: '✅ Test Run test succeeded for scheme MyScheme.' }],
      });

      // Mock xcresulttool output
      const mockExecutor = createMockExecutor({
        success: true,
        output: JSON.stringify({
          title: 'Tests',
          result: 'SUCCESS',
          totalTestCount: 1,
          passedTests: 1,
          failedTests: 0,
          skippedTests: 0,
          expectedFailures: 0,
        }),
      });

      await testDeviceProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          deviceId: 'test-device-123',
          configuration: 'Release',
          derivedDataPath: '/tmp/derived-data',
          extraArgs: ['--verbose'],
        },
        mockExecutor,
      );

      expect(mockExecuteXcodeBuildCommand).toHaveBeenCalledWith(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          deviceId: 'test-device-123',
          configuration: 'Release',
          derivedDataPath: '/tmp/derived-data',
          extraArgs: [
            '--verbose',
            '-resultBundlePath',
            '/tmp/xcodebuild-test-123456/TestResults.xcresult',
          ],
          preferXcodebuild: false,
          platform: 'iOS',
        },
        {
          platform: 'iOS',
          simulatorName: undefined,
          simulatorId: undefined,
          deviceId: 'test-device-123',
          useLatestOS: undefined,
          logPrefix: 'Test Run',
        },
        false,
        'test',
      );
    });
  });
});
