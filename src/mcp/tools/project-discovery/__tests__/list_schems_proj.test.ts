/**
 * Tests for list_schems_proj plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../../utils/command.js';
import plugin, { list_schems_projLogic } from '../list_schems_proj.ts';

describe('list_schems_proj plugin', () => {
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
      const schema = z.object(plugin.schema);
      expect(schema.safeParse({ projectPath: '/path/to/MyProject.xcodeproj' }).success).toBe(true);
      expect(schema.safeParse({ projectPath: '/Users/dev/App.xcodeproj' }).success).toBe(true);
    });

    it('should validate schema with invalid inputs', () => {
      const schema = z.object(plugin.schema);
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ projectPath: 123 }).success).toBe(false);
      expect(schema.safeParse({ projectPath: null }).success).toBe(false);
      expect(schema.safeParse({ projectPath: undefined }).success).toBe(false);
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

      const result = await list_schems_projLogic(
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

      const result = await list_schems_projLogic(
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

      const result = await list_schems_projLogic(
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

      const result = await list_schems_projLogic(
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
      const mockExecutor = async () => {
        throw new Error('Command execution failed');
      };

      const result = await list_schems_projLogic(
        { projectPath: '/path/to/MyProject.xcodeproj' },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error listing schemes: Command execution failed' }],
        isError: true,
      });
    });

    it('should handle string error objects in catch blocks', async () => {
      const mockExecutor = async () => {
        throw 'String error';
      };

      const result = await list_schems_projLogic(
        { projectPath: '/path/to/MyProject.xcodeproj' },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error listing schemes: String error' }],
        isError: true,
      });
    });

    it('should verify command generation with mock executor', async () => {
      const calls: any[] = [];
      const mockExecutor = async (
        command: string[],
        action: string,
        showOutput: boolean,
        workingDir?: string,
      ) => {
        calls.push([command, action, showOutput, workingDir]);
        return {
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
        };
      };

      await list_schems_projLogic({ projectPath: '/path/to/MyProject.xcodeproj' }, mockExecutor);

      expect(calls).toEqual([
        [
          ['xcodebuild', '-list', '-project', '/path/to/MyProject.xcodeproj'],
          'List Schemes',
          true,
          undefined,
        ],
      ]);
    });

    it('should handle validation when testing with missing projectPath via plugin handler', async () => {
      // Note: Direct logic function calls bypass Zod validation, so we test the actual plugin handler
      // to verify Zod validation works properly. The createTypedTool wrapper handles validation.
      const result = await plugin.handler({});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('projectPath');
      expect(result.content[0].text).toContain('Required');
    });
  });
});
