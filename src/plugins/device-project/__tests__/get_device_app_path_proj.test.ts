/**
 * Tests for get_device_app_path_proj plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createMockExecutor } from '../../../utils/command.js';
import getDeviceAppPathProj from '../get_device_app_path_proj.ts';

describe('get_device_app_path_proj plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(getDeviceAppPathProj.name).toBe('get_device_app_path_proj');
    });

    it('should have correct description', () => {
      expect(getDeviceAppPathProj.description).toBe(
        "Gets the app bundle path for a physical device application (iOS, watchOS, tvOS, visionOS) using a project file. IMPORTANT: Requires projectPath and scheme. Example: get_device_app_path_proj({ projectPath: '/path/to/project.xcodeproj', scheme: 'MyScheme' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof getDeviceAppPathProj.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(
        getDeviceAppPathProj.schema.projectPath.safeParse('/path/to/project.xcodeproj').success,
      ).toBe(true);
      expect(getDeviceAppPathProj.schema.scheme.safeParse('MyScheme').success).toBe(true);

      // Test optional fields
      expect(getDeviceAppPathProj.schema.configuration.safeParse('Debug').success).toBe(true);
      expect(getDeviceAppPathProj.schema.platform.safeParse('iOS').success).toBe(true);
      expect(getDeviceAppPathProj.schema.platform.safeParse('watchOS').success).toBe(true);
      expect(getDeviceAppPathProj.schema.platform.safeParse('tvOS').success).toBe(true);
      expect(getDeviceAppPathProj.schema.platform.safeParse('visionOS').success).toBe(true);

      // Test invalid inputs
      expect(getDeviceAppPathProj.schema.projectPath.safeParse(null).success).toBe(false);
      expect(getDeviceAppPathProj.schema.scheme.safeParse(null).success).toBe(false);
      expect(getDeviceAppPathProj.schema.platform.safeParse('invalidPlatform').success).toBe(false);
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact validation failure response for missing projectPath', async () => {
      const result = await getDeviceAppPathProj.handler({
        projectPath: null,
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return exact validation failure response for missing scheme', async () => {
      const result = await getDeviceAppPathProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: null,
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

    it('should generate correct xcodebuild command for iOS', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({
        success: true,
        output:
          'Build settings for scheme "MyScheme"\n\nBUILT_PRODUCTS_DIR = /path/to/build/Debug-iphoneos\nFULL_PRODUCT_NAME = MyApp.app\n',
        error: undefined,
        process: { pid: 12345 },
      });

      await getDeviceAppPathProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(mockExecutor).toHaveBeenCalledWith(
        [
          'xcodebuild',
          '-showBuildSettings',
          '-project',
          '/path/to/project.xcodeproj',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Debug',
          '-destination',
          'generic/platform=iOS',
        ],
        'Get App Path',
        true,
        undefined,
      );
    });

    it('should generate correct xcodebuild command for watchOS', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({
        success: true,
        output:
          'Build settings for scheme "MyScheme"\n\nBUILT_PRODUCTS_DIR = /path/to/build/Debug-watchos\nFULL_PRODUCT_NAME = MyApp.app\n',
        error: undefined,
        process: { pid: 12345 },
      });

      await getDeviceAppPathProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          platform: 'watchOS',
        },
        mockExecutor,
      );

      expect(mockExecutor).toHaveBeenCalledWith(
        [
          'xcodebuild',
          '-showBuildSettings',
          '-project',
          '/path/to/project.xcodeproj',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Debug',
          '-destination',
          'generic/platform=watchOS',
        ],
        'Get App Path',
        true,
        undefined,
      );
    });

    it('should return exact successful app path retrieval response', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output:
          'Build settings for scheme "MyScheme"\n\nBUILT_PRODUCTS_DIR = /path/to/build/Debug-iphoneos\nFULL_PRODUCT_NAME = MyApp.app\n',
      });

      const result = await getDeviceAppPathProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App path retrieved successfully: /path/to/build/Debug-iphoneos/MyApp.app',
          },
          {
            type: 'text',
            text: 'Next Steps:\n1. Get bundle ID: get_app_bundle_id({ appPath: "/path/to/build/Debug-iphoneos/MyApp.app" })\n2. Install app on device: install_app_device({ deviceId: "DEVICE_UDID", appPath: "/path/to/build/Debug-iphoneos/MyApp.app" })\n3. Launch app on device: launch_app_device({ deviceId: "DEVICE_UDID", bundleId: "BUNDLE_ID" })',
          },
        ],
      });
    });

    it('should return exact command failure response', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'xcodebuild: error: The project does not exist.',
      });

      const result = await getDeviceAppPathProj.handler(
        {
          projectPath: '/path/to/nonexistent.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to get app path: xcodebuild: error: The project does not exist.',
          },
        ],
        isError: true,
      });
    });

    it('should return exact parse failure response', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Build settings without required fields',
      });

      const result = await getDeviceAppPathProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
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

    it('should include optional configuration parameter in command', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({
        success: true,
        output:
          'Build settings for scheme "MyScheme"\n\nBUILT_PRODUCTS_DIR = /path/to/build/Release-iphoneos\nFULL_PRODUCT_NAME = MyApp.app\n',
        error: undefined,
        process: { pid: 12345 },
      });

      await getDeviceAppPathProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
          configuration: 'Release',
        },
        mockExecutor,
      );

      expect(mockExecutor).toHaveBeenCalledWith(
        [
          'xcodebuild',
          '-showBuildSettings',
          '-project',
          '/path/to/project.xcodeproj',
          '-scheme',
          'MyScheme',
          '-configuration',
          'Release',
          '-destination',
          'generic/platform=iOS',
        ],
        'Get App Path',
        true,
        undefined,
      );
    });

    it('should return exact exception handling response', async () => {
      const mockExecutor = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await getDeviceAppPathProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
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

    it('should return exact string error handling response', async () => {
      const mockExecutor = vi.fn().mockRejectedValue('String error');

      const result = await getDeviceAppPathProj.handler(
        {
          projectPath: '/path/to/project.xcodeproj',
          scheme: 'MyScheme',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error retrieving app path: String error',
          },
        ],
        isError: true,
      });
    });
  });
});
