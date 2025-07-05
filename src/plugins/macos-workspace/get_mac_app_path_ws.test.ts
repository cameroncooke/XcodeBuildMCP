/**
 * Tests for get_mac_app_path_ws plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import getMacAppPathWs from './get_mac_app_path_ws.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
  createTextResponse: vi.fn(),
  executeCommand: vi.fn(),
}));

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
    it('should return exact validation error for missing workspacePath', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: false,
        errorResponse: {
          content: [
            {
              type: 'text',
              text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
            },
          ],
          isError: true,
        },
      });

      const result = await getMacAppPathWs.handler({});

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

    it('should return exact validation error for missing scheme', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true }).mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [
            {
              type: 'text',
              text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
            },
          ],
          isError: true,
        },
      });

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
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output:
          'Build settings for action build and target MyApp:\n    BUILT_PRODUCTS_DIR = /path/to/build/Debug\n    FULL_PRODUCT_NAME = MyApp.app',
      });

      const result = await getMacAppPathWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App path retrieved successfully: /path/to/build/Debug/MyApp.app',
          },
          {
            type: 'text',
            text: 'Next Steps:\n1. Get bundle ID: get_macos_bundle_id({ appPath: "/path/to/build/Debug/MyApp.app" })\n2. Launch the app: launch_macos_app({ appPath: "/path/to/build/Debug/MyApp.app" })',
          },
        ],
      });
    });

    it('should return exact command execution failure response', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Command failed with exit code 1',
      });

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Failed to get app path: Command failed with exit code 1',
          },
        ],
        isError: true,
      });

      const result = await getMacAppPathWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to get app path: Command failed with exit code 1',
          },
        ],
        isError: true,
      });
    });

    it('should return exact build settings extraction failure response', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Build settings without expected keys',
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

      const result = await getMacAppPathWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
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

      const result = await getMacAppPathWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
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

    it('should return exact string error handling response', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockExecuteCommand.mockRejectedValue('String error');

      mockCreateTextResponse.mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'Error retrieving app path: String error',
          },
        ],
        isError: true,
      });

      const result = await getMacAppPathWs.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

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
