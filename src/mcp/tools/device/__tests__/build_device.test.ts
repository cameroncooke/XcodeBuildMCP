/**
 * Tests for build_device plugin (unified)
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect } from 'vitest';
import { createMockExecutor, createNoopExecutor } from '../../../../utils/command.js';
import buildDevice, { buildDeviceLogic } from '../build_device.ts';

describe('build_device plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildDevice.name).toBe('build_device');
    });

    it('should have correct description', () => {
      expect(buildDevice.description).toBe(
        "Builds an app from a project or workspace for a physical Apple device. Provide exactly one of projectPath or workspacePath. Example: build_device({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof buildDevice.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(buildDevice.schema.projectPath.safeParse('/path/to/MyProject.xcodeproj').success).toBe(
        true,
      );
      expect(
        buildDevice.schema.workspacePath.safeParse('/path/to/MyProject.xcworkspace').success,
      ).toBe(true);
      expect(buildDevice.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(buildDevice.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(buildDevice.schema.derivedDataPath.safeParse('/path/to/derived-data').success).toBe(
        true,
      );
      expect(buildDevice.schema.extraArgs.safeParse(['--arg1', '--arg2']).success).toBe(true);
      expect(buildDevice.schema.preferXcodebuild.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(buildDevice.schema.projectPath.safeParse(null).success).toBe(false);
      expect(buildDevice.schema.workspacePath.safeParse(null).success).toBe(false);
      expect(buildDevice.schema.scheme.safeParse(null).success).toBe(false);
      expect(buildDevice.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(buildDevice.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
    });
  });

  describe('XOR Validation', () => {
    it('should error when neither projectPath nor workspacePath provided', async () => {
      const result = await buildDevice.handler({
        scheme: 'MyScheme',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Either projectPath or workspacePath is required');
    });

    it('should error when both projectPath and workspacePath provided', async () => {
      const result = await buildDevice.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('mutually exclusive');
    });
  });

  describe('Parameter Validation (via Handler)', () => {
    it('should return Zod validation error for missing scheme', async () => {
      const result = await buildDevice.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('scheme');
      expect(result.content[0].text).toContain('Required');
    });

    it('should return Zod validation error for invalid parameter types', async () => {
      const result = await buildDevice.handler({
        projectPath: 123, // Should be string
        scheme: 'MyScheme',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should pass validation and execute successfully with valid project parameters', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Build succeeded',
      });

      const result = await buildDeviceLogic(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(2);
      expect(result.content[0].text).toContain('✅ iOS Device Build build succeeded');
    });

    it('should pass validation and execute successfully with valid workspace parameters', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Build succeeded',
      });

      const result = await buildDeviceLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(2);
      expect(result.content[0].text).toContain('✅ iOS Device Build build succeeded');
    });

    it('should verify workspace command generation with mock executor', async () => {
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

      await buildDeviceLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        stubExecutor,
      );

      expect(commandCalls).toHaveLength(1);
      expect(commandCalls[0]).toEqual({
        args: [
          'xcodebuild',
          '-workspace',
          '/path/to/MyProject.xcworkspace',
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

      await buildDeviceLogic(
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

      const result = await buildDeviceLogic(
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
            text: 'Next Steps:\n1. Get App Path: get_device_app_path\n2. Get Bundle ID: get_ios_bundle_id',
          },
        ],
      });
    });

    it('should return exact build failure response', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Compilation error',
      });

      const result = await buildDeviceLogic(
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

      await buildDeviceLogic(
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
