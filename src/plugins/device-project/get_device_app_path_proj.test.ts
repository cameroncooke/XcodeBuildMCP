/**
 * Tests for get_device_app_path_proj plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import getDeviceAppPathProj from './get_device_app_path_proj.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
  createTextResponse: vi.fn(),
  executeCommand: vi.fn(),
}));

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

  let mockValidateRequiredParam: MockedFunction<any>;
  let mockCreateTextResponse: MockedFunction<any>;
  let mockExecuteCommand: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');

    mockValidateRequiredParam = utils.validateRequiredParam as MockedFunction<any>;
    mockCreateTextResponse = utils.createTextResponse as MockedFunction<any>;
    mockExecuteCommand = utils.executeCommand as MockedFunction<any>;

    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact successful app path retrieval response', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output:
          'Build settings for scheme "MyScheme"\n\nBUILT_PRODUCTS_DIR = /path/to/build/Debug-iphoneos\nFULL_PRODUCT_NAME = MyApp.app\n',
        error: '',
      });

      const result = await getDeviceAppPathProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
      });

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

    it('should return exact validation failure response for projectPath', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [
            {
              type: 'text',
              text: 'Failed to validate projectPath: projectPath is required',
            },
          ],
          isError: true,
        },
      });

      const result = await getDeviceAppPathProj.handler({
        projectPath: '',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to validate projectPath: projectPath is required',
          },
        ],
        isError: true,
      });
    });

    it('should return exact validation failure response for scheme', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true }).mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [
            {
              type: 'text',
              text: 'Failed to validate scheme: scheme is required',
            },
          ],
          isError: true,
        },
      });

      const result = await getDeviceAppPathProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: '',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to validate scheme: scheme is required',
          },
        ],
        isError: true,
      });
    });

    it('should return exact command failure response', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'xcodebuild: error: The project does not exist.',
      });
      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Failed to get app path: xcodebuild: error: The project does not exist.',
          },
        ],
        isError: true,
      });

      const result = await getDeviceAppPathProj.handler({
        projectPath: '/path/to/nonexistent.xcodeproj',
        scheme: 'MyScheme',
      });

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
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Build settings without required fields',
        error: '',
      });
      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Failed to extract app path from build settings. Make sure the app has been built first.',
          },
        ],
        isError: true,
      });

      const result = await getDeviceAppPathProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
      });

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
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockExecuteCommand.mockRejectedValue(new Error('Network error'));
      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Error retrieving app path: Network error',
          },
        ],
        isError: true,
      });

      const result = await getDeviceAppPathProj.handler({
        projectPath: '/path/to/project.xcodeproj',
        scheme: 'MyScheme',
      });

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
