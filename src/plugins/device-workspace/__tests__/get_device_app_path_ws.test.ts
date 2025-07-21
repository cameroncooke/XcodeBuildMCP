/**
 * Tests for get_device_app_path_ws plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect } from 'vitest';
import { createMockExecutor, createNoopExecutor } from '../../../utils/command.js';
import getDeviceAppPathWs, { get_device_app_path_wsLogic } from '../get_device_app_path_ws.ts';

describe('get_device_app_path_ws plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(getDeviceAppPathWs.name).toBe('get_device_app_path_ws');
    });

    it('should have correct description', () => {
      expect(getDeviceAppPathWs.description).toBe(
        "Gets the app bundle path for a physical device application (iOS, watchOS, tvOS, visionOS) using a workspace. IMPORTANT: Requires workspacePath and scheme. Example: get_device_app_path_ws({ workspacePath: '/path/to/workspace', scheme: 'MyScheme' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof getDeviceAppPathWs.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        getDeviceAppPathWs.schema.workspacePath.safeParse('/path/to/workspace.xcworkspace').success,
      ).toBe(true);
      expect(getDeviceAppPathWs.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(getDeviceAppPathWs.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(getDeviceAppPathWs.schema.platform.safeParse('iOS').success).toBe(true);
      expect(getDeviceAppPathWs.schema.platform.safeParse('watchOS').success).toBe(true);

      // Test invalid inputs
      expect(getDeviceAppPathWs.schema.workspacePath.safeParse(123).success).toBe(false);
      expect(getDeviceAppPathWs.schema.platform.safeParse('invalidPlatform').success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact validation error response for workspacePath', async () => {
      const result = await get_device_app_path_wsLogic(
        {
          scheme: 'MyScheme',
        },
        createNoopExecutor(),
      );

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
      const result = await get_device_app_path_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
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

    it('should generate correct xcodebuild command for getting build settings', async () => {
      const calls: any[] = [];
      const mockExecutor = (
        command: string[],
        action: string,
        silent: boolean,
        timeout: number | undefined,
      ) => {
        calls.push({ command, action, silent, timeout });
        return Promise.resolve({
          success: true,
          output: 'BUILT_PRODUCTS_DIR = /path/to/build/products/dir\nFULL_PRODUCT_NAME = MyApp.app',
          error: undefined,
          process: { pid: 12345 },
        });
      };

      await get_device_app_path_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Debug',
          platform: 'iOS',
        },
        mockExecutor,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({
        command: [
          'xcodebuild',
          '-showBuildSettings',
          '-workspace',
          '/path/to/workspace.xcworkspace',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Debug',
          '-destination',
          'generic/platform=iOS',
        ],
        action: 'Get App Path',
        silent: true,
        timeout: undefined,
      });
    });

    it('should return exact successful app path response for iOS', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'BUILT_PRODUCTS_DIR = /path/to/build/products/dir\nFULL_PRODUCT_NAME = MyApp.app',
      });

      const result = await get_device_app_path_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
          configuration: 'Debug',
          platform: 'iOS',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App path retrieved successfully: /path/to/build/products/dir/MyApp.app',
          },
          {
            type: 'text',
            text: 'Next Steps:\n1. Get bundle ID: get_app_bundle_id({ appPath: "/path/to/build/products/dir/MyApp.app" })\n2. Install app on device: install_app_device({ deviceId: "DEVICE_UDID", appPath: "/path/to/build/products/dir/MyApp.app" })\n3. Launch app on device: launch_app_device({ deviceId: "DEVICE_UDID", bundleId: "BUNDLE_ID" })',
          },
        ],
      });
    });

    it('should return exact build failure response', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'xcodebuild: error: Scheme NonExistentScheme not found',
      });

      const result = await get_device_app_path_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'NonExistentScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to get app path: xcodebuild: error: Scheme NonExistentScheme not found',
          },
        ],
        isError: true,
      });
    });

    it('should return exact missing build settings response', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Some output without build settings',
      });

      const result = await get_device_app_path_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to extract app path from build settings. Make sure the app has been built first.',
          },
        ],
        isError: true,
      });
    });

    it('should return exact exception handling response', async () => {
      const mockExecutor = () => {
        return Promise.reject(new Error('Network error'));
      };

      const result = await get_device_app_path_wsLogic(
        {
          workspacePath: '/path/to/workspace.xcworkspace',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error retrieving app path: Network error' }],
        isError: true,
      });
    });
  });
});
