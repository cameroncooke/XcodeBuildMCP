/**
 * Tests for build_mac_ws plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import buildMacWs, { build_mac_wsLogic } from '../build_mac_ws.ts';

describe('build_mac_ws plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildMacWs.name).toBe('build_mac_ws');
    });

    it('should have correct description', () => {
      expect(buildMacWs.description).toBe('Builds a macOS app using xcodebuild from a workspace.');
    });

    it('should have handler function', () => {
      expect(typeof buildMacWs.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        buildMacWs.schema.workspacePath.safeParse('/path/to/MyProject.xcworkspace').success,
      ).toBe(true);
      expect(buildMacWs.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(buildMacWs.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(buildMacWs.schema.derivedDataPath.safeParse('/path/to/derived-data').success).toBe(
        true,
      );
      expect(buildMacWs.schema.arch.safeParse('arm64').success).toBe(true);
      expect(buildMacWs.schema.arch.safeParse('x86_64').success).toBe(true);
      expect(buildMacWs.schema.extraArgs.safeParse(['--arg1', '--arg2']).success).toBe(true);
      expect(buildMacWs.schema.preferXcodebuild.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(buildMacWs.schema.workspacePath.safeParse(null).success).toBe(false);
      expect(buildMacWs.schema.scheme.safeParse(null).success).toBe(false);
      expect(buildMacWs.schema.arch.safeParse('invalidArch').success).toBe(false);
      expect(buildMacWs.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(buildMacWs.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact successful build response', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILD SUCCEEDED',
      });

      const result = await build_mac_wsLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build build succeeded for scheme MyScheme.',
          },
          {
            type: 'text',
            text: 'Next Steps:\n1. Get App Path: get_macos_app_path_workspace\n2. Get Bundle ID: get_macos_bundle_id\n3. Launch App: launch_macos_app',
          },
        ],
      });
    });

    it('should return exact build failure response', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'error: Compilation error in main.swift',
      });

      const result = await build_mac_wsLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ [stderr] error: Compilation error in main.swift',
          },
          {
            type: 'text',
            text: '❌ macOS Build build failed for scheme MyScheme.',
          },
        ],
        isError: true,
      });
    });

    it('should return exact successful build response with optional parameters', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILD SUCCEEDED',
      });

      const result = await build_mac_wsLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Release',
          arch: 'arm64',
          derivedDataPath: '/path/to/derived-data',
          extraArgs: ['--verbose'],
          preferXcodebuild: true,
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS Build build succeeded for scheme MyScheme.',
          },
          {
            type: 'text',
            text: 'Next Steps:\n1. Get App Path: get_macos_app_path_workspace\n2. Get Bundle ID: get_macos_bundle_id\n3. Launch App: launch_macos_app',
          },
        ],
      });
    });

    it('should return exact exception handling response', async () => {
      // Create executor that throws error during command execution
      // This will be caught by executeXcodeBuildCommand's try-catch block
      const mockExecutor = async () => {
        throw new Error('Network error');
      };

      const result = await build_mac_wsLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during macOS Build build: Network error',
          },
        ],
        isError: true,
      });
    });

    it('should return exact spawn error handling response', async () => {
      // Create executor that throws spawn error during command execution
      // This will be caught by executeXcodeBuildCommand's try-catch block
      const mockExecutor = async () => {
        throw new Error('Spawn error');
      };

      const result = await build_mac_wsLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error during macOS Build build: Spawn error',
          },
        ],
        isError: true,
      });
    });
  });

  describe('Command Generation', () => {
    it('should generate correct xcodebuild command with minimal parameters', async () => {
      let capturedCommand: string[] = [];
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      // Override the executor to capture the command
      const spyExecutor = async (command: string[]) => {
        capturedCommand = command;
        return mockExecutor(command);
      };

      const result = await build_mac_wsLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        spyExecutor,
      );

      expect(capturedCommand).toEqual([
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
        'build',
      ]);
    });

    it('should generate correct xcodebuild command with all parameters', async () => {
      let capturedCommand: string[] = [];
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      // Override the executor to capture the command
      const spyExecutor = async (command: string[]) => {
        capturedCommand = command;
        return mockExecutor(command);
      };

      const result = await build_mac_wsLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Release',
          arch: 'x86_64',
          derivedDataPath: '/custom/derived',
          extraArgs: ['--verbose'],
          preferXcodebuild: true,
        },
        spyExecutor,
      );

      expect(capturedCommand).toEqual([
        'xcodebuild',
        '-workspace',
        '/path/to/MyProject.xcworkspace',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Release',
        '-skipMacroValidation',
        '-destination',
        'platform=macOS,arch=x86_64',
        '-derivedDataPath',
        '/custom/derived',
        '--verbose',
        'build',
      ]);
    });

    it('should generate correct xcodebuild command with arm64 architecture', async () => {
      let capturedCommand: string[] = [];
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      // Override the executor to capture the command
      const spyExecutor = async (command: string[]) => {
        capturedCommand = command;
        return mockExecutor(command);
      };

      const result = await build_mac_wsLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
          arch: 'arm64',
        },
        spyExecutor,
      );

      expect(capturedCommand).toEqual([
        'xcodebuild',
        '-workspace',
        '/path/to/MyProject.xcworkspace',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Debug',
        '-skipMacroValidation',
        '-destination',
        'platform=macOS,arch=arm64',
        'build',
      ]);
    });

    it('should handle paths with spaces in command generation', async () => {
      let capturedCommand: string[] = [];
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      // Override the executor to capture the command
      const spyExecutor = async (command: string[]) => {
        capturedCommand = command;
        return mockExecutor(command);
      };

      const result = await build_mac_wsLogic(
        {
          workspacePath: '/Users/dev/My Project/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        spyExecutor,
      );

      expect(capturedCommand).toEqual([
        'xcodebuild',
        '-workspace',
        '/Users/dev/My Project/MyProject.xcworkspace',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Debug',
        '-skipMacroValidation',
        '-destination',
        'platform=macOS',
        'build',
      ]);
    });
  });
});
