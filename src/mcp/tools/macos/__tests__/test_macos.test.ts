/**
 * Tests for test_macos plugin (unified project/workspace)
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect } from 'vitest';
import { createMockExecutor } from '../../../../test-utils/mock-executors.js';
import testMacos, { testMacosLogic } from '../test_macos.ts';

describe('test_macos plugin (unified)', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(testMacos.name).toBe('test_macos');
    });

    it('should have correct description', () => {
      expect(testMacos.description).toBe(
        'Runs tests for a macOS project or workspace using xcodebuild test and parses xcresult output. Provide exactly one of projectPath or workspacePath. IMPORTANT: Requires scheme. Example: test_macos({ projectPath: "/path/to/MyProject.xcodeproj", scheme: "MyScheme" })',
      );
    });

    it('should have handler function', () => {
      expect(typeof testMacos.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test workspace path
      expect(
        testMacos.schema.workspacePath.safeParse('/path/to/MyProject.xcworkspace').success,
      ).toBe(true);

      // Test project path
      expect(testMacos.schema.projectPath.safeParse('/path/to/MyProject.xcodeproj').success).toBe(
        true,
      );

      // Test required scheme
      expect(testMacos.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(testMacos.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(testMacos.schema.derivedDataPath.safeParse('/path/to/derived-data').success).toBe(
        true,
      );
      expect(testMacos.schema.extraArgs.safeParse(['--arg1', '--arg2']).success).toBe(true);
      expect(testMacos.schema.preferXcodebuild.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(testMacos.schema.workspacePath.safeParse(null).success).toBe(false);
      expect(testMacos.schema.projectPath.safeParse(null).success).toBe(false);
      expect(testMacos.schema.scheme.safeParse(null).success).toBe(false);
      expect(testMacos.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(testMacos.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
    });
  });

  describe('XOR Parameter Validation', () => {
    it('should validate that either projectPath or workspacePath is provided', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const mockFileSystemExecutor = {
        mkdtemp: async () => '/tmp/test-123',
        rm: async () => {},
        tmpdir: () => '/tmp',
        stat: async () => ({ isDirectory: () => true }),
      };

      // Should return error response when neither is provided
      const result = await testMacos.handler({
        scheme: 'MyScheme',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Either projectPath or workspacePath is required');
    });

    it('should validate that both projectPath and workspacePath cannot be provided', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const mockFileSystemExecutor = {
        mkdtemp: async () => '/tmp/test-123',
        rm: async () => {},
        tmpdir: () => '/tmp',
        stat: async () => ({ isDirectory: () => true }),
      };

      // Should return error response when both are provided
      const result = await testMacos.handler({
        projectPath: '/path/to/project.xcodeproj',
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'projectPath and workspacePath are mutually exclusive',
      );
    });

    it('should allow only projectPath', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const mockFileSystemExecutor = {
        mkdtemp: async () => '/tmp/test-123',
        rm: async () => {},
        tmpdir: () => '/tmp',
        stat: async () => ({ isDirectory: () => true }),
      };

      const result = await testMacosLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
        mockFileSystemExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });

    it('should allow only workspacePath', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const mockFileSystemExecutor = {
        mkdtemp: async () => '/tmp/test-123',
        rm: async () => {},
        tmpdir: () => '/tmp',
        stat: async () => ({ isDirectory: () => true }),
      };

      const result = await testMacosLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
        mockFileSystemExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return successful test response with workspace when xcodebuild succeeds', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      // Mock file system dependencies
      const mockFileSystemExecutor = {
        mkdtemp: async () => '/tmp/test-123',
        rm: async () => {},
        tmpdir: () => '/tmp',
        stat: async () => ({ isDirectory: () => true }),
      };

      const result = await testMacosLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Debug',
        },
        mockExecutor,
        mockFileSystemExecutor,
      );

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.isError).toBeUndefined();
    });

    it('should return successful test response with project when xcodebuild succeeds', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      // Mock file system dependencies
      const mockFileSystemExecutor = {
        mkdtemp: async () => '/tmp/test-123',
        rm: async () => {},
        tmpdir: () => '/tmp',
        stat: async () => ({ isDirectory: () => true }),
      };

      const result = await testMacosLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          configuration: 'Debug',
        },
        mockExecutor,
        mockFileSystemExecutor,
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

      // Mock file system dependencies
      const mockFileSystemExecutor = {
        mkdtemp: async () => '/tmp/test-123',
        rm: async () => {},
        tmpdir: () => '/tmp',
        stat: async () => ({ isDirectory: () => true }),
      };

      const result = await testMacosLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
        mockFileSystemExecutor,
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

      // Mock file system dependencies
      const mockFileSystemExecutor = {
        mkdtemp: async () => '/tmp/test-123',
        rm: async () => {},
        tmpdir: () => '/tmp',
        stat: async () => ({ isDirectory: () => true }),
      };

      const result = await testMacosLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Release',
          derivedDataPath: '/custom/derived',
          extraArgs: ['--verbose'],
          preferXcodebuild: true,
        },
        mockExecutor,
        mockFileSystemExecutor,
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

      // Mock file system dependencies
      const mockFileSystemExecutor = {
        mkdtemp: async () => '/tmp/test-123',
        rm: async () => {},
        tmpdir: () => '/tmp',
        stat: async () => ({ isDirectory: () => true }),
      };

      const result = await testMacosLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyApp',
        },
        mockExecutor,
        mockFileSystemExecutor,
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

      // Mock file system dependencies using approved utility
      const mockFileSystemExecutor = {
        mkdtemp: async () => '/tmp/xcodebuild-test-abc123',
        rm: async () => {},
        tmpdir: () => '/tmp',
        stat: async () => ({ isDirectory: () => true }),
      };

      const result = await testMacosLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
        mockFileSystemExecutor,
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

      // Mock file system dependencies
      const mockFileSystemExecutor = {
        mkdtemp: async () => '/tmp/xcodebuild-test-abc123',
        rm: async () => {},
        tmpdir: () => '/tmp',
        stat: async () => ({ isDirectory: () => true }),
      };

      const result = await testMacosLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
        mockFileSystemExecutor,
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

      // Mock file system dependencies
      const mockFileSystemExecutor = {
        mkdtemp: async () => '/tmp/xcodebuild-test-abc123',
        rm: async () => {},
        tmpdir: () => '/tmp',
        stat: async () => ({ isDirectory: () => true }),
      };

      const result = await testMacosLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Release',
          derivedDataPath: '/path/to/derived-data',
          extraArgs: ['--verbose'],
          preferXcodebuild: true,
        },
        mockExecutor,
        mockFileSystemExecutor,
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

      // Mock file system dependencies - mkdtemp fails
      const mockFileSystemExecutor = {
        mkdtemp: async () => {
          throw new Error('Network error');
        },
        rm: async () => {},
        tmpdir: () => '/tmp',
        stat: async () => ({ isDirectory: () => true }),
      };

      const result = await testMacosLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
        mockFileSystemExecutor,
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
