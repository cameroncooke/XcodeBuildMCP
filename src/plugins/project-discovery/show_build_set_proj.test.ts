import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import plugin from './show_build_set_proj.ts';
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

describe('show_build_set_proj plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(plugin.name).toBe('show_build_set_proj');
    });

    it('should have correct description', () => {
      expect(plugin.description).toBe(
        "Shows build settings from a project file using xcodebuild. IMPORTANT: Requires projectPath and scheme. Example: show_build_set_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof plugin.handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      expect(
        plugin.schema.safeParse({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })
          .success,
      ).toBe(true);
      expect(
        plugin.schema.safeParse({ projectPath: '/Users/dev/App.xcodeproj', scheme: 'AppScheme' })
          .success,
      ).toBe(true);
    });

    it('should validate schema with invalid inputs', () => {
      expect(plugin.schema.safeParse({}).success).toBe(false);
      expect(plugin.schema.safeParse({ projectPath: '/path/to/project.xcodeproj' }).success).toBe(
        false,
      );
      expect(plugin.schema.safeParse({ scheme: 'MyScheme' }).success).toBe(false);
      expect(plugin.schema.safeParse({ projectPath: 123, scheme: 'MyScheme' }).success).toBe(false);
      expect(
        plugin.schema.safeParse({ projectPath: '/path/to/project.xcodeproj', scheme: 123 }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return error when projectPath validation fails', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'projectPath is required' }],
          isError: true,
        },
      });

      const result = await plugin.handler({ projectPath: '', scheme: 'MyScheme' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'projectPath is required' }],
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
        projectPath: '/path/to/MyProject.xcodeproj',
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
        projectPath: '/path/to/MyProject.xcodeproj',
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
        projectPath: '/path/to/MyProject.xcodeproj',
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
        error: 'Project not found',
      });
      mockCreateTextResponse.mockReturnValueOnce({
        content: [{ type: 'text', text: 'Failed to show build settings: Project not found' }],
        isError: true,
      });

      const result = await plugin.handler({
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Failed to show build settings: Project not found' }],
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
        projectPath: '/path/to/MyProject.xcodeproj',
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
        projectPath: '/path/to/MyProject.xcodeproj',
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
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error showing build settings: Validation error' }],
        isError: true,
      });
    });
  });
});
