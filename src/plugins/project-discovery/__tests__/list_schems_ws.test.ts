/**
 * Tests for list_schems_ws plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMockExecutor } from '../../../utils/command.js';
import plugin from '../list_schems_ws.ts';

describe('list_schems_ws plugin', () => {
  // Manual call tracking for dependency injection testing
  let executorCalls: Array<{
    command: string[];
    description: string;
    hideOutput: boolean;
    cwd: string | undefined;
  }>;

  beforeEach(() => {
    executorCalls = [];
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
    it('should handle schema validation error when workspacePath is null', async () => {
      // Schema validation will throw before reaching validateRequiredParam
      await expect(plugin.handler({ workspacePath: null })).rejects.toThrow();
    });

    it('should return success with schemes found', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: `Information about workspace "MyWorkspace":
    Targets:
        MyApp
        MyAppTests

    Build Configurations:
        Debug
        Release

    Schemes:
        MyApp
        MyAppTests`,
        error: undefined,
        process: { pid: 12345 },
      });

      // Create executor with call tracking
      const trackingExecutor = async (command: string[], description: string, hideOutput: boolean, cwd?: string) => {
        executorCalls.push({ command, description, hideOutput, cwd });
        return mockExecutor(command, description, hideOutput, cwd);
      };

      const result = await plugin.handler(
        { workspacePath: '/path/to/MyProject.xcworkspace' },
        trackingExecutor,
      );

      expect(executorCalls).toHaveLength(1);
      expect(executorCalls[0]).toEqual({
        command: ['xcodebuild', '-list', '-workspace', '/path/to/MyProject.xcworkspace'],
        description: 'List Schemes',
        hideOutput: true,
        cwd: undefined,
      });

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
1. Build the app: macos_build_workspace({ workspacePath: "/path/to/MyProject.xcworkspace", scheme: "MyApp" })
   or for iOS: ios_simulator_build_by_name_workspace({ workspacePath: "/path/to/MyProject.xcworkspace", scheme: "MyApp", simulatorName: "iPhone 16" })
2. Show build settings: show_build_set_ws({ workspacePath: "/path/to/MyProject.xcworkspace", scheme: "MyApp" })`,
          },
        ],
        isError: false,
      });
    });

    it('should return error when command fails', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Workspace not found',
        output: '',
        process: { pid: 12345 },
      });

      const result = await plugin.handler(
        { workspacePath: '/path/to/MyProject.xcworkspace' },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Failed to list schemes: Workspace not found' }],
        isError: true,
      });
    });

    it('should return error when no schemes found in output', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Information about workspace "MyWorkspace":\n    Targets:\n        MyApp',
        error: undefined,
        process: { pid: 12345 },
      });

      const result = await plugin.handler(
        { workspacePath: '/path/to/MyProject.xcworkspace' },
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
        output: `Information about workspace "MinimalWorkspace":
    Targets:
        MinimalApp

    Build Configurations:
        Debug
        Release

    Schemes:

`,
        error: undefined,
        process: { pid: 12345 },
      });

      const result = await plugin.handler(
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
      const mockExecutor = createMockExecutor(new Error('Command execution failed'));

      const result = await plugin.handler(
        { workspacePath: '/path/to/MyProject.xcworkspace' },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error listing schemes: Command execution failed' }],
        isError: true,
      });
    });
  });
});
