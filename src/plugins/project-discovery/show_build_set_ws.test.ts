import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import plugin from './show_build_set_ws.ts';
import { executeCommand, validateRequiredParam, createTextResponse } from '../../utils/index.js';

// Mock dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  executeCommand: vi.fn(),
  validateRequiredParam: vi.fn(),
  createTextResponse: vi.fn(),
}));

const mockExecuteCommand = executeCommand as MockedFunction<typeof executeCommand>;
const mockValidateRequiredParam = validateRequiredParam as MockedFunction<
  typeof validateRequiredParam
>;
const mockCreateTextResponse = createTextResponse as MockedFunction<typeof createTextResponse>;

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
    it('should return error when workspacePath validation fails', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'workspacePath is required' }],
          isError: true,
        },
      });

      const result = await plugin.handler({ workspacePath: '', scheme: 'MyScheme' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'workspacePath is required' }],
        isError: true,
      });
    });

    it('should return error when scheme validation fails', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true }).mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'scheme is required' }],
          isError: true,
        },
      });

      const result = await plugin.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: '',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'scheme is required' }],
        isError: true,
      });
    });

    it('should return success with build settings', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockExecuteCommand.mockResolvedValueOnce({
        success: true,
        output: 'Build Configuration: Debug\nACTIVE_ARCH = arm64\nPRODUCT_NAME = MyApp',
      });

      const result = await plugin.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Build settings for scheme MyScheme:',
          },
          {
            type: 'text',
            text: 'Build Configuration: Debug\nACTIVE_ARCH = arm64\nPRODUCT_NAME = MyApp',
          },
        ],
        isError: false,
      });
    });

    it('should return success with empty output fallback', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockExecuteCommand.mockResolvedValueOnce({
        success: true,
        output: '',
      });

      const result = await plugin.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Build settings for scheme MyScheme:',
          },
          {
            type: 'text',
            text: 'Build settings retrieved successfully.',
          },
        ],
        isError: false,
      });
    });

    it('should return error when command fails', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockExecuteCommand.mockResolvedValueOnce({
        success: false,
        error: 'Workspace not found',
      });
      mockCreateTextResponse.mockReturnValueOnce({
        content: [{ type: 'text', text: 'Failed to show build settings: Workspace not found' }],
        isError: true,
      });

      const result = await plugin.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Failed to show build settings: Workspace not found' }],
        isError: true,
      });
    });

    it('should handle Error objects in catch blocks', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockExecuteCommand.mockRejectedValueOnce(new Error('Command execution failed'));
      mockCreateTextResponse.mockReturnValueOnce({
        content: [{ type: 'text', text: 'Error showing build settings: Command execution failed' }],
        isError: true,
      });

      const result = await plugin.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error showing build settings: Command execution failed' }],
        isError: true,
      });
    });

    it('should handle string errors in catch blocks', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockExecuteCommand.mockRejectedValueOnce('String error');
      mockCreateTextResponse.mockReturnValueOnce({
        content: [{ type: 'text', text: 'Error showing build settings: String error' }],
        isError: true,
      });

      const result = await plugin.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error showing build settings: String error' }],
        isError: true,
      });
    });

    it('should handle exception during validation', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'Error showing build settings: Validation error' }],
          isError: true,
        },
      });
      mockCreateTextResponse.mockReturnValueOnce({
        content: [{ type: 'text', text: 'Error showing build settings: Validation error' }],
        isError: true,
      });

      const result = await plugin.handler({
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error showing build settings: Validation error' }],
        isError: true,
      });
    });
  });
});
