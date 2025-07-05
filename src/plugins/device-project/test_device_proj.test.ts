/**
 * Tests for test_device_proj plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import testDeviceProj from './test_device_proj.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  executeXcodeBuildCommand: vi.fn(),
  createTextResponse: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  mkdtemp: vi.fn(),
  rm: vi.fn(),
  stat: vi.fn(),
}));

vi.mock('child_process', () => ({
  exec: vi.fn(),
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
        testDeviceProj.schema.projectPath.safeParse('/path/to/MyProject.xcodeproj').success,
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
      expect(testDeviceProj.schema.deviceId.safeParse(123).success).toBe(false);
      expect(testDeviceProj.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(testDeviceProj.schema.platform.safeParse('invalidPlatform').success).toBe(false);
    });
  });

  let mockExecuteXcodeBuildCommand: MockedFunction<any>;
  let mockCreateTextResponse: MockedFunction<any>;
  let mockMkdtemp: MockedFunction<any>;
  let mockRm: MockedFunction<any>;
  let mockStat: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');
    const fs = await import('fs/promises');

    mockExecuteXcodeBuildCommand = utils.executeXcodeBuildCommand as MockedFunction<any>;
    mockCreateTextResponse = utils.createTextResponse as MockedFunction<any>;
    mockMkdtemp = fs.mkdtemp as MockedFunction<any>;
    mockRm = fs.rm as MockedFunction<any>;
    mockStat = fs.stat as MockedFunction<any>;

    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact successful test response', async () => {
      mockMkdtemp.mockResolvedValue('/tmp/xcodebuild-test-abc123');
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '✅ Tests passed successfully',
          },
        ],
      });
      mockStat.mockResolvedValue({ isFile: () => true });
      mockRm.mockResolvedValue(undefined);

      // Mock exec for xcresulttool
      const { exec } = await import('child_process');
      const mockExec = exec as MockedFunction<any>;
      mockExec.mockImplementation((command, callback) => {
        callback(null, {
          stdout: JSON.stringify({
            title: 'Test Summary',
            result: 'PASSED',
            totalTestCount: 5,
            passedTests: 5,
            failedTests: 0,
          }),
        });
      });

      const result = await testDeviceProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
        deviceId: 'test-device-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Tests passed successfully',
          },
          {
            type: 'text',
            text: '\nTest Results Summary:\nTest Summary: Test Summary\nOverall Result: PASSED\n\nTest Counts:\n  Total: 5\n  Passed: 5\n  Failed: 0\n  Skipped: 0\n  Expected Failures: 0\n',
          },
        ],
      });
    });

    it('should return exact test failure response', async () => {
      mockMkdtemp.mockResolvedValue('/tmp/xcodebuild-test-abc123');
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Tests failed with errors',
          },
        ],
        isError: true,
      });
      mockStat.mockResolvedValue({ isFile: () => true });
      mockRm.mockResolvedValue(undefined);

      // Mock exec for xcresulttool
      const { exec } = await import('child_process');
      const mockExec = exec as MockedFunction<any>;
      mockExec.mockImplementation((command, callback) => {
        callback(null, {
          stdout: JSON.stringify({
            title: 'Test Summary',
            result: 'FAILED',
            totalTestCount: 5,
            passedTests: 3,
            failedTests: 2,
          }),
        });
      });

      const result = await testDeviceProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
        deviceId: 'test-device-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Tests failed with errors',
          },
          {
            type: 'text',
            text: '\nTest Results Summary:\nTest Summary: Test Summary\nOverall Result: FAILED\n\nTest Counts:\n  Total: 5\n  Passed: 3\n  Failed: 2\n  Skipped: 0\n  Expected Failures: 0\n',
          },
        ],
        isError: true,
      });
    });

    it('should return exact response when xcresult parsing fails', async () => {
      mockMkdtemp.mockResolvedValue('/tmp/xcodebuild-test-abc123');
      mockExecuteXcodeBuildCommand.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '✅ Tests passed successfully',
          },
        ],
      });
      mockStat.mockRejectedValue(new Error('File not found'));
      mockRm.mockResolvedValue(undefined);

      const result = await testDeviceProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
        deviceId: 'test-device-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Tests passed successfully',
          },
        ],
      });
    });

    it('should return exact exception handling response', async () => {
      mockMkdtemp.mockRejectedValue(new Error('Failed to create temp directory'));
      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Error during test run: Failed to create temp directory',
          },
        ],
        isError: true,
      });

      const result = await testDeviceProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
        deviceId: 'test-device-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during test run: Failed to create temp directory',
          },
        ],
        isError: true,
      });
    });

    it('should return exact string error handling response', async () => {
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

      const result = await testDeviceProj.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
        deviceId: 'test-device-123',
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
