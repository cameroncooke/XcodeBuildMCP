/**
 * Tests for build_dev_proj plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect } from 'vitest';
import { createMockExecutor, createNoopExecutor } from '../../../utils/command.js';
import buildDevProj, { build_dev_projLogic } from '../build_dev_proj.ts';

describe('build_dev_proj plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildDevProj.name).toBe('build_dev_proj');
    });

    it('should have correct description', () => {
      expect(buildDevProj.description).toBe(
        "Builds an app from a project file for a physical Apple device. IMPORTANT: Requires projectPath and scheme. Example: build_dev_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof buildDevProj.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        buildDevProj.schema.projectPath.safeParse('/path/to/MyProject.xcodeproj').success,
      ).toBe(true);
      expect(buildDevProj.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(buildDevProj.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(buildDevProj.schema.derivedDataPath.safeParse('/path/to/derived-data').success).toBe(
        true,
      );
      expect(buildDevProj.schema.extraArgs.safeParse(['--arg1', '--arg2']).success).toBe(true);
      expect(buildDevProj.schema.preferXcodebuild.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(buildDevProj.schema.projectPath.safeParse(null).success).toBe(false);
      expect(buildDevProj.schema.scheme.safeParse(null).success).toBe(false);
      expect(buildDevProj.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(buildDevProj.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact validation failure response for missing projectPath', async () => {
      const result = await build_dev_projLogic(
        {
          projectPath: null,
          scheme: 'MyScheme',
        },
        createNoopExecutor(),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return exact validation failure response for missing scheme', async () => {
      const result = await build_dev_projLogic(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: null,
        },
        createNoopExecutor(),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should verify command generation with mock executor', async () => {
      const commandCalls: Array<{
        args: string[];
        logPrefix: string;
        silent: boolean;
        timeout: number | undefined;
      }> = [];

      const stubExecutor = async (
        args: string[],
        logPrefix: string,
        silent: boolean,
        timeout?: number,
      ) => {
        commandCalls.push({ args, logPrefix, silent, timeout });
        return {
          success: true,
          output: 'Build succeeded',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await build_dev_projLogic(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
        },
        stubExecutor,
      );

      expect(commandCalls).toHaveLength(1);
      expect(commandCalls[0]).toEqual({
        args: [
          'xcodebuild',
          '-project',
          '/path/to/MyProject.xcodeproj',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Debug',
          '-skipMacroValidation',
          '-destination',
          'generic/platform=iOS',
          'build',
        ],
        logPrefix: 'iOS Device Build',
        silent: true,
        timeout: undefined,
      });
    });

    it('should return exact successful build response', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Build succeeded',
      });

      const result = await build_dev_projLogic(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ iOS Device Build build succeeded for scheme MyScheme.',
          },
          {
            type: 'text',
            text: 'Next Steps:\n1. Get App Path: get_ios_device_app_path_project\n2. Get Bundle ID: get_ios_bundle_id',
          },
        ],
      });
    });

    it('should return exact build failure response', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Compilation error',
      });

      const result = await build_dev_projLogic(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ [stderr] Compilation error',
          },
          {
            type: 'text',
            text: '❌ iOS Device Build build failed for scheme MyScheme.',
          },
        ],
        isError: true,
      });
    });

    it('should include optional parameters in command', async () => {
      const commandCalls: Array<{
        args: string[];
        logPrefix: string;
        silent: boolean;
        timeout: number | undefined;
      }> = [];

      const stubExecutor = async (
        args: string[],
        logPrefix: string,
        silent: boolean,
        timeout?: number,
      ) => {
        commandCalls.push({ args, logPrefix, silent, timeout });
        return {
          success: true,
          output: 'Build succeeded',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await build_dev_projLogic(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
          configuration: 'Release',
          derivedDataPath: '/tmp/derived-data',
          extraArgs: ['--verbose'],
        },
        stubExecutor,
      );

      expect(commandCalls).toHaveLength(1);
      expect(commandCalls[0]).toEqual({
        args: [
          'xcodebuild',
          '-project',
          '/path/to/MyProject.xcodeproj',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Release',
          '-skipMacroValidation',
          '-destination',
          'generic/platform=iOS',
          '-derivedDataPath',
          '/tmp/derived-data',
          '--verbose',
          'build',
        ],
        logPrefix: 'iOS Device Build',
        silent: true,
        timeout: undefined,
      });
    });
  });
});
