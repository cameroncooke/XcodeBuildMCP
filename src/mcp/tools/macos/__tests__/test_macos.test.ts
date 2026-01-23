/**
 * Tests for test_macos plugin (unified project/workspace)
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as z from 'zod';
import {
  createMockCommandResponse,
  createMockExecutor,
  createMockFileSystemExecutor,
  type FileSystemExecutor,
} from '../../../../test-utils/mock-executors.ts';
import { sessionStore } from '../../../../utils/session-store.ts';
import testMacos, { testMacosLogic } from '../test_macos.ts';

const createTestFileSystemExecutor = (overrides: Partial<FileSystemExecutor> = {}) =>
  createMockFileSystemExecutor({
    mkdtemp: async () => '/tmp/test-123',
    rm: async () => {},
    tmpdir: () => '/tmp',
    stat: async () => ({ isDirectory: () => true, mtimeMs: 0 }),
    ...overrides,
  });

describe('test_macos plugin (unified)', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(testMacos.name).toBe('test_macos');
    });

    it('should have correct description', () => {
      expect(testMacos.description).toBe('Test macOS target.');
    });

    it('should have handler function', () => {
      expect(typeof testMacos.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      const schema = z.strictObject(testMacos.schema);

      expect(schema.safeParse({}).success).toBe(true);
      expect(
        schema.safeParse({
          extraArgs: ['--arg1', '--arg2'],
          testRunnerEnv: { FOO: 'BAR' },
        }).success,
      ).toBe(true);

      expect(schema.safeParse({ derivedDataPath: '/path/to/derived-data' }).success).toBe(false);
      expect(schema.safeParse({ extraArgs: ['--ok', 1] }).success).toBe(false);
      expect(schema.safeParse({ preferXcodebuild: true }).success).toBe(false);
      expect(schema.safeParse({ testRunnerEnv: { FOO: 123 } }).success).toBe(false);

      const schemaKeys = Object.keys(testMacos.schema).sort();
      expect(schemaKeys).toEqual(['extraArgs', 'testRunnerEnv'].sort());
    });
  });

  describe('Handler Requirements', () => {
    it('should require scheme before running', async () => {
      const result = await testMacos.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('scheme is required');
    });

    it('should require project or workspace when scheme default exists', async () => {
      sessionStore.setDefaults({ scheme: 'MyScheme' });

      const result = await testMacos.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Provide a project or workspace');
    });

    it('should reject when both projectPath and workspacePath provided explicitly', async () => {
      sessionStore.setDefaults({ scheme: 'MyScheme' });

      const result = await testMacos.handler({
        projectPath: '/path/to/project.xcodeproj',
        workspacePath: '/path/to/workspace.xcworkspace',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Mutually exclusive parameters provided');
    });
  });

  describe('XOR Parameter Validation', () => {
    it('should validate that either projectPath or workspacePath is provided', async () => {
      // Should return error response when neither is provided
      const result = await testMacos.handler({
        scheme: 'MyScheme',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Provide a project or workspace');
    });

    it('should validate that both projectPath and workspacePath cannot be provided', async () => {
      // Should return error response when both are provided
      const result = await testMacos.handler({
        projectPath: '/path/to/project.xcodeproj',
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Mutually exclusive parameters provided');
    });

    it('should allow only projectPath', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Test Suite All Tests passed',
      });

      const mockFileSystemExecutor = createTestFileSystemExecutor();

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

      const mockFileSystemExecutor = createTestFileSystemExecutor();

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
      const mockFileSystemExecutor = createTestFileSystemExecutor();

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
      const mockFileSystemExecutor = createTestFileSystemExecutor();

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
      const mockFileSystemExecutor = createTestFileSystemExecutor();

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
      const mockFileSystemExecutor = createTestFileSystemExecutor();

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
      const mockFileSystemExecutor = createTestFileSystemExecutor();

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
        opts?: { env?: Record<string, string> },
        detached?: boolean,
      ) => {
        commandCalls.push({ command, logPrefix, useShell, env: opts?.env });
        void detached;

        // Handle xcresulttool command
        if (command.includes('xcresulttool')) {
          return createMockCommandResponse({
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
          });
        }

        return createMockCommandResponse({
          success: true,
          output: 'Test Succeeded',
          error: undefined,
        });
      };

      // Mock file system dependencies using approved utility
      const mockFileSystemExecutor = createTestFileSystemExecutor({
        mkdtemp: async () => '/tmp/xcodebuild-test-abc123',
      });

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
        opts?: { env?: Record<string, string> },
        detached?: boolean,
      ) => {
        callCount++;
        void logPrefix;
        void useShell;
        void opts;
        void detached;

        // First call is xcodebuild test - fails
        if (callCount === 1) {
          return createMockCommandResponse({
            success: false,
            output: '',
            error: 'error: Test failed',
          });
        }

        // Second call is xcresulttool
        if (command.includes('xcresulttool')) {
          return createMockCommandResponse({
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
          });
        }

        return createMockCommandResponse({ success: true, output: '', error: undefined });
      };

      // Mock file system dependencies
      const mockFileSystemExecutor = createTestFileSystemExecutor({
        mkdtemp: async () => '/tmp/xcodebuild-test-abc123',
      });

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
        opts?: { env?: Record<string, string> },
        detached?: boolean,
      ) => {
        commandCalls.push({ command, logPrefix, useShell, env: opts?.env });
        void detached;

        // Handle xcresulttool command
        if (command.includes('xcresulttool')) {
          return createMockCommandResponse({
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
          });
        }

        return createMockCommandResponse({
          success: true,
          output: 'Test Succeeded',
          error: undefined,
        });
      };

      // Mock file system dependencies
      const mockFileSystemExecutor = createTestFileSystemExecutor({
        mkdtemp: async () => '/tmp/xcodebuild-test-abc123',
      });

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
      const mockFileSystemExecutor = createTestFileSystemExecutor({
        mkdtemp: async () => {
          throw new Error('Network error');
        },
      });

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
