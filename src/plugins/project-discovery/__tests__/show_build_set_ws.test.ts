/**
 * Tests for show_build_set_ws plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect } from 'vitest';
import { createMockExecutor } from '../../../utils/command.js';
import plugin, { show_build_set_wsLogic } from '../show_build_set_ws.ts';

describe('show_build_set_ws plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(plugin.name).toBe('show_build_set_ws');
    });

    it('should have correct description', () => {
      expect(plugin.description).toBe(
        "Shows build settings from a workspace using xcodebuild. IMPORTANT: Requires workspacePath and scheme. Example: show_build_set_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof plugin.handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      expect(
        plugin.schema.safeParse({
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        }).success,
      ).toBe(true);
      expect(
        plugin.schema.safeParse({
          workspacePath: '/Users/dev/App.xcworkspace',
          scheme: 'AppScheme',
        }).success,
      ).toBe(true);
    });

    it('should validate schema with invalid inputs', () => {
      expect(plugin.schema.safeParse({}).success).toBe(false);
      expect(
        plugin.schema.safeParse({ workspacePath: '/path/to/workspace.xcworkspace' }).success,
      ).toBe(false);
      expect(plugin.schema.safeParse({ scheme: 'MyScheme' }).success).toBe(false);
      expect(plugin.schema.safeParse({ workspacePath: 123, scheme: 'MyScheme' }).success).toBe(
        false,
      );
      expect(
        plugin.schema.safeParse({ workspacePath: '/path/to/workspace.xcworkspace', scheme: 123 })
          .success,
      ).toBe(false);
    });
  });

  describe('Logic Function Behavior', () => {
    it('should handle missing workspacePath', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
        error: undefined,
        process: { pid: 12345 },
      });

      const result = await show_build_set_wsLogic({ scheme: 'MyScheme' }, mockExecutor);

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

    it('should handle missing scheme', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: '',
        error: undefined,
        process: { pid: 12345 },
      });

      const result = await show_build_set_wsLogic(
        { workspacePath: '/path/to/MyProject.xcworkspace' },
        mockExecutor,
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

      // Override to track calls
      const originalExecutor = mockExecutor;
      const trackingExecutor = async (...args: any[]) => {
        calls.push(args);
        return originalExecutor(...args);
      };

      const result = await show_build_set_wsLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        trackingExecutor,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual([
        [
          'xcodebuild',
          '-showBuildSettings',
          '-workspace',
          '/path/to/MyProject.xcworkspace',
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
            text: '✅ Build settings retrieved successfully',
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
          {
            type: 'text',
            text: `Next Steps:
- Build the workspace: macos_build_workspace({ workspacePath: "/path/to/MyProject.xcworkspace", scheme: "MyScheme" })
- For iOS: ios_simulator_build_by_name_workspace({ workspacePath: "/path/to/MyProject.xcworkspace", scheme: "MyScheme", simulatorName: "iPhone 16" })
- List schemes: list_schems_ws({ workspacePath: "/path/to/MyProject.xcworkspace" })`,
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

      const result = await show_build_set_wsLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'InvalidScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Failed to retrieve build settings: Scheme not found' }],
        isError: true,
      });
    });

    it('should handle Error objects in catch blocks', async () => {
      const mockExecutor = async (...args: any[]) => {
        throw new Error('Command execution failed');
      };

      const result = await show_build_set_wsLogic(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          { type: 'text', text: 'Error retrieving build settings: Command execution failed' },
        ],
        isError: true,
      });
    });
  });
});
