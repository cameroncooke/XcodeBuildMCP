/**
 * Tests for swift_package_run plugin
 * Following CLAUDE.md testing standards with literal validation
 * Integration tests using dependency injection for deterministic testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor, createNoopExecutor } from '../../../../test-utils/mock-executors.ts';
import swiftPackageRun, { swift_package_runLogic } from '../swift_package_run.ts';

describe('swift_package_run plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(swiftPackageRun.name).toBe('swift_package_run');
    });

    it('should have correct description', () => {
      expect(swiftPackageRun.description).toBe(
        'Runs an executable target from a Swift Package with swift run',
      );
    });

    it('should have handler function', () => {
      expect(typeof swiftPackageRun.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test packagePath (required string)
      expect(swiftPackageRun.schema.packagePath.safeParse('valid/path').success).toBe(true);
      expect(swiftPackageRun.schema.packagePath.safeParse(null).success).toBe(false);

      // Test executableName (optional string)
      expect(swiftPackageRun.schema.executableName.safeParse('MyExecutable').success).toBe(true);
      expect(swiftPackageRun.schema.executableName.safeParse(undefined).success).toBe(true);
      expect(swiftPackageRun.schema.executableName.safeParse(123).success).toBe(false);

      // Test arguments (optional array of strings)
      expect(swiftPackageRun.schema.arguments.safeParse(['arg1', 'arg2']).success).toBe(true);
      expect(swiftPackageRun.schema.arguments.safeParse(undefined).success).toBe(true);
      expect(swiftPackageRun.schema.arguments.safeParse(['arg1', 123]).success).toBe(false);

      // Test configuration (optional enum)
      expect(swiftPackageRun.schema.configuration.safeParse('debug').success).toBe(true);
      expect(swiftPackageRun.schema.configuration.safeParse('release').success).toBe(true);
      expect(swiftPackageRun.schema.configuration.safeParse(undefined).success).toBe(true);
      expect(swiftPackageRun.schema.configuration.safeParse('invalid').success).toBe(false);

      // Test timeout (optional number)
      expect(swiftPackageRun.schema.timeout.safeParse(30).success).toBe(true);
      expect(swiftPackageRun.schema.timeout.safeParse(undefined).success).toBe(true);
      expect(swiftPackageRun.schema.timeout.safeParse('30').success).toBe(false);

      // Test background (optional boolean)
      expect(swiftPackageRun.schema.background.safeParse(true).success).toBe(true);
      expect(swiftPackageRun.schema.background.safeParse(false).success).toBe(true);
      expect(swiftPackageRun.schema.background.safeParse(undefined).success).toBe(true);
      expect(swiftPackageRun.schema.background.safeParse('true').success).toBe(false);

      // Test parseAsLibrary (optional boolean)
      expect(swiftPackageRun.schema.parseAsLibrary.safeParse(true).success).toBe(true);
      expect(swiftPackageRun.schema.parseAsLibrary.safeParse(false).success).toBe(true);
      expect(swiftPackageRun.schema.parseAsLibrary.safeParse(undefined).success).toBe(true);
      expect(swiftPackageRun.schema.parseAsLibrary.safeParse('true').success).toBe(false);
    });
  });

  let executorCalls: any[] = [];

  beforeEach(() => {
    executorCalls = [];
  });

  describe('Command Generation Testing', () => {
    it('should build correct command for basic run (foreground mode)', async () => {
      const mockExecutor = (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: any,
      ) => {
        executorCalls.push({ command, logPrefix, useShell, env });
        return Promise.resolve({
          success: true,
          output: 'Process completed',
          error: undefined,
          process: { pid: 12345 },
        });
      };

      await swift_package_runLogic(
        {
          packagePath: '/test/package',
        },
        mockExecutor,
      );

      expect(executorCalls[0]).toEqual({
        command: ['swift', 'run', '--package-path', '/test/package'],
        logPrefix: 'Swift Package Run',
        useShell: true,
        env: undefined,
      });
    });

    it('should build correct command with release configuration', async () => {
      const mockExecutor = (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: any,
      ) => {
        executorCalls.push({ command, logPrefix, useShell, env });
        return Promise.resolve({
          success: true,
          output: 'Process completed',
          error: undefined,
          process: { pid: 12345 },
        });
      };

      await swift_package_runLogic(
        {
          packagePath: '/test/package',
          configuration: 'release',
        },
        mockExecutor,
      );

      expect(executorCalls[0]).toEqual({
        command: ['swift', 'run', '--package-path', '/test/package', '-c', 'release'],
        logPrefix: 'Swift Package Run',
        useShell: true,
        env: undefined,
      });
    });

    it('should build correct command with executable name', async () => {
      const mockExecutor = (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: any,
      ) => {
        executorCalls.push({ command, logPrefix, useShell, env });
        return Promise.resolve({
          success: true,
          output: 'Process completed',
          error: undefined,
          process: { pid: 12345 },
        });
      };

      await swift_package_runLogic(
        {
          packagePath: '/test/package',
          executableName: 'MyApp',
        },
        mockExecutor,
      );

      expect(executorCalls[0]).toEqual({
        command: ['swift', 'run', '--package-path', '/test/package', 'MyApp'],
        logPrefix: 'Swift Package Run',
        useShell: true,
        env: undefined,
      });
    });

    it('should build correct command with arguments', async () => {
      const mockExecutor = (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: any,
      ) => {
        executorCalls.push({ command, logPrefix, useShell, env });
        return Promise.resolve({
          success: true,
          output: 'Process completed',
          error: undefined,
          process: { pid: 12345 },
        });
      };

      await swift_package_runLogic(
        {
          packagePath: '/test/package',
          arguments: ['arg1', 'arg2'],
        },
        mockExecutor,
      );

      expect(executorCalls[0]).toEqual({
        command: ['swift', 'run', '--package-path', '/test/package', '--', 'arg1', 'arg2'],
        logPrefix: 'Swift Package Run',
        useShell: true,
        env: undefined,
      });
    });

    it('should build correct command with parseAsLibrary flag', async () => {
      const mockExecutor = (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: any,
      ) => {
        executorCalls.push({ command, logPrefix, useShell, env });
        return Promise.resolve({
          success: true,
          output: 'Process completed',
          error: undefined,
          process: { pid: 12345 },
        });
      };

      await swift_package_runLogic(
        {
          packagePath: '/test/package',
          parseAsLibrary: true,
        },
        mockExecutor,
      );

      expect(executorCalls[0]).toEqual({
        command: [
          'swift',
          'run',
          '--package-path',
          '/test/package',
          '-Xswiftc',
          '-parse-as-library',
        ],
        logPrefix: 'Swift Package Run',
        useShell: true,
        env: undefined,
      });
    });

    it('should build correct command with all parameters', async () => {
      const mockExecutor = (
        command: string[],
        logPrefix?: string,
        useShell?: boolean,
        env?: any,
      ) => {
        executorCalls.push({ command, logPrefix, useShell, env });
        return Promise.resolve({
          success: true,
          output: 'Process completed',
          error: undefined,
          process: { pid: 12345 },
        });
      };

      await swift_package_runLogic(
        {
          packagePath: '/test/package',
          executableName: 'MyApp',
          configuration: 'release',
          arguments: ['arg1'],
          parseAsLibrary: true,
        },
        mockExecutor,
      );

      expect(executorCalls[0]).toEqual({
        command: [
          'swift',
          'run',
          '--package-path',
          '/test/package',
          '-c',
          'release',
          '-Xswiftc',
          '-parse-as-library',
          'MyApp',
          '--',
          'arg1',
        ],
        logPrefix: 'Swift Package Run',
        useShell: true,
        env: undefined,
      });
    });

    it('should not call executor for background mode', async () => {
      // For background mode, no executor should be called since it uses direct spawn
      const mockExecutor = createNoopExecutor();

      const result = await swift_package_runLogic(
        {
          packagePath: '/test/package',
          background: true,
        },
        mockExecutor,
      );

      // Should return success without calling executor
      expect(result.content[0].text).toContain('🚀 Started executable in background');
    });
  });

  describe('Response Logic Testing', () => {
    it('should return validation error for missing packagePath', async () => {
      // Since the tool now uses createTypedTool, Zod validation happens at the handler level
      // Test the handler directly to see Zod validation
      const result = await swiftPackageRun.handler({});

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Parameter validation failed\nDetails: Invalid parameters:\npackagePath: Required',
          },
        ],
        isError: true,
      });
    });

    it('should return success response for background mode', async () => {
      const mockExecutor = createNoopExecutor();
      const result = await swift_package_runLogic(
        {
          packagePath: '/test/package',
          background: true,
        },
        mockExecutor,
      );

      expect(result.content[0].text).toContain('🚀 Started executable in background');
      expect(result.content[0].text).toContain('💡 Process is running independently');
    });

    it('should return success response for successful execution', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Hello, World!',
      });

      const result = await swift_package_runLogic(
        {
          packagePath: '/test/package',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: '✅ Swift executable completed successfully.' },
          { type: 'text', text: '💡 Process finished cleanly. Check output for results.' },
          { type: 'text', text: 'Hello, World!' },
        ],
      });
    });

    it('should return error response for failed execution', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Compilation failed',
      });

      const result = await swift_package_runLogic(
        {
          packagePath: '/test/package',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: '❌ Swift executable failed.' },
          { type: 'text', text: '(no output)' },
          { type: 'text', text: 'Errors:\nCompilation failed' },
        ],
      });
    });

    it('should handle executor error', async () => {
      const mockExecutor = createMockExecutor(new Error('Command not found'));

      const result = await swift_package_runLogic(
        {
          packagePath: '/test/package',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Failed to execute swift run\nDetails: Command not found',
          },
        ],
        isError: true,
      });
    });
  });
});
