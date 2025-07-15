/**
 * Tests for test_device_ws plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { describe, it, expect } from 'vitest';
import { createMockExecutor } from '../../../utils/command.js';
import testDeviceWs from '../test_device_ws.ts';

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

  describe('Handler Behavior (Complete Literal Returns)', () => {
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

      const result = await testDeviceWs.handler(
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

      const result = await testDeviceWs.handler(
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

      const result = await testDeviceWs.handler(
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

      await testDeviceWs.handler(
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
  });
});
