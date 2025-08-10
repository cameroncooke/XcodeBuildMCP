/**
 * Tests for get_macos_app_path plugin (unified project/workspace)
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect } from 'vitest';
import { createMockExecutor, type CommandExecutor } from '../../../../utils/command.js';
import getMacosAppPath, { get_macos_app_pathLogic } from '../get_macos_app_path.js';

describe('get_macos_app_path plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(getMacosAppPath.name).toBe('get_macos_app_path');
    });

    it('should have correct description', () => {
      expect(getMacosAppPath.description).toBe(
        "Gets the app bundle path for a macOS application using either a project or workspace. Provide exactly one of projectPath or workspacePath. Example: get_macos_app_path({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof getMacosAppPath.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test workspace path
      expect(
        getMacosAppPath.schema.workspacePath.safeParse('/path/to/MyProject.xcworkspace').success,
      ).toBe(true);
      // Test project path
      expect(
        getMacosAppPath.schema.projectPath.safeParse('/path/to/MyProject.xcodeproj').success,
      ).toBe(true);
      expect(getMacosAppPath.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(getMacosAppPath.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(getMacosAppPath.schema.arch.safeParse('arm64').success).toBe(true);
      expect(getMacosAppPath.schema.arch.safeParse('x86_64').success).toBe(true);
      expect(getMacosAppPath.schema.derivedDataPath.safeParse('/path/to/derived').success).toBe(
        true,
      );
      expect(getMacosAppPath.schema.extraArgs.safeParse(['--verbose']).success).toBe(true);

      // Test invalid inputs
      expect(getMacosAppPath.schema.workspacePath.safeParse(null).success).toBe(false);
      expect(getMacosAppPath.schema.projectPath.safeParse(null).success).toBe(false);
      expect(getMacosAppPath.schema.scheme.safeParse(null).success).toBe(false);
      expect(getMacosAppPath.schema.arch.safeParse('invalidArch').success).toBe(false);
    });
  });

  describe('XOR Validation', () => {
    it('should error when neither projectPath nor workspacePath provided', async () => {
      const result = await getMacosAppPath.handler({
        scheme: 'MyScheme',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Either projectPath or workspacePath is required');
    });

    it('should error when both projectPath and workspacePath provided', async () => {
      const result = await getMacosAppPath.handler({
        projectPath: '/path/to/project.xcodeproj',
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('mutually exclusive');
    });
  });

  describe('Command Generation', () => {
    it('should generate correct command with workspace minimal parameters', async () => {
      // Manual call tracking for command verification
      const calls: any[] = [];
      const mockExecutor: CommandExecutor = async (...args) => {
        calls.push(args);
        return {
          success: true,
          output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const args = {
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      };

      await get_macos_app_pathLogic(args, mockExecutor);

      // Verify command generation with manual call tracking
      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual([
        [
          'xcodebuild',
          '-showBuildSettings',
          '-workspace',
          '/path/to/MyProject.xcworkspace',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Debug',
          '-destination',
          'platform=macOS',
        ],
        'Get App Path',
        true,
        undefined,
      ]);
    });

    it('should generate correct command with project minimal parameters', async () => {
      // Manual call tracking for command verification
      const calls: any[] = [];
      const mockExecutor: CommandExecutor = async (...args) => {
        calls.push(args);
        return {
          success: true,
          output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const args = {
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      };

      await get_macos_app_pathLogic(args, mockExecutor);

      // Verify command generation with manual call tracking
      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual([
        [
          'xcodebuild',
          '-showBuildSettings',
          '-project',
          '/path/to/MyProject.xcodeproj',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Debug',
        ],
        'Get App Path',
        true,
        undefined,
      ]);
    });

    it('should generate correct command with workspace all parameters', async () => {
      // Manual call tracking for command verification
      const calls: any[] = [];
      const mockExecutor: CommandExecutor = async (...args) => {
        calls.push(args);
        return {
          success: true,
          output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const args = {
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Release',
        arch: 'arm64',
      };

      await get_macos_app_pathLogic(args, mockExecutor);

      // Verify command generation with manual call tracking
      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual([
        [
          'xcodebuild',
          '-showBuildSettings',
          '-workspace',
          '/path/to/MyProject.xcworkspace',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Release',
          '-destination',
          'platform=macOS,arch=arm64',
        ],
        'Get App Path',
        true,
        undefined,
      ]);
    });

    it('should generate correct command with x86_64 architecture', async () => {
      // Manual call tracking for command verification
      const calls: any[] = [];
      const mockExecutor: CommandExecutor = async (...args) => {
        calls.push(args);
        return {
          success: true,
          output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const args = {
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Debug',
        arch: 'x86_64',
      };

      await get_mac_app_path_wsLogic(args, mockExecutor);

      // Verify command generation with manual call tracking
      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual([
        [
          'xcodebuild',
          '-showBuildSettings',
          '-workspace',
          '/path/to/MyProject.xcworkspace',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Debug',
          '-destination',
          'platform=macOS,arch=x86_64',
        ],
        'Get App Path',
        true,
        undefined,
      ]);
    });

    it('should generate correct command with project all parameters', async () => {
      // Manual call tracking for command verification
      const calls: any[] = [];
      const mockExecutor: CommandExecutor = async (...args) => {
        calls.push(args);
        return {
          success: true,
          output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const args = {
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
        configuration: 'Release',
        derivedDataPath: '/path/to/derived',
        extraArgs: ['--verbose'],
      };

      await get_macos_app_pathLogic(args, mockExecutor);

      // Verify command generation with manual call tracking
      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual([
        [
          'xcodebuild',
          '-showBuildSettings',
          '-project',
          '/path/to/MyProject.xcodeproj',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Release',
          '-derivedDataPath',
          '/path/to/derived',
          '--verbose',
        ],
        'Get App Path',
        true,
        undefined,
      ]);
    });

    it('should use default configuration when not provided', async () => {
      // Manual call tracking for command verification
      const calls: any[] = [];
      const mockExecutor: CommandExecutor = async (...args) => {
        calls.push(args);
        return {
          success: true,
          output: 'BUILT_PRODUCTS_DIR = /path/to/build\nFULL_PRODUCT_NAME = MyApp.app',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      const args = {
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
        arch: 'arm64',
      };

      await get_macos_app_pathLogic(args, mockExecutor);

      // Verify command generation with manual call tracking
      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual([
        [
          'xcodebuild',
          '-showBuildSettings',
          '-workspace',
          '/path/to/MyProject.xcworkspace',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Debug',
          '-destination',
          'platform=macOS,arch=arm64',
        ],
        'Get App Path',
        true,
        undefined,
      ]);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return Zod validation error for missing scheme', async () => {
      const result = await getMacosAppPath.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: Parameter validation failed\nDetails: Invalid parameters:\nscheme: Required',
          },
        ],
        isError: true,
      });
    });

    it('should return exact successful app path response with workspace', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: `
BUILT_PRODUCTS_DIR = /Users/test/Library/Developer/Xcode/DerivedData/MyApp-abc123/Build/Products/Debug
FULL_PRODUCT_NAME = MyApp.app
        `,
      });

      const result = await get_macos_app_pathLogic(
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
            text: '✅ App path retrieved successfully: /Users/test/Library/Developer/Xcode/DerivedData/MyApp-abc123/Build/Products/Debug/MyApp.app',
          },
          {
            type: 'text',
            text: 'Next Steps:\n1. Get bundle ID: get_app_bundle_id({ appPath: "/Users/test/Library/Developer/Xcode/DerivedData/MyApp-abc123/Build/Products/Debug/MyApp.app" })\n2. Launch app: launch_mac_app({ appPath: "/Users/test/Library/Developer/Xcode/DerivedData/MyApp-abc123/Build/Products/Debug/MyApp.app" })',
          },
        ],
      });
    });

    it('should return exact successful app path response with project', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: `
BUILT_PRODUCTS_DIR = /Users/test/Library/Developer/Xcode/DerivedData/MyApp-abc123/Build/Products/Debug
FULL_PRODUCT_NAME = MyApp.app
        `,
      });

      const result = await get_macos_app_pathLogic(
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
            text: '✅ App path retrieved successfully: /Users/test/Library/Developer/Xcode/DerivedData/MyApp-abc123/Build/Products/Debug/MyApp.app',
          },
          {
            type: 'text',
            text: 'Next Steps:\n1. Get bundle ID: get_app_bundle_id({ appPath: "/Users/test/Library/Developer/Xcode/DerivedData/MyApp-abc123/Build/Products/Debug/MyApp.app" })\n2. Launch app: launch_mac_app({ appPath: "/Users/test/Library/Developer/Xcode/DerivedData/MyApp-abc123/Build/Products/Debug/MyApp.app" })',
          },
        ],
      });
    });

    it('should return exact build settings failure response', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'error: No such scheme',
      });

      const result = await get_macos_app_pathLogic(
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
            text: 'Error: Failed to get macOS app path\nDetails: error: No such scheme',
          },
        ],
        isError: true,
      });
    });

    it('should return exact missing build settings response', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'OTHER_SETTING = value',
      });

      const result = await get_macos_app_pathLogic(
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
            text: 'Error: Failed to get macOS app path\nDetails: Could not extract app path from build settings',
          },
        ],
        isError: true,
      });
    });

    it('should return exact exception handling response', async () => {
      const mockExecutor = async () => {
        throw new Error('Network error');
      };

      const result = await get_macos_app_pathLogic(
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
            text: 'Error: Failed to get macOS app path\nDetails: Network error',
          },
        ],
        isError: true,
      });
    });
  });
});
