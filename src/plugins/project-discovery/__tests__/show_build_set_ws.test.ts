/**
 * Tests for show_build_set_ws plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createMockExecutor } from '../../../utils/command.js';
import plugin from '../show_build_set_ws.ts';

describe('show_build_set_ws plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle schema validation error when workspacePath is null', async () => {
      // Schema validation will throw before reaching validateRequiredParam
      await expect(plugin.handler({ workspacePath: null, scheme: 'MyScheme' })).rejects.toThrow();
    });

    it('should handle schema validation error when scheme is null', async () => {
      // Schema validation will throw before reaching validateRequiredParam
      await expect(
        plugin.handler({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: null }),
      ).rejects.toThrow();
    });

    it('should return success with build settings', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({
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

      const result = await plugin.handler(
        {
          workspacePath: '/path/to/MyProject.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(mockExecutor).toHaveBeenCalledWith(
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
        undefined,
      );

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
      const mockExecutor = vi.fn().mockResolvedValue({
        success: false,
        output: '',
        error: 'Scheme not found',
        process: { pid: 12345 },
      });

      const result = await plugin.handler(
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
      const mockExecutor = vi.fn().mockRejectedValue(new Error('Command execution failed'));

      const result = await plugin.handler(
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
