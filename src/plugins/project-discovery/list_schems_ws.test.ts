import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import plugin from './list_schems_ws.ts';
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

describe('list_schems_ws plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(plugin.name).toBe('list_schems_ws');
    });

    it('should have correct description', () => {
      expect(plugin.description).toBe(
        "Lists available schemes in the workspace. IMPORTANT: Requires workspacePath. Example: list_schems_ws({ workspacePath: '/path/to/MyProject.xcworkspace' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof plugin.handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      expect(
        plugin.schema.safeParse({ workspacePath: '/path/to/MyWorkspace.xcworkspace' }).success,
      ).toBe(true);
      expect(plugin.schema.safeParse({ workspacePath: '/Users/dev/App.xcworkspace' }).success).toBe(
        true,
      );
    });

    it('should validate schema with invalid inputs', () => {
      expect(plugin.schema.safeParse({}).success).toBe(false);
      expect(plugin.schema.safeParse({ workspacePath: 123 }).success).toBe(false);
      expect(plugin.schema.safeParse({ workspacePath: null }).success).toBe(false);
      expect(plugin.schema.safeParse({ workspacePath: undefined }).success).toBe(false);
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

      const result = await plugin.handler({ workspacePath: '' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'workspacePath is required' }],
        isError: true,
      });
    });

    it('should return success with schemes found', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });
      mockExecuteCommand.mockResolvedValueOnce({
        success: true,
        output: `Information about workspace "MyWorkspace":
    Schemes:
        MyWorkspace
        MyWorkspaceTests
        SharedFramework`,
      });

      const result = await plugin.handler({ workspacePath: '/path/to/MyWorkspace.xcworkspace' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Available schemes:',
          },
          {
            type: 'text',
            text: 'MyWorkspace\nMyWorkspaceTests\nSharedFramework',
          },
          {
            type: 'text',
            text: `Next Steps:
1. Build the app: macos_build_workspace({ workspacePath: "/path/to/MyWorkspace.xcworkspace", scheme: "MyWorkspace" })
   or for iOS: ios_simulator_build_by_name_workspace({ workspacePath: "/path/to/MyWorkspace.xcworkspace", scheme: "MyWorkspace", simulatorName: "iPhone 16" })
2. Show build settings: show_build_set_ws({ workspacePath: "/path/to/MyWorkspace.xcworkspace", scheme: "MyWorkspace" })`,
          },
        ],
        isError: false,
      });
    });

    it('should return error when command fails', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });
      mockExecuteCommand.mockResolvedValueOnce({
        success: false,
        error: 'Workspace not found',
      });
      mockCreateTextResponse.mockReturnValueOnce({
        content: [{ type: 'text', text: 'Failed to list schemes: Workspace not found' }],
        isError: true,
      });

      const result = await plugin.handler({ workspacePath: '/path/to/MyWorkspace.xcworkspace' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Failed to list schemes: Workspace not found' }],
        isError: true,
      });
    });

    it('should return error when no schemes found in output', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });
      mockExecuteCommand.mockResolvedValueOnce({
        success: true,
        output:
          'Information about workspace "MyWorkspace":\n    Projects:\n        MyProject.xcodeproj',
      });
      mockCreateTextResponse.mockReturnValueOnce({
        content: [{ type: 'text', text: 'No schemes found in the output' }],
        isError: true,
      });

      const result = await plugin.handler({ workspacePath: '/path/to/MyWorkspace.xcworkspace' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'No schemes found in the output' }],
        isError: true,
      });
    });

    it('should return success with empty schemes list', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });
      mockExecuteCommand.mockResolvedValueOnce({
        success: true,
        output: `Information about workspace "MinimalWorkspace":
    Projects:
        MinimalProject.xcodeproj

    Schemes:

`,
      });

      const result = await plugin.handler({ workspacePath: '/path/to/MyWorkspace.xcworkspace' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Available schemes:',
          },
          {
            type: 'text',
            text: '',
          },
          {
            type: 'text',
            text: '',
          },
        ],
        isError: false,
      });
    });

    it('should handle Error objects in catch blocks', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });
      mockExecuteCommand.mockRejectedValueOnce(new Error('Command execution failed'));
      mockCreateTextResponse.mockReturnValueOnce({
        content: [{ type: 'text', text: 'Error listing schemes: Command execution failed' }],
        isError: true,
      });

      const result = await plugin.handler({ workspacePath: '/path/to/MyWorkspace.xcworkspace' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error listing schemes: Command execution failed' }],
        isError: true,
      });
    });

    it('should handle string errors in catch blocks', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true });
      mockExecuteCommand.mockRejectedValueOnce('String error');
      mockCreateTextResponse.mockReturnValueOnce({
        content: [{ type: 'text', text: 'Error listing schemes: String error' }],
        isError: true,
      });

      const result = await plugin.handler({ workspacePath: '/path/to/MyWorkspace.xcworkspace' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error listing schemes: String error' }],
        isError: true,
      });
    });

    it('should handle exception during validation', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'Error listing schemes: Validation error' }],
          isError: true,
        },
      });
      mockCreateTextResponse.mockReturnValueOnce({
        content: [{ type: 'text', text: 'Error listing schemes: Validation error' }],
        isError: true,
      });

      const result = await plugin.handler({ workspacePath: '/path/to/MyWorkspace.xcworkspace' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error listing schemes: Validation error' }],
        isError: true,
      });
    });
  });
});
