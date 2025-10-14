/**
 * Tests for list_schemes plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../../test-utils/mock-executors.ts';
import plugin, { listSchemesLogic } from '../list_schemes.ts';
import { sessionStore } from '../../../../utils/session-store.ts';

describe('list_schemes plugin', () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(plugin.name).toBe('list_schemes');
    });

    it('should have correct description', () => {
      expect(plugin.description).toBe('Lists schemes for a project or workspace.');
    });

    it('should have handler function', () => {
      expect(typeof plugin.handler).toBe('function');
    });

    it('should expose an empty public schema', () => {
      const schema = z.object(plugin.schema).strict();
      expect(schema.safeParse({}).success).toBe(true);
      expect(schema.safeParse({ projectPath: '/path/to/MyProject.xcodeproj' }).success).toBe(false);
      expect(Object.keys(plugin.schema)).toEqual([]);
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

      const result = await listSchemesLogic(
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
1. Build the app: build_macos({ projectPath: "/path/to/MyProject.xcodeproj", scheme: "MyProject" })
   or for iOS: build_sim({ projectPath: "/path/to/MyProject.xcodeproj", scheme: "MyProject", simulatorName: "iPhone 16" })
2. Show build settings: show_build_settings({ projectPath: "/path/to/MyProject.xcodeproj", scheme: "MyProject" })`,
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

      const result = await listSchemesLogic(
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

      const result = await listSchemesLogic(
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

      const result = await listSchemesLogic(
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

      const result = await listSchemesLogic(
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

      const result = await listSchemesLogic(
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

      await listSchemesLogic({ projectPath: '/path/to/MyProject.xcodeproj' }, mockExecutor);

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
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('Provide a project or workspace');
    });
  });

  describe('XOR Validation', () => {
    it('should error when neither projectPath nor workspacePath provided', async () => {
      const result = await plugin.handler({});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('Provide a project or workspace');
    });

    it('should error when both projectPath and workspacePath provided', async () => {
      const result = await plugin.handler({
        projectPath: '/path/to/project.xcodeproj',
        workspacePath: '/path/to/workspace.xcworkspace',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Mutually exclusive parameters provided');
    });

    it('should handle empty strings as undefined', async () => {
      const result = await plugin.handler({
        projectPath: '',
        workspacePath: '',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required session defaults');
      expect(result.content[0].text).toContain('Provide a project or workspace');
    });
  });

  describe('Workspace Support', () => {
    it('should list schemes for workspace', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: `Information about workspace "MyWorkspace":
    Schemes:
        MyApp
        MyAppTests`,
      });

      const result = await listSchemesLogic(
        { workspacePath: '/path/to/MyProject.xcworkspace' },
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
            text: 'MyApp\nMyAppTests',
          },
          {
            type: 'text',
            text: `Next Steps:
1. Build the app: build_macos({ workspacePath: "/path/to/MyProject.xcworkspace", scheme: "MyApp" })
   or for iOS: build_sim({ workspacePath: "/path/to/MyProject.xcworkspace", scheme: "MyApp", simulatorName: "iPhone 16" })
2. Show build settings: show_build_settings({ workspacePath: "/path/to/MyProject.xcworkspace", scheme: "MyApp" })`,
          },
        ],
        isError: false,
      });
    });

    it('should generate correct workspace command', async () => {
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
          output: `Information about workspace "MyWorkspace":
    Schemes:
        MyApp`,
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await listSchemesLogic({ workspacePath: '/path/to/MyProject.xcworkspace' }, mockExecutor);

      expect(calls).toEqual([
        [
          ['xcodebuild', '-list', '-workspace', '/path/to/MyProject.xcworkspace'],
          'List Schemes',
          true,
          undefined,
        ],
      ]);
    });
  });
});
