/**
 * Tests for get_device_app_path_ws plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import getDeviceAppPathWs from './get_device_app_path_ws.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
  createTextResponse: vi.fn(),
  executeCommand: vi.fn(),
  constructDestinationString: vi.fn(),
}));

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

  let mockExecuteCommand: MockedFunction<any>;
  let mockValidateRequiredParam: MockedFunction<any>;
  let mockCreateTextResponse: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');

    mockExecuteCommand = utils.executeCommand as MockedFunction<any>;
    mockValidateRequiredParam = utils.validateRequiredParam as MockedFunction<any>;
    mockCreateTextResponse = utils.createTextResponse as MockedFunction<any>;

    // Default validation success
    mockValidateRequiredParam.mockReturnValue({ isValid: true });

    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact successful app path response for iOS', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: `BUILT_PRODUCTS_DIR = /path/to/build/products/dir
FULL_PRODUCT_NAME = MyApp.app`,
        error: '',
      });

      const result = await getDeviceAppPathWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
        configuration: 'Debug',
        platform: 'iOS',
      });

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

    it('should return exact validation error response', async () => {
      const validationError = {
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'workspacePath is required and cannot be empty' }],
          isError: true,
        },
      };
      mockValidateRequiredParam.mockReturnValueOnce(validationError);

      const result = await getDeviceAppPathWs.handler({
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'workspacePath is required and cannot be empty' }],
        isError: true,
      });
    });

    it('should return exact build failure response', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Build failed: scheme not found',
      });

      mockCreateTextResponse.mockReturnValue({
        content: [{ type: 'text', text: 'Failed to get app path: Build failed: scheme not found' }],
        isError: true,
      });

      const result = await getDeviceAppPathWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'NonExistentScheme',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Failed to get app path: Build failed: scheme not found' }],
        isError: true,
      });
    });

    it('should return exact missing build settings response', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Some output without build settings',
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

      const result = await getDeviceAppPathWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
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
      mockExecuteCommand.mockRejectedValue(new Error('Network error'));

      mockCreateTextResponse.mockReturnValue({
        content: [{ type: 'text', text: 'Error retrieving app path: Network error' }],
        isError: true,
      });

      const result = await getDeviceAppPathWs.handler({
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error retrieving app path: Network error' }],
        isError: true,
      });
    });
  });
});
