/**
 * Tests for get_mac_app_path_ws plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createMockExecutor, type CommandExecutor } from '../../../utils/command.js';
import getMacAppPathWs from '../get_mac_app_path_ws.ts';

describe('get_mac_app_path_ws plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(getMacAppPathWs.name).toBe('get_mac_app_path_ws');
    });

    it('should have correct description', () => {
      expect(getMacAppPathWs.description).toBe(
        "Gets the app bundle path for a macOS application using a workspace. IMPORTANT: Requires workspacePath and scheme. Example: get_mac_app_path_ws({ workspacePath: '/path/to/workspace', scheme: 'MyScheme' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof getMacAppPathWs.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        getMacAppPathWs.schema.workspacePath.safeParse('/path/to/MyProject.xcworkspace').success,
      ).toBe(true);
      expect(getMacAppPathWs.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(getMacAppPathWs.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(getMacAppPathWs.schema.arch.safeParse('arm64').success).toBe(true);
      expect(getMacAppPathWs.schema.arch.safeParse('x86_64').success).toBe(true);

      // Test invalid inputs
      expect(getMacAppPathWs.schema.workspacePath.safeParse(null).success).toBe(false);
      expect(getMacAppPathWs.schema.scheme.safeParse(null).success).toBe(false);
      expect(getMacAppPathWs.schema.arch.safeParse('invalidArch').success).toBe(false);
    });
  });

  describe('Command Generation', () => {
    it('should generate correct command with minimal parameters', async () => {
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

      await getMacAppPathWs.handler(args, mockExecutor);

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

    it('should generate correct command with all parameters', async () => {
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

      await getMacAppPathWs.handler(args, mockExecutor);

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

      await getMacAppPathWs.handler(args, mockExecutor);

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

      await getMacAppPathWs.handler(args, mockExecutor);

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
    it('should return exact validation error response for workspacePath', async () => {
      const result = await getMacAppPathWs.handler({
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return exact validation error response for scheme', async () => {
      const result = await getMacAppPathWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
      });

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
    it('should return exact successful app path response', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: `
BUILT_PRODUCTS_DIR = /Users/test/Library/Developer/Xcode/DerivedData/MyApp-abc123/Build/Products/Debug
FULL_PRODUCT_NAME = MyApp.app
        `,
      });

      const result = await getMacAppPathWs.handler(
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

    it('should return exact build settings failure response', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'error: No such scheme',
      });

      const result = await getMacAppPathWs.handler(
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
            text: 'Error retrieving app path: error: No such scheme',
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

      const result = await getMacAppPathWs.handler(
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
            text: 'Error retrieving app path: Could not extract app path from build settings',
          },
        ],
        isError: true,
      });
    });

    it('should return exact exception handling response', async () => {
      const mockExecutor = async () => {
        throw new Error('Network error');
      };

      const result = await getMacAppPathWs.handler(
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
            text: 'Error retrieving app path: Network error',
          },
        ],
        isError: true,
      });
    });
  });
});
