/**
 * Tests for list_schems_proj plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createMockExecutor } from '../../../utils/command.js';
import plugin from '../list_schems_proj.ts';

describe('list_schems_proj plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(plugin.name).toBe('list_schems_proj');
    });

    it('should have correct description', () => {
      expect(plugin.description).toBe(
        "Lists available schemes in the project file. IMPORTANT: Requires projectPath. Example: list_schems_proj({ projectPath: '/path/to/MyProject.xcodeproj' })",
      );
    });

    it('should have handler function', () => {
      expect(typeof plugin.handler).toBe('function');
    });

    it('should validate schema with valid inputs', () => {
      expect(plugin.schema.safeParse({ projectPath: '/path/to/MyProject.xcodeproj' }).success).toBe(
        true,
      );
      expect(plugin.schema.safeParse({ projectPath: '/Users/dev/App.xcodeproj' }).success).toBe(
        true,
      );
    });

    it('should validate schema with invalid inputs', () => {
      expect(plugin.schema.safeParse({}).success).toBe(false);
      expect(plugin.schema.safeParse({ projectPath: 123 }).success).toBe(false);
      expect(plugin.schema.safeParse({ projectPath: null }).success).toBe(false);
      expect(plugin.schema.safeParse({ projectPath: undefined }).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return success with schemes found', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: `Information about project "MyProject":
    Targets:
        MyProject
        MyProjectTests

    Build Configurations:
        Debug
        Release

    Schemes:
        MyProject
        MyProjectTests`,
      });

      const result = await plugin.handler(
        { projectPath: '/path/to/MyProject.xcodeproj' },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Available schemes:',
          },
          {
            type: 'text',
            text: 'MyProject\nMyProjectTests',
          },
          {
            type: 'text',
            text: `Next Steps:
1. Build the app: macos_build_project({ projectPath: "/path/to/MyProject.xcodeproj", scheme: "MyProject" })
   or for iOS: ios_simulator_build_by_name_project({ projectPath: "/path/to/MyProject.xcodeproj", scheme: "MyProject", simulatorName: "iPhone 16" })
2. Show build settings: show_build_set_proj({ projectPath: "/path/to/MyProject.xcodeproj", scheme: "MyProject" })`,
          },
        ],
        isError: false,
      });
    });

    it('should return error when command fails', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Project not found',
      });

      const result = await plugin.handler(
        { projectPath: '/path/to/MyProject.xcodeproj' },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Failed to list schemes: Project not found' }],
        isError: true,
      });
    });

    it('should return error when no schemes found in output', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Information about project "MyProject":\n    Targets:\n        MyProject',
      });

      const result = await plugin.handler(
        { projectPath: '/path/to/MyProject.xcodeproj' },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'No schemes found in the output' }],
        isError: true,
      });
    });

    it('should return success with empty schemes list', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: `Information about project "MinimalProject":
    Targets:
        MinimalProject

    Build Configurations:
        Debug
        Release

    Schemes:

`,
      });

      const result = await plugin.handler(
        { projectPath: '/path/to/MyProject.xcodeproj' },
        mockExecutor,
      );

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
      const mockExecutor = vi.fn().mockRejectedValue(new Error('Command execution failed'));

      const result = await plugin.handler(
        { projectPath: '/path/to/MyProject.xcodeproj' },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error listing schemes: Command execution failed' }],
        isError: true,
      });
    });

    it('should handle string error objects in catch blocks', async () => {
      const mockExecutor = vi.fn().mockRejectedValue('String error');

      const result = await plugin.handler(
        { projectPath: '/path/to/MyProject.xcodeproj' },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error listing schemes: String error' }],
        isError: true,
      });
    });

    it('should verify command generation with mock executor', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({
        success: true,
        output: `Information about project "MyProject":
    Targets:
        MyProject

    Build Configurations:
        Debug
        Release

    Schemes:
        MyProject`,
        error: undefined,
        process: { pid: 12345 },
      });

      await plugin.handler({ projectPath: '/path/to/MyProject.xcodeproj' }, mockExecutor);

      expect(mockExecutor).toHaveBeenCalledWith(
        ['xcodebuild', '-list', '-project', '/path/to/MyProject.xcodeproj'],
        'List Schemes',
        true,
        undefined,
      );
    });

    it('should handle schema validation error when projectPath is null', async () => {
      // Schema validation will throw before reaching validateRequiredParam
      await expect(plugin.handler({ projectPath: null })).rejects.toThrow();
    });
  });
});
