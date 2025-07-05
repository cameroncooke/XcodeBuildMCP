import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import tool from './get_mac_app_path_ws.ts';
import {
  log,
  validateRequiredParam,
  createTextResponse,
  executeCommand,
} from '../../utils/index.js';
import type { MockedFunction } from 'vitest';

// Mock the utility functions
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
  createTextResponse: vi.fn(),
  executeCommand: vi.fn(),
}));

const mockLog = log as MockedFunction<typeof log>;
const mockValidateRequiredParam = validateRequiredParam as MockedFunction<
  typeof validateRequiredParam
>;
const mockCreateTextResponse = createTextResponse as MockedFunction<typeof createTextResponse>;
const mockExecuteCommand = executeCommand as MockedFunction<typeof executeCommand>;

describe('get_mac_app_path_ws', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should export the correct name', () => {
      expect(tool.name).toBe('get_mac_app_path_ws');
    });

    it('should export the correct description', () => {
      expect(tool.description).toBe(
        "Gets the app bundle path for a macOS application using a workspace. IMPORTANT: Requires workspacePath and scheme. Example: get_mac_app_path_ws({ workspacePath: '/path/to/workspace', scheme: 'MyScheme' })",
      );
    });

    it('should export a handler function', () => {
      expect(typeof tool.handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      const validInput = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
        configuration: 'Debug',
        arch: 'arm64',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(validInput).success).toBe(true);
    });

    it('should validate schema with minimal valid inputs', () => {
      const validInput = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(validInput).success).toBe(true);
    });

    it('should reject invalid workspacePath', () => {
      const invalidInput = {
        workspacePath: 123,
        scheme: 'MyApp',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });

    it('should reject invalid scheme', () => {
      const invalidInput = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 123,
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });

    it('should reject invalid arch', () => {
      const invalidInput = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
        arch: 'invalid',
      };
      const schema = z.object(tool.schema);
      expect(schema.safeParse(invalidInput).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle successful app path retrieval', async () => {
      // Mock successful validation
      mockValidateRequiredParam
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({ isValid: true });

      // Mock successful command execution
      const mockResult = {
        success: true,
        output: 'BUILT_PRODUCTS_DIR = /path/to/build/Debug\nFULL_PRODUCT_NAME = MyApp.app',
      };
      mockExecuteCommand.mockResolvedValue(mockResult);

      const args = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(mockLog).toHaveBeenCalledWith(
        'info',
        'Getting app path for scheme MyApp on platform macOS',
      );
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        [
          'xcodebuild',
          '-showBuildSettings',
          '-workspace',
          '/path/to/workspace.xcworkspace',
          '-scheme',
          'MyApp',
          '-configuration',
          'Debug',
          '-destination',
          'platform=macOS',
        ],
        'Get App Path',
      );
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

    it('should handle workspacePath validation failure', async () => {
      // Mock validation failure
      const mockErrorResponse = {
        content: [
          {
            type: 'text',
            text: 'Error: workspacePath is required',
          },
        ],
        isError: true,
      };
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse: mockErrorResponse,
      });

      const args = {
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(mockValidateRequiredParam).toHaveBeenCalledWith('workspacePath', undefined);
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: workspacePath is required',
          },
        ],
        isError: true,
      });
    });

    it('should handle scheme validation failure', async () => {
      // Mock successful workspacePath validation but failed scheme validation
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });

      const mockErrorResponse = {
        content: [
          {
            type: 'text',
            text: 'Error: scheme is required',
          },
        ],
        isError: true,
      };
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse: mockErrorResponse,
      });

      const args = {
        workspacePath: '/path/to/workspace.xcworkspace',
      };

      const result = await tool.handler(args);

      expect(mockValidateRequiredParam).toHaveBeenCalledWith('scheme', undefined);
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: scheme is required',
          },
        ],
        isError: true,
      });
    });

    it('should handle command execution failure', async () => {
      // Mock successful validations
      mockValidateRequiredParam
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({ isValid: true });

      // Mock failed command execution
      const mockResult = {
        success: false,
        error: 'Command failed',
      };
      mockExecuteCommand.mockResolvedValue(mockResult);

      const mockErrorResponse = {
        content: [
          {
            type: 'text',
            text: 'Failed to get app path: Command failed',
          },
        ],
        isError: true,
      };
      mockCreateTextResponse.mockReturnValue(mockErrorResponse);

      const args = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        'Failed to get app path: Command failed',
        true,
      );
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to get app path: Command failed',
          },
        ],
        isError: true,
      });
    });

    it('should handle missing output', async () => {
      // Mock successful validations
      mockValidateRequiredParam
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({ isValid: true });

      // Mock successful command execution but no output
      const mockResult = {
        success: true,
        output: '',
      };
      mockExecuteCommand.mockResolvedValue(mockResult);

      const mockErrorResponse = {
        content: [
          {
            type: 'text',
            text: 'Failed to extract build settings output from the result.',
          },
        ],
        isError: true,
      };
      mockCreateTextResponse.mockReturnValue(mockErrorResponse);

      const args = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        'Failed to extract build settings output from the result.',
        true,
      );
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to extract build settings output from the result.',
          },
        ],
        isError: true,
      });
    });

    it('should handle missing build settings', async () => {
      // Mock successful validations
      mockValidateRequiredParam
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({ isValid: true });

      // Mock successful command execution but missing build settings
      const mockResult = {
        success: true,
        output: 'Some output without build settings',
      };
      mockExecuteCommand.mockResolvedValue(mockResult);

      const mockErrorResponse = {
        content: [
          {
            type: 'text',
            text: 'Failed to extract app path from build settings. Make sure the app has been built first.',
          },
        ],
        isError: true,
      };
      mockCreateTextResponse.mockReturnValue(mockErrorResponse);

      const args = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        'Failed to extract app path from build settings. Make sure the app has been built first.',
        true,
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

    it('should handle exception during execution', async () => {
      // Mock successful validations
      mockValidateRequiredParam
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({ isValid: true });

      // Mock exception during command execution
      const error = new Error('Unexpected error');
      mockExecuteCommand.mockRejectedValue(error);

      const mockErrorResponse = {
        content: [
          {
            type: 'text',
            text: 'Error retrieving app path: Unexpected error',
          },
        ],
        isError: true,
      };
      mockCreateTextResponse.mockReturnValue(mockErrorResponse);

      const args = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(mockLog).toHaveBeenCalledWith('error', 'Error retrieving app path: Unexpected error');
      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        'Error retrieving app path: Unexpected error',
        true,
      );
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error retrieving app path: Unexpected error',
          },
        ],
        isError: true,
      });
    });

    it('should handle string error during execution', async () => {
      // Mock successful validations
      mockValidateRequiredParam
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({ isValid: true });

      // Mock string error during command execution
      mockExecuteCommand.mockRejectedValue('String error');

      const mockErrorResponse = {
        content: [
          {
            type: 'text',
            text: 'Error retrieving app path: String error',
          },
        ],
        isError: true,
      };
      mockCreateTextResponse.mockReturnValue(mockErrorResponse);

      const args = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
      };

      const result = await tool.handler(args);

      expect(mockLog).toHaveBeenCalledWith('error', 'Error retrieving app path: String error');
      expect(mockCreateTextResponse).toHaveBeenCalledWith(
        'Error retrieving app path: String error',
        true,
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

    it('should use custom configuration and arch', async () => {
      // Mock successful validations
      mockValidateRequiredParam
        .mockReturnValueOnce({ isValid: true })
        .mockReturnValueOnce({ isValid: true });

      // Mock successful command execution
      const mockResult = {
        success: true,
        output: 'BUILT_PRODUCTS_DIR = /path/to/build/Release\nFULL_PRODUCT_NAME = MyApp.app',
      };
      mockExecuteCommand.mockResolvedValue(mockResult);

      const args = {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: 'MyApp',
        configuration: 'Release',
        arch: 'x86_64',
      };

      const result = await tool.handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        [
          'xcodebuild',
          '-showBuildSettings',
          '-workspace',
          '/path/to/workspace.xcworkspace',
          '-scheme',
          'MyApp',
          '-configuration',
          'Release',
          '-destination',
          'platform=macOS,arch=x86_64',
        ],
        'Get App Path',
      );
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App path retrieved successfully: /path/to/build/Release/MyApp.app',
          },
          {
            type: 'text',
            text: 'Next Steps:\n1. Get bundle ID: get_macos_bundle_id({ appPath: "/path/to/build/Release/MyApp.app" })\n2. Launch the app: launch_macos_app({ appPath: "/path/to/build/Release/MyApp.app" })',
          },
        ],
      });
    });
  });
});
