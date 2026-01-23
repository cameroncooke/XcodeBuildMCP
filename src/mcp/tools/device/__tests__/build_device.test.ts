/**
 * Tests for build_device plugin (unified)
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as z from 'zod';
import {
  createMockCommandResponse,
  createMockExecutor,
  createNoopExecutor,
} from '../../../../test-utils/mock-executors.ts';
import buildDevice, { buildDeviceLogic } from '../build_device.ts';
import { sessionStore } from '../../../../utils/session-store.ts';

describe('build_device plugin', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildDevice.name).toBe('build_device');
    });

    it('should have correct description', () => {
      expect(buildDevice.description).toBe('Build for device.');
    });

    it('should have handler function', () => {
      expect(typeof buildDevice.handler).toBe('function');
    });

    it('should expose only optional build-tuning fields in public schema', () => {
      const schema = z.strictObject(buildDevice.schema);
      expect(schema.safeParse({}).success).toBe(true);
      expect(
        schema.safeParse({ derivedDataPath: '/path/to/derived-data', extraArgs: [] }).success,
      ).toBe(true);
      expect(schema.safeParse({ projectPath: '/path/to/MyProject.xcodeproj' }).success).toBe(false);

      const schemaKeys = Object.keys(buildDevice.schema).sort();
      expect(schemaKeys).toEqual(['derivedDataPath', 'extraArgs', 'preferXcodebuild']);
    });
  });

  describe('XOR Validation', () => {
    it('should error when neither projectPath nor workspacePath provided', async () => {
      const result = await buildDevice.handler({
        scheme: 'MyScheme',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('Provide a project or workspace');
    });

    it('should error when both projectPath and workspacePath provided', async () => {
      const result = await buildDevice.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('Mutually exclusive parameters provided');
    });
  });

  describe('Parameter Validation (via Handler)', () => {
    it('should return Zod validation error for missing scheme', async () => {
      const result = await buildDevice.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('scheme is required');
    });

    it('should return Zod validation error for invalid parameter types', async () => {
      const result = await buildDevice.handler({
        projectPath: 123, // Should be string
        scheme: 'MyScheme',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('projectPath');
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
        logPrefix?: string;
        silent?: boolean;
        opts: { cwd?: string } | undefined;
      }> = [];

      const stubExecutor = async (
        args: string[],
        logPrefix?: string,
        silent?: boolean,
        opts?: { cwd?: string },
        _detached?: boolean,
      ) => {
        commandCalls.push({ args, logPrefix, silent, opts });
        return createMockCommandResponse({
          success: true,
          output: 'Build succeeded',
          error: undefined,
        });
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
        opts: { cwd: '/path/to' },
      });
    });

    it('should verify command generation with mock executor', async () => {
      const commandCalls: Array<{
        args: string[];
        logPrefix?: string;
        silent?: boolean;
        opts: { cwd?: string } | undefined;
      }> = [];

      const stubExecutor = async (
        args: string[],
        logPrefix?: string,
        silent?: boolean,
        opts?: { cwd?: string },
        _detached?: boolean,
      ) => {
        commandCalls.push({ args, logPrefix, silent, opts });
        return createMockCommandResponse({
          success: true,
          output: 'Build succeeded',
          error: undefined,
        });
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
        opts: { cwd: '/path/to' },
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
            text: "Next Steps:\n1. Get app path: get_device_app_path({ scheme: 'MyScheme' })\n2. Get bundle ID: get_app_bundle_id({ appPath: 'PATH_FROM_STEP_1' })\n3. Launch: launch_app_device({ bundleId: 'BUNDLE_ID_FROM_STEP_2' })",
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
        logPrefix?: string;
        silent?: boolean;
        opts: { cwd?: string } | undefined;
      }> = [];

      const stubExecutor = async (
        args: string[],
        logPrefix?: string,
        silent?: boolean,
        opts?: { cwd?: string },
        _detached?: boolean,
      ) => {
        commandCalls.push({ args, logPrefix, silent, opts });
        return createMockCommandResponse({
          success: true,
          output: 'Build succeeded',
          error: undefined,
        });
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
        opts: { cwd: '/path/to' },
      });
    });
  });
});
