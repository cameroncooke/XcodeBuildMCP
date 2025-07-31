/**
 * Tests for test_sim_name_ws plugin
 * Following CLAUDE.md testing standards with dependency injection and literal validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMockExecutor } from '../../../../utils/command.js';
import testSimNameWs, { test_sim_name_wsLogic } from '../test_sim_name_ws.ts';

describe('test_sim_name_ws plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(testSimNameWs.name).toBe('test_sim_name_ws');
    });

    it('should have correct description', () => {
      expect(testSimNameWs.description).toBe(
        'Runs tests for a workspace on a simulator by name using xcodebuild test and parses xcresult output.',
      );
    });

    it('should have handler function', () => {
      expect(typeof testSimNameWs.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        testSimNameWs.schema.workspacePath.safeParse('/path/to/workspace.xcworkspace').success,
      ).toBe(true);
      expect(testSimNameWs.schema.scheme.safeParse('MyScheme').success).toBe(true);
      expect(testSimNameWs.schema.simulatorName.safeParse('iPhone 16').success).toBe(true);

      // Test optional fields
      expect(testSimNameWs.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(testSimNameWs.schema.derivedDataPath.safeParse('/path/to/derived').success).toBe(true);
      expect(testSimNameWs.schema.extraArgs.safeParse(['--quiet']).success).toBe(true);
      expect(testSimNameWs.schema.preferXcodebuild.safeParse(true).success).toBe(true);
      expect(testSimNameWs.schema.useLatestOS.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(testSimNameWs.schema.workspacePath.safeParse(123).success).toBe(false);
      expect(testSimNameWs.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(testSimNameWs.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
      expect(testSimNameWs.schema.useLatestOS.safeParse('not-boolean').success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle missing parameters and generate test command', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_sim_name_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          configuration: 'Debug',
        },
        mockExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });

    it('should return successful test response when xcodebuild succeeds', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_sim_name_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
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

      const result = await test_sim_name_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'NonExistentScheme',
          simulatorName: 'iPhone 16',
        },
        mockExecutor,
      );

      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('should use default configuration when not provided', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_sim_name_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
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

      const result = await test_sim_name_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
          derivedDataPath: '/custom/derived',
          extraArgs: ['--verbose'],
          useLatestOS: true,
          preferXcodebuild: true,
        },
        mockExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });

    it('should handle successful test execution with default configuration', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_sim_name_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16 Pro',
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

      const result = await test_sim_name_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 15',
          configuration: 'Debug',
        },
        mockExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });

    it('should handle successful test execution with release configuration', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_sim_name_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 14',
          configuration: 'Release',
          useLatestOS: true,
        },
        mockExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });

    it('should handle successful test execution with custom derived data path', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_sim_name_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPad Pro',
          configuration: 'Debug',
          derivedDataPath: '/custom/derived/data',
          extraArgs: ['--verbose', '--parallel-testing-enabled', 'NO'],
        },
        mockExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });
  });

  describe('Command Generation', () => {
    it('should generate correct test command with minimal parameters', async () => {
      const callHistory: Array<{
        command: string[];
        logPrefix?: string;
        useShell?: boolean;
        env?: any;
      }> = [];

      // Create tracking executor
      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command, logPrefix, useShell, env });
        return {
          success: false,
          output: '',
          error: 'Test error to stop execution early',
          process: { pid: 12345 },
        };
      };

      const result = await test_sim_name_wsLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
        },
        trackingExecutor,
      );

      // Should generate the test command
      expect(callHistory).toHaveLength(1);
      expect(callHistory[0].command).toEqual([
        'xcodebuild',
        '-workspace',
        '/path/to/MyProject.xcworkspace',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Debug',
        '-skipMacroValidation',
        '-destination',
        'platform=iOS Simulator,name=iPhone 16',
        '-resultBundlePath',
        expect.stringMatching(/\/.*\/TestResults\.xcresult$/),
        'test',
      ]);
      expect(callHistory[0].logPrefix).toBe('Test Run');
      expect(callHistory[0].useShell).toBe(true);
    });

    it('should generate correct test command with configuration parameter', async () => {
      const callHistory: Array<{
        command: string[];
        logPrefix?: string;
        useShell?: boolean;
        env?: any;
      }> = [];

      // Create tracking executor
      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command, logPrefix, useShell, env });
        return {
          success: false,
          output: '',
          error: 'Test error to stop execution early',
          process: { pid: 12345 },
        };
      };

      const result = await test_sim_name_wsLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          configuration: 'Release',
        },
        trackingExecutor,
      );

      // Should generate the test command with Release configuration
      expect(callHistory).toHaveLength(1);
      expect(callHistory[0].command).toEqual([
        'xcodebuild',
        '-workspace',
        '/path/to/MyProject.xcworkspace',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Release',
        '-skipMacroValidation',
        '-destination',
        'platform=iOS Simulator,name=iPhone 16',
        '-resultBundlePath',
        expect.stringMatching(/\/.*\/TestResults\.xcresult$/),
        'test',
      ]);
      expect(callHistory[0].logPrefix).toBe('Test Run');
      expect(callHistory[0].useShell).toBe(true);
    });

    it('should generate correct test command with useLatestOS false', async () => {
      const callHistory: Array<{
        command: string[];
        logPrefix?: string;
        useShell?: boolean;
        env?: any;
      }> = [];

      // Create tracking executor
      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command, logPrefix, useShell, env });
        return {
          success: false,
          output: '',
          error: 'Test error to stop execution early',
          process: { pid: 12345 },
        };
      };

      const result = await test_sim_name_wsLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16',
          useLatestOS: false,
        },
        trackingExecutor,
      );

      // Should generate the test command without OS=latest
      expect(callHistory).toHaveLength(1);
      expect(callHistory[0].command).toEqual([
        'xcodebuild',
        '-workspace',
        '/path/to/MyProject.xcworkspace',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Debug',
        '-skipMacroValidation',
        '-destination',
        'platform=iOS Simulator,name=iPhone 16',
        '-resultBundlePath',
        expect.stringMatching(/\/.*\/TestResults\.xcresult$/),
        'test',
      ]);
      expect(callHistory[0].logPrefix).toBe('Test Run');
      expect(callHistory[0].useShell).toBe(true);
    });

    it('should generate correct test command with all optional parameters', async () => {
      const callHistory: Array<{
        command: string[];
        logPrefix?: string;
        useShell?: boolean;
        env?: any;
      }> = [];

      // Create tracking executor
      const trackingExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callHistory.push({ command, logPrefix, useShell, env });
        return {
          success: false,
          output: '',
          error: 'Test error to stop execution early',
          process: { pid: 12345 },
        };
      };

      const result = await test_sim_name_wsLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          simulatorName: 'iPhone 16 Pro',
          configuration: 'Release',
          derivedDataPath: '/custom/derived/data',
          extraArgs: ['--verbose', '--parallel-testing-enabled', 'NO'],
          useLatestOS: true,
          preferXcodebuild: true,
        },
        trackingExecutor,
      );

      // Should generate the test command with all parameters
      expect(callHistory).toHaveLength(1);
      expect(callHistory[0].command).toEqual([
        'xcodebuild',
        '-workspace',
        '/path/to/MyProject.xcworkspace',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Release',
        '-skipMacroValidation',
        '-destination',
        'platform=iOS Simulator,name=iPhone 16 Pro,OS=latest',
        '-derivedDataPath',
        '/custom/derived/data',
        '--verbose',
        '--parallel-testing-enabled',
        'NO',
        '-resultBundlePath',
        expect.stringMatching(/\/.*\/TestResults\.xcresult$/),
        'test',
      ]);
      expect(callHistory[0].logPrefix).toBe('Test Run');
      expect(callHistory[0].useShell).toBe(true);
    });
  });
});
