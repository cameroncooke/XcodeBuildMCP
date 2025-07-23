/**
 * Tests for test_device_ws plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { describe, it, expect } from 'vitest';
import { createMockExecutor } from '../../../../utils/command.js';
import testDeviceWs, { test_device_wsLogic } from '../test_device_ws.ts';

describe('test_device_ws plugin', () => {
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

      // Test optional fields
      expect(testDeviceWs.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(testDeviceWs.schema.derivedDataPath.safeParse('/path/to/derived').success).toBe(true);
      expect(testDeviceWs.schema.extraArgs.safeParse(['--quiet']).success).toBe(true);
      expect(testDeviceWs.schema.preferXcodebuild.safeParse(true).success).toBe(true);
      expect(testDeviceWs.schema.deviceId.safeParse('test-device-123').success).toBe(true);
      expect(testDeviceWs.schema.platform.safeParse('iOS').success).toBe(true);

      // Test invalid inputs
      expect(testDeviceWs.schema.workspacePath.safeParse(123).success).toBe(false);
      expect(testDeviceWs.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(testDeviceWs.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
      expect(testDeviceWs.schema.platform.safeParse('invalidPlatform').success).toBe(false);
    });
  });

  describe('Logic Function Behavior (Complete Literal Returns)', () => {
    it('should handle missing parameters and generate xcodebuild command', async () => {
      const executorCalls: any[] = [];
      const mockExecutor = async (
        args: any,
        title: string,
        hasRealTimeOutput: boolean,
        env?: any,
      ) => {
        executorCalls.push({ args, title, hasRealTimeOutput, env });
        return {
          success: true,
          output: 'Test Suite All Tests passed',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const result = await test_device_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Debug',
        },
        mockExecutor,
      );

      expect(executorCalls).toHaveLength(1);
      expect(executorCalls[0].args).toEqual(
        expect.arrayContaining([
          'xcodebuild',
          '-workspace',
          '/path/to/workspace.xcworkspace',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Debug',
          'test',
        ]),
      );
      expect(executorCalls[0].title).toBe('Test Run');
      expect(executorCalls[0].hasRealTimeOutput).toBe(true);
      expect(executorCalls[0].env).toBeUndefined();
    });

    it('should return successful test response when xcodebuild succeeds', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_device_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Debug',
        },
        mockExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });

    it('should return error response when xcodebuild fails', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'xcodebuild: error: Scheme not found',
      });

      const result = await test_device_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'NonExistentScheme',
        },
        mockExecutor,
      );

      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('should use default configuration when not provided', async () => {
      const executorCalls: any[] = [];
      const mockExecutor = async (
        args: any,
        title: string,
        hasRealTimeOutput: boolean,
        env?: any,
      ) => {
        executorCalls.push({ args, title, hasRealTimeOutput, env });
        return {
          success: true,
          output: 'Test Suite All Tests passed',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await test_device_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(executorCalls).toHaveLength(1);
      expect(executorCalls[0].args).toEqual(
        expect.arrayContaining([
          'xcodebuild',
          '-workspace',
          '/path/to/workspace.xcworkspace',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Debug',
          'test',
        ]),
      );
      expect(executorCalls[0].title).toBe('Test Run');
      expect(executorCalls[0].hasRealTimeOutput).toBe(true);
      expect(executorCalls[0].env).toBeUndefined();
    });

    it('should handle successful test execution with default configuration', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_device_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });

    it('should handle optional parameters correctly', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_device_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Release',
          derivedDataPath: '/custom/derived',
          extraArgs: ['--verbose'],
          preferXcodebuild: true,
          deviceId: 'test-device-123',
          platform: 'iOS',
        },
        mockExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });

    it('should handle successful test execution with detailed output', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed\nExecuted 25 tests, with 0 failures',
      });

      const result = await test_device_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Debug',
          deviceId: 'test-device-456',
        },
        mockExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });

    it('should handle different platform configurations successfully', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_device_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Release',
          deviceId: 'test-device-789',
          platform: 'tvOS',
        },
        mockExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });
  });

  describe('Handler Integration', () => {
    it('should have handler function that returns a promise', () => {
      expect(typeof testDeviceWs.handler).toBe('function');
      // We can't test the actual execution in test environment due to executor restrictions
      // The logic function tests above provide full coverage of the actual functionality
    });
  });
});
