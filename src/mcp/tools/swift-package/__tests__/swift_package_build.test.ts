/**
 * Tests for swift_package_build plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockExecutor,
  createMockFileSystemExecutor,
  createNoopExecutor,
} from '../../../../utils/command.js';
import swiftPackageBuild, { swift_package_buildLogic } from '../swift_package_build.ts';

describe('swift_package_build plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(swiftPackageBuild.name).toBe('swift_package_build');
    });

    it('should have correct description', () => {
      expect(swiftPackageBuild.description).toBe('Builds a Swift Package with swift build');
    });

    it('should have handler function', () => {
      expect(typeof swiftPackageBuild.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(swiftPackageBuild.schema.packagePath.safeParse('/test/package').success).toBe(true);
      expect(swiftPackageBuild.schema.packagePath.safeParse('').success).toBe(true);

      // Test optional fields
      expect(swiftPackageBuild.schema.targetName.safeParse('MyTarget').success).toBe(true);
      expect(swiftPackageBuild.schema.targetName.safeParse(undefined).success).toBe(true);
      expect(swiftPackageBuild.schema.configuration.safeParse('debug').success).toBe(true);
      expect(swiftPackageBuild.schema.configuration.safeParse('release').success).toBe(true);
      expect(swiftPackageBuild.schema.configuration.safeParse(undefined).success).toBe(true);
      expect(swiftPackageBuild.schema.architectures.safeParse(['arm64']).success).toBe(true);
      expect(swiftPackageBuild.schema.architectures.safeParse(undefined).success).toBe(true);
      expect(swiftPackageBuild.schema.parseAsLibrary.safeParse(true).success).toBe(true);
      expect(swiftPackageBuild.schema.parseAsLibrary.safeParse(undefined).success).toBe(true);

      // Test invalid inputs
      expect(swiftPackageBuild.schema.packagePath.safeParse(null).success).toBe(false);
      expect(swiftPackageBuild.schema.configuration.safeParse('invalid').success).toBe(false);
      expect(swiftPackageBuild.schema.architectures.safeParse('not-array').success).toBe(false);
      expect(swiftPackageBuild.schema.parseAsLibrary.safeParse('yes').success).toBe(false);
    });
  });

  let executorCalls: any[] = [];

  beforeEach(() => {
    executorCalls = [];
  });

  describe('Command Generation Testing', () => {
    it('should build correct command for basic build', async () => {
      const executor = async (args: any, description: any, useShell: any, cwd: any) => {
        executorCalls.push({ args, description, useShell, cwd });
        return {
          success: true,
          output: 'Build succeeded',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await swift_package_buildLogic(
        {
          packagePath: '/test/package',
        },
        executor,
      );

      expect(executorCalls).toEqual([
        {
          args: ['swift', 'build', '--package-path', '/test/package'],
          description: 'Swift Package Build',
          useShell: true,
          cwd: undefined,
        },
      ]);
    });

    it('should build correct command with release configuration', async () => {
      const executor = async (args: any, description: any, useShell: any, cwd: any) => {
        executorCalls.push({ args, description, useShell, cwd });
        return {
          success: true,
          output: 'Build succeeded',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await swift_package_buildLogic(
        {
          packagePath: '/test/package',
          configuration: 'release',
        },
        executor,
      );

      expect(executorCalls).toEqual([
        {
          args: ['swift', 'build', '--package-path', '/test/package', '-c', 'release'],
          description: 'Swift Package Build',
          useShell: true,
          cwd: undefined,
        },
      ]);
    });

    it('should build correct command with all parameters', async () => {
      const executor = async (args: any, description: any, useShell: any, cwd: any) => {
        executorCalls.push({ args, description, useShell, cwd });
        return {
          success: true,
          output: 'Build succeeded',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await swift_package_buildLogic(
        {
          packagePath: '/test/package',
          targetName: 'MyTarget',
          configuration: 'release',
          architectures: ['arm64', 'x86_64'],
          parseAsLibrary: true,
        },
        executor,
      );

      expect(executorCalls).toEqual([
        {
          args: [
            'swift',
            'build',
            '--package-path',
            '/test/package',
            '-c',
            'release',
            '--target',
            'MyTarget',
            '--arch',
            'arm64',
            '--arch',
            'x86_64',
            '-Xswiftc',
            '-parse-as-library',
          ],
          description: 'Swift Package Build',
          useShell: true,
          cwd: undefined,
        },
      ]);
    });
  });

  describe('Response Logic Testing', () => {
    it('should return validation error for missing packagePath', async () => {
      const result = await swift_package_buildLogic({}, createNoopExecutor());

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'packagePath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return successful build response', async () => {
      const executor = createMockExecutor({
        success: true,
        output: 'Build complete.',
      });

      const result = await swift_package_buildLogic(
        {
          packagePath: '/test/package',
        },
        executor,
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: '✅ Swift package build succeeded.' },
          {
            type: 'text',
            text: '💡 Next: Run tests with swift_package_test or execute with swift_package_run',
          },
          { type: 'text', text: 'Build complete.' },
        ],
        isError: false,
      });
    });

    it('should return error response for build failure', async () => {
      const executor = createMockExecutor({
        success: false,
        error: 'Compilation failed: error in main.swift',
      });

      const result = await swift_package_buildLogic(
        {
          packagePath: '/test/package',
        },
        executor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Swift package build failed\nDetails: Compilation failed: error in main.swift',
          },
        ],
        isError: true,
      });
    });

    it('should handle spawn error', async () => {
      const executor = async () => {
        throw new Error('spawn ENOENT');
      };

      const result = await swift_package_buildLogic(
        {
          packagePath: '/test/package',
        },
        executor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Failed to execute swift build\nDetails: spawn ENOENT',
          },
        ],
        isError: true,
      });
    });

    it('should handle successful build with parameters', async () => {
      const executor = createMockExecutor({
        success: true,
        output: 'Build complete.',
      });

      const result = await swift_package_buildLogic(
        {
          packagePath: '/test/package',
          targetName: 'MyTarget',
          configuration: 'release',
          architectures: ['arm64', 'x86_64'],
          parseAsLibrary: true,
        },
        executor,
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: '✅ Swift package build succeeded.' },
          {
            type: 'text',
            text: '💡 Next: Run tests with swift_package_test or execute with swift_package_run',
          },
          { type: 'text', text: 'Build complete.' },
        ],
        isError: false,
      });
    });
  });
});
