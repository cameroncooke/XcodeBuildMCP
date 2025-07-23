/**
 * Tests for test_device_proj plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using pure dependency injection for deterministic testing
 * NO VITEST MOCKING ALLOWED - Only createMockExecutor and manual stubs
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMockExecutor, createMockFileSystemExecutor } from '../../../../utils/command.js';
import testDeviceProj, { test_device_projLogic } from '../test_device_proj.ts';

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

  describe('Handler Behavior (Complete Literal Returns)', () => {
    beforeEach(() => {
      // Clean setup for standard testing pattern
    });

    it('should return successful test response with parsed results', async () => {
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

      const result = await test_device_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          deviceId: 'test-device-123',
          configuration: 'Debug',
          preferXcodebuild: false,
          platform: 'iOS',
        },
        mockExecutor,
        createMockFileSystemExecutor({
          mkdtemp: async () => '/tmp/xcodebuild-test-123456',
          tmpdir: () => '/tmp',
          stat: async () => ({ isFile: () => true }),
          rm: async () => {},
        }),
      );

      expect(result.content).toHaveLength(2);
      expect(result.content[0].text).toContain('✅');
      expect(result.content[1].text).toContain('Test Results Summary:');
      expect(result.content[1].text).toContain('MyScheme Tests');
    });

    it('should handle test failure scenarios', async () => {
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

      const result = await test_device_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          deviceId: 'test-device-123',
          configuration: 'Debug',
          preferXcodebuild: false,
          platform: 'iOS',
        },
        mockExecutor,
        createMockFileSystemExecutor({
          mkdtemp: async () => '/tmp/xcodebuild-test-123456',
          tmpdir: () => '/tmp',
          stat: async () => ({ isFile: () => true }),
          rm: async () => {},
        }),
      );

      expect(result.content).toHaveLength(2);
      expect(result.content[1].text).toContain('Test Failures:');
      expect(result.content[1].text).toContain('testExample');
    });

    it('should handle xcresult parsing failures gracefully', async () => {
      // Create a multi-call mock that handles different commands
      let callCount = 0;
      const mockExecutor = async (args: string[], description: string) => {
        callCount++;

        // First call is for xcodebuild test (successful)
        if (callCount === 1) {
          return { success: true, output: 'BUILD SUCCEEDED' };
        }

        // Second call is for xcresulttool (fails)
        return { success: false, error: 'xcresulttool failed' };
      };

      const result = await test_device_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          deviceId: 'test-device-123',
          configuration: 'Debug',
          preferXcodebuild: false,
          platform: 'iOS',
        },
        mockExecutor,
        createMockFileSystemExecutor({
          mkdtemp: async () => '/tmp/xcodebuild-test-123456',
          tmpdir: () => '/tmp',
          stat: async () => {
            throw new Error('File not found');
          },
          rm: async () => {},
        }),
      );

      // When xcresult parsing fails, it falls back to original test result only
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('✅');
    });

    it('should support different platforms', async () => {
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

      const result = await test_device_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'WatchApp',
          deviceId: 'watch-device-456',
          configuration: 'Debug',
          preferXcodebuild: false,
          platform: 'watchOS',
        },
        mockExecutor,
        createMockFileSystemExecutor({
          mkdtemp: async () => '/tmp/xcodebuild-test-123456',
          tmpdir: () => '/tmp',
          stat: async () => ({ isFile: () => true }),
          rm: async () => {},
        }),
      );

      expect(result.content).toHaveLength(2);
      expect(result.content[1].text).toContain('WatchApp Tests');
    });

    it('should handle optional parameters', async () => {
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

      const result = await test_device_projLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          deviceId: 'test-device-123',
          configuration: 'Release',
          derivedDataPath: '/tmp/derived-data',
          extraArgs: ['--verbose'],
          preferXcodebuild: false,
          platform: 'iOS',
        },
        mockExecutor,
        createMockFileSystemExecutor({
          mkdtemp: async () => '/tmp/xcodebuild-test-123456',
          tmpdir: () => '/tmp',
          stat: async () => ({ isFile: () => true }),
          rm: async () => {},
        }),
      );

      expect(result.content).toHaveLength(2);
      expect(result.content[0].text).toContain('✅');
    });
  });
});
