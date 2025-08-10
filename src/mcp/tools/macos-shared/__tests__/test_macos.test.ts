/**
 * Tests for test_macos_ws plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect } from 'vitest';
import { createMockExecutor } from '../../../../utils/command.js';
import testMacosWs, { test_macos_wsLogic } from '../test_macos_ws.ts';

describe('test_macos_ws plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(testMacosWs.name).toBe('test_macos_ws');
    });

    it('should have correct description', () => {
      expect(testMacosWs.description).toBe(
        'Runs tests for a macOS workspace using xcodebuild test and parses xcresult output.',
      );
    });

    it('should have handler function', () => {
      expect(typeof testMacosWs.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        testMacosWs.schema.workspacePath.safeParse('/path/to/MyProject.xcworkspace').success,
      ).toBe(true);
      expect(testMacosWs.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(testMacosWs.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(testMacosWs.schema.derivedDataPath.safeParse('/path/to/derived-data').success).toBe(
        true,
      );
      expect(testMacosWs.schema.extraArgs.safeParse(['--arg1', '--arg2']).success).toBe(true);
      expect(testMacosWs.schema.preferXcodebuild.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(testMacosWs.schema.workspacePath.safeParse(null).success).toBe(false);
      expect(testMacosWs.schema.scheme.safeParse(null).success).toBe(false);
      expect(testMacosWs.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(testMacosWs.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return successful test response when xcodebuild succeeds', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_macos_wsLogic(
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

    it('should use default configuration when not provided', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_macos_wsLogic(
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

      const result = await test_macos_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Release',
          derivedDataPath: '/custom/derived',
          extraArgs: ['--verbose'],
          preferXcodebuild: true,
        },
        mockExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });

    it('should handle successful test execution with minimal parameters', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const result = await test_macos_wsLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyApp',
        },
        mockExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });

    it('should return exact successful test response', async () => {
      // Track command execution calls
      const commandCalls: any[] = [];

      // Mock executor for successful test
      const mockExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        commandCalls.push({ command, logPrefix, useShell, env });

        // Handle xcresulttool command
        if (command.includes('xcresulttool')) {
          return {
            success: true,
            output: JSON.stringify({
              title: 'Test Results',
              result: 'SUCCEEDED',
              totalTestCount: 5,
              passedTests: 5,
              failedTests: 0,
              skippedTests: 0,
              expectedFailures: 0,
            }),
            error: undefined,
          };
        }

        return {
          success: true,
          output: 'Test Succeeded',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      // Mock temp directory dependencies using approved utility
      const mockTempDirDeps = {
        mkdtemp: async () => '/tmp/xcodebuild-test-abc123',
        rm: async () => {},
        join: (...args: string[]) => args.join('/'),
        tmpdir: () => '/tmp',
      };

      // Mock file system check using approved utility
      const mockFileSystemDeps = {
        stat: async () => ({ isDirectory: () => true }),
      };

      const result = await test_macos_wsLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
        mockTempDirDeps,
        mockFileSystemDeps,
      );

      // Verify commands were called with correct parameters
      expect(commandCalls).toHaveLength(2); // xcodebuild test + xcresulttool
      expect(commandCalls[0].command).toEqual([
        'xcodebuild',
        '-workspace',
        '/path/to/MyProject.xcworkspace',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Debug',
        '-skipMacroValidation',
        '-destination',
        'platform=macOS',
        '-resultBundlePath',
        '/tmp/xcodebuild-test-abc123/TestResults.xcresult',
        'test',
      ]);
      expect(commandCalls[0].logPrefix).toBe('Test Run');
      expect(commandCalls[0].useShell).toBe(true);

      // Verify xcresulttool was called
      expect(commandCalls[1].command).toEqual([
        'xcrun',
        'xcresulttool',
        'get',
        'test-results',
        'summary',
        '--path',
        '/tmp/xcodebuild-test-abc123/TestResults.xcresult',
      ]);
      expect(commandCalls[1].logPrefix).toBe('Parse xcresult bundle');

      expect(result.content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'text',
            text: '✅ Test Run test succeeded for scheme MyScheme.',
          }),
        ]),
      );
    });

    it('should return exact test failure response', async () => {
      // Track command execution calls
      let callCount = 0;
      const mockExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        callCount++;

        // First call is xcodebuild test - fails
        if (callCount === 1) {
          return {
            success: false,
            output: '',
            error: 'error: Test failed',
            process: { pid: 12345 },
          };
        }

        // Second call is xcresulttool
        if (command.includes('xcresulttool')) {
          return {
            success: true,
            output: JSON.stringify({
              title: 'Test Results',
              result: 'FAILED',
              totalTestCount: 5,
              passedTests: 3,
              failedTests: 2,
              skippedTests: 0,
              expectedFailures: 0,
            }),
            error: undefined,
          };
        }

        return { success: true, output: '', error: undefined };
      };

      // Mock temp directory dependencies
      const mockTempDirDeps = {
        mkdtemp: async () => '/tmp/xcodebuild-test-abc123',
        rm: async () => {},
        join: (...args: string[]) => args.join('/'),
        tmpdir: () => '/tmp',
      };

      // Mock file system check
      const mockFileSystemDeps = {
        stat: async () => ({ isDirectory: () => true }),
      };

      const result = await test_macos_wsLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
        mockTempDirDeps,
        mockFileSystemDeps,
      );

      expect(result.content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'text',
            text: '❌ Test Run test failed for scheme MyScheme.',
          }),
        ]),
      );
      expect(result.isError).toBe(true);
    });

    it('should return exact successful test response with optional parameters', async () => {
      // Track command execution calls
      const commandCalls: any[] = [];

      // Mock executor for successful test with optional parameters
      const mockExecutor = async (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: Record<string, string>,
      ) => {
        commandCalls.push({ command, logPrefix, useShell, env });

        // Handle xcresulttool command
        if (command.includes('xcresulttool')) {
          return {
            success: true,
            output: JSON.stringify({
              title: 'Test Results',
              result: 'SUCCEEDED',
              totalTestCount: 5,
              passedTests: 5,
              failedTests: 0,
              skippedTests: 0,
              expectedFailures: 0,
            }),
            error: undefined,
          };
        }

        return {
          success: true,
          output: 'Test Succeeded',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      // Mock temp directory dependencies
      const mockTempDirDeps = {
        mkdtemp: async () => '/tmp/xcodebuild-test-abc123',
        rm: async () => {},
        join: (...args: string[]) => args.join('/'),
        tmpdir: () => '/tmp',
      };

      // Mock file system check
      const mockFileSystemDeps = {
        stat: async () => ({ isDirectory: () => true }),
      };

      const result = await test_macos_wsLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived-data',
          extraArgs: ['--verbose'],
          preferXcodebuild: true,
        },
        mockExecutor,
        mockTempDirDeps,
        mockFileSystemDeps,
      );

      expect(result.content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'text',
            text: '✅ Test Run test succeeded for scheme MyScheme.',
          }),
        ]),
      );
    });

    it('should return exact exception handling response', async () => {
      // Mock executor (won't be called due to mkdtemp failure)
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Succeeded',
      });

      // Mock temp directory dependencies - mkdtemp fails
      const mockTempDirDeps = {
        mkdtemp: async () => {
          throw new Error('Network error');
        },
        rm: async () => {},
        join: (...args: string[]) => args.join('/'),
        tmpdir: () => '/tmp',
      };

      // Mock file system check
      const mockFileSystemDeps = {
        stat: async () => ({ isDirectory: () => true }),
      };

      const result = await test_macos_wsLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
        mockTempDirDeps,
        mockFileSystemDeps,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during test run: Network error',
          },
        ],
        isError: true,
      });
    });
  });
});
