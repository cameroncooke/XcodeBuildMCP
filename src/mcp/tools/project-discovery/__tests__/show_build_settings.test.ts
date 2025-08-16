import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';
import plugin, { showBuildSettingsLogic } from '../show_build_settings.ts';

describe('show_build_settings plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(plugin.name).toBe('show_build_settings');
    });

    it('should have correct description', () => {
      expect(plugin.description).toBe(
        "Shows build settings from either a project or workspace using xcodebuild. Provide exactly one of projectPath or workspacePath, plus scheme. Example: show_build_settings({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof plugin.handler).toBe('function');
    });

    it('should have schema object', () => {
      expect(plugin.schema).toBeDefined();
      expect(typeof plugin.schema).toBe('object');
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should execute with valid parameters', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Mock build settings output',
        error: undefined,
        process: { pid: 12345 },
      });

      const result = await showBuildSettingsLogic(
        { projectPath: '/valid/path.xcodeproj', scheme: 'MyScheme' },
        mockExecutor,
      );
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('✅ Build settings for scheme MyScheme:');
    });

    it('should test Zod validation through handler', async () => {
      // Test the actual tool handler which includes Zod validation
      const result = await plugin.handler({
        projectPath: null,
        scheme: 'MyScheme',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('projectPath');
    });

    it('should return success with build settings', async () => {
      const calls: any[] = [];
      const mockExecutor = createMockExecutor({
        success: true,
        output: `Build settings from command line:
    ARCHS = arm64
    BUILD_DIR = /Users/dev/Build/Products
    CONFIGURATION = Debug
    DEVELOPMENT_TEAM = ABC123DEF4
    PRODUCT_BUNDLE_IDENTIFIER = com.example.MyApp
    PRODUCT_NAME = MyApp
    SUPPORTED_PLATFORMS = iphoneos iphonesimulator`,
        error: undefined,
        process: { pid: 12345 },
      });

      // Wrap mockExecutor to track calls
      const wrappedExecutor = (...args: any[]) => {
        calls.push(args);
        return mockExecutor(...args);
      };

      const result = await showBuildSettingsLogic(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
        },
        wrappedExecutor,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual([
        [
          'xcodebuild',
          '-showBuildSettings',
          '-project',
          '/path/to/MyProject.xcodeproj',
          '-scheme',
          'MyScheme',
        ],
        'Show Build Settings',
        true,
      ]);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Build settings for scheme MyScheme:',
          },
          {
            type: 'text',
            text: `Build settings from command line:
    ARCHS = arm64
    BUILD_DIR = /Users/dev/Build/Products
    CONFIGURATION = Debug
    DEVELOPMENT_TEAM = ABC123DEF4
    PRODUCT_BUNDLE_IDENTIFIER = com.example.MyApp
    PRODUCT_NAME = MyApp
    SUPPORTED_PLATFORMS = iphoneos iphonesimulator`,
          },
        ],
        isError: false,
      });
    });

    it('should return error when command fails', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Scheme not found',
        process: { pid: 12345 },
      });

      const result = await showBuildSettingsLogic(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'InvalidScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Failed to show build settings: Scheme not found' }],
        isError: true,
      });
    });

    it('should handle Error objects in catch blocks', async () => {
      const mockExecutor = async () => {
        throw new Error('Command execution failed');
      };

      const result = await showBuildSettingsLogic(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error showing build settings: Command execution failed' }],
        isError: true,
      });
    });
  });

  describe('XOR Validation', () => {
    it('should error when neither projectPath nor workspacePath provided', async () => {
      const result = await plugin.handler({
        scheme: 'MyScheme',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Either projectPath or workspacePath is required');
    });

    it('should error when both projectPath and workspacePath provided', async () => {
      const result = await plugin.handler({
        projectPath: '/path/project.xcodeproj',
        workspacePath: '/path/workspace.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('mutually exclusive');
    });

    it('should work with projectPath only', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Mock build settings output',
      });

      const result = await showBuildSettingsLogic(
        { projectPath: '/valid/path.xcodeproj', scheme: 'MyScheme' },
        mockExecutor,
      );

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('✅ Build settings for scheme MyScheme:');
    });

    it('should work with workspacePath only', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Mock build settings output',
      });

      const result = await showBuildSettingsLogic(
        { workspacePath: '/valid/path.xcworkspace', scheme: 'MyScheme' },
        mockExecutor,
      );

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('✅ Build settings retrieved successfully');
    });
  });

  describe('showBuildSettingsLogic function', () => {
    it('should return success with build settings', async () => {
      const calls: any[] = [];
      const mockExecutor = createMockExecutor({
        success: true,
        output: `Build settings from command line:
    ARCHS = arm64
    BUILD_DIR = /Users/dev/Build/Products
    CONFIGURATION = Debug
    DEVELOPMENT_TEAM = ABC123DEF4
    PRODUCT_BUNDLE_IDENTIFIER = com.example.MyApp
    PRODUCT_NAME = MyApp
    SUPPORTED_PLATFORMS = iphoneos iphonesimulator`,
        error: undefined,
        process: { pid: 12345 },
      });

      // Wrap mockExecutor to track calls
      const wrappedExecutor = (...args: any[]) => {
        calls.push(args);
        return mockExecutor(...args);
      };

      const result = await showBuildSettingsLogic(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
        },
        wrappedExecutor,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual([
        [
          'xcodebuild',
          '-showBuildSettings',
          '-project',
          '/path/to/MyProject.xcodeproj',
          '-scheme',
          'MyScheme',
        ],
        'Show Build Settings',
        true,
      ]);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Build settings for scheme MyScheme:',
          },
          {
            type: 'text',
            text: `Build settings from command line:
    ARCHS = arm64
    BUILD_DIR = /Users/dev/Build/Products
    CONFIGURATION = Debug
    DEVELOPMENT_TEAM = ABC123DEF4
    PRODUCT_BUNDLE_IDENTIFIER = com.example.MyApp
    PRODUCT_NAME = MyApp
    SUPPORTED_PLATFORMS = iphoneos iphonesimulator`,
          },
        ],
        isError: false,
      });
    });

    it('should return error when command fails', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Scheme not found',
        process: { pid: 12345 },
      });

      const result = await showBuildSettingsLogic(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'InvalidScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Failed to show build settings: Scheme not found' }],
        isError: true,
      });
    });

    it('should handle Error objects in catch blocks', async () => {
      const mockExecutor = async () => {
        throw new Error('Command execution failed');
      };

      const result = await showBuildSettingsLogic(
        {
          projectPath: '/path/to/MyProject.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error showing build settings: Command execution failed' }],
        isError: true,
      });
    });
  });
});
