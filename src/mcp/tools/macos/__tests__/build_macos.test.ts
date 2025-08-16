/**
 * Tests for build_macos plugin (unified)
 * Following CLAUDE.md testing standards with literal validation
 * Using pure dependency injection for deterministic testing
 * NO VITEST MOCKING ALLOWED - Only createMockExecutor and createMockFileSystemExecutor
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';
import buildMacOS, { buildMacOSLogic } from '../build_macos.ts';

describe('build_macos plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(buildMacOS.name).toBe('build_macos');
    });

    it('should have correct description', () => {
      expect(buildMacOS.description).toBe(
        "Builds a macOS app using xcodebuild from a project or workspace. Provide exactly one of projectPath or workspacePath. Example: build_macos({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof buildMacOS.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(buildMacOS.schema.projectPath.safeParse('/path/to/MyProject.xcodeproj').success).toBe(
        true,
      );
      expect(
        buildMacOS.schema.workspacePath.safeParse('/path/to/MyProject.xcworkspace').success,
      ).toBe(true);
      expect(buildMacOS.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(buildMacOS.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(buildMacOS.schema.derivedDataPath.safeParse('/path/to/derived-data').success).toBe(
        true,
      );
      expect(buildMacOS.schema.arch.safeParse('arm64').success).toBe(true);
      expect(buildMacOS.schema.arch.safeParse('x86_64').success).toBe(true);
      expect(buildMacOS.schema.extraArgs.safeParse(['--arg1', '--arg2']).success).toBe(true);
      expect(buildMacOS.schema.preferXcodebuild.safeParse(true).success).toBe(true);

      // Test invalid inputs
      expect(buildMacOS.schema.projectPath.safeParse(null).success).toBe(false);
      expect(buildMacOS.schema.workspacePath.safeParse(null).success).toBe(false);
      expect(buildMacOS.schema.scheme.safeParse(null).success).toBe(false);
      expect(buildMacOS.schema.arch.safeParse('invalidArch').success).toBe(false);
      expect(buildMacOS.schema.extraArgs.safeParse('not-array').success).toBe(false);
      expect(buildMacOS.schema.preferXcodebuild.safeParse('not-boolean').success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact successful build response', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILD SUCCEEDED',
      });

      const result = await buildMacOSLogic(
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
            text: '✅ macOS Build build succeeded for scheme MyScheme.',
          },
          {
            type: 'text',
            text: "Next Steps:\n1. Get app path: get_mac_app_path({ scheme: 'MyScheme' })\n2. Get bundle ID: get_mac_bundle_id({ appPath: 'PATH_FROM_STEP_1' })\n3. Launch: launch_mac_app({ appPath: 'PATH_FROM_STEP_1' })",
          },
        ],
      });
    });

    it('should return exact build failure response', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'error: Compilation error in main.swift',
      });

      const result = await buildMacOSLogic(
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

      const result = await buildMacOSLogic(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
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
            text: "Next Steps:\n1. Get app path: get_mac_app_path({ scheme: 'MyScheme' })\n2. Get bundle ID: get_mac_bundle_id({ appPath: 'PATH_FROM_STEP_1' })\n3. Launch: launch_mac_app({ appPath: 'PATH_FROM_STEP_1' })",
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

      const result = await buildMacOSLogic(
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

      const result = await buildMacOSLogic(
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

      const result = await buildMacOSLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
        },
        spyExecutor,
      );

      expect(capturedCommand).toEqual([
        'xcodebuild',
        '-project',
        '/path/to/project.xcodeproj',
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

      const result = await buildMacOSLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
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
        '-project',
        '/path/to/project.xcodeproj',
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

    it('should generate correct xcodebuild command with only derivedDataPath', async () => {
      let capturedCommand: string[] = [];
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      // Override the executor to capture the command
      const spyExecutor = async (command: string[]) => {
        capturedCommand = command;
        return mockExecutor(command);
      };

      const result = await buildMacOSLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          derivedDataPath: '/custom/derived/data',
        },
        spyExecutor,
      );

      expect(capturedCommand).toEqual([
        'xcodebuild',
        '-project',
        '/path/to/project.xcodeproj',
        '-scheme',
        'MyScheme',
        '-configuration',
        'Debug',
        '-skipMacroValidation',
        '-destination',
        'platform=macOS',
        '-derivedDataPath',
        '/custom/derived/data',
        'build',
      ]);
    });

    it('should generate correct xcodebuild command with arm64 architecture only', async () => {
      let capturedCommand: string[] = [];
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      // Override the executor to capture the command
      const spyExecutor = async (command: string[]) => {
        capturedCommand = command;
        return mockExecutor(command);
      };

      const result = await buildMacOSLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          arch: 'arm64',
        },
        spyExecutor,
      );

      expect(capturedCommand).toEqual([
        'xcodebuild',
        '-project',
        '/path/to/project.xcodeproj',
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

      const result = await buildMacOSLogic(
        {
          projectPath: '/Users/dev/My Project/MyProject.xcodeproj',
          scheme: 'MyScheme',
        },
        spyExecutor,
      );

      expect(capturedCommand).toEqual([
        'xcodebuild',
        '-project',
        '/Users/dev/My Project/MyProject.xcodeproj',
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

    it('should generate correct xcodebuild workspace command with minimal parameters', async () => {
      let capturedCommand: string[] = [];
      const mockExecutor = createMockExecutor({ success: true, output: 'BUILD SUCCEEDED' });

      // Override the executor to capture the command
      const spyExecutor = async (command: string[]) => {
        capturedCommand = command;
        return mockExecutor(command);
      };

      const result = await buildMacOSLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
        },
        spyExecutor,
      );

      expect(capturedCommand).toEqual([
        'xcodebuild',
        '-workspace',
        '/path/to/workspace.xcworkspace',
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

  describe('XOR Validation', () => {
    it('should error when neither projectPath nor workspacePath provided', async () => {
      const result = await buildMacOS.handler({ scheme: 'MyScheme' });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Either projectPath or workspacePath is required');
    });

    it('should error when both projectPath and workspacePath provided', async () => {
      const result = await buildMacOS.handler({
        projectPath: '/path/to/project.xcodeproj',
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('mutually exclusive');
    });

    it('should succeed with valid projectPath', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILD SUCCEEDED',
      });

      const result = await buildMacOSLogic(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result.isError).toBeUndefined();
    });

    it('should succeed with valid workspacePath', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILD SUCCEEDED',
      });

      const result = await buildMacOSLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result.isError).toBeUndefined();
    });
  });
});
