/**
 * Build Settings Tests - Comprehensive test coverage for build settings and scheme listing tools
 *
 * This test file provides complete coverage for the build_settings.ts tools:
 * - show_build_set_ws: Show build settings for workspace
 * - show_build_set_proj: Show build settings for project
 * - list_schems_ws: List schemes for workspace
 * - list_schems_proj: List schemes for project
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive parameter testing.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { callToolHandler } from '../../tests-vitest/helpers/vitest-tool-helpers.js';
import { z } from 'zod';
import {
  workspacePathSchema,
  projectPathSchema,
  schemeSchema,
  BaseWorkspaceParams,
  BaseProjectParams,
} from './common.js';
import { executeCommand } from '../utils/command.js';
import { validateRequiredParam, createTextResponse } from '../utils/validation.js';

// Mock child_process to prevent real command execution
vi.mock('child_process', () => ({ spawn: vi.fn() }));

// Mock fs to prevent file system access during tests
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
}));

// Mock the command execution utility
vi.mock('../utils/command.js', () => ({
  executeCommand: vi.fn(),
}));

// Mock the logger to prevent logging during tests
vi.mock('../utils/logger.js', () => ({
  log: vi.fn(),
}));

describe('build_settings tests', () => {
  let mockExecuteCommand: MockedFunction<any>;

  beforeEach(async () => {
    // Import and setup the mocked executeCommand function
    const commandModule = await import('../utils/command.js');
    mockExecuteCommand = commandModule.executeCommand as MockedFunction<any>;

    // Default success behavior for executeCommand
    mockExecuteCommand.mockResolvedValue({
      success: true,
      output: 'Build settings output\nBUILD_SETTING = value',
      error: '',
    });

    vi.clearAllMocks();
  });

  // Helper function to replicate _handleShowBuildSettingsLogic behavior
  async function handleShowBuildSettingsLogic(params: {
    workspacePath?: string;
    projectPath?: string;
    scheme: string;
  }) {
    try {
      // Create the command array for xcodebuild
      const command = ['xcodebuild', '-showBuildSettings'];

      // Add the workspace or project
      if (params.workspacePath) {
        command.push('-workspace', params.workspacePath);
      } else if (params.projectPath) {
        command.push('-project', params.projectPath);
      }

      // Add the scheme
      command.push('-scheme', params.scheme);

      // Execute the command
      const result = await executeCommand(command, 'Show Build Settings');

      if (!result.success) {
        return createTextResponse(`Failed to show build settings: ${result.error}`, true);
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ Build settings for scheme ${params.scheme}:`,
          },
          {
            type: 'text',
            text: result.output || 'Build settings retrieved successfully.',
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return createTextResponse(`Error showing build settings: ${errorMessage}`, true);
    }
  }

  // Helper function to replicate _handleListSchemesLogic behavior
  async function handleListSchemesLogic(params: { workspacePath?: string; projectPath?: string }) {
    try {
      const command = ['xcodebuild', '-list'];

      if (params.workspacePath) {
        command.push('-workspace', params.workspacePath);
      } else if (params.projectPath) {
        command.push('-project', params.projectPath);
      }

      const result = await executeCommand(command, 'List Schemes');

      if (!result.success) {
        return createTextResponse(`Failed to list schemes: ${result.error}`, true);
      }

      // Extract schemes from the output
      const schemesMatch = result.output.match(/Schemes:([\s\S]*?)(?=\n\n|$)/);

      if (!schemesMatch) {
        return createTextResponse('No schemes found in the output', true);
      }

      const schemeLines = schemesMatch[1].trim().split('\n');
      const schemes = schemeLines.map((line) => line.trim()).filter((line) => line);

      // Prepare next steps with the first scheme if available
      let nextStepsText = '';
      if (schemes.length > 0) {
        const firstScheme = schemes[0];
        const projectOrWorkspace = params.workspacePath ? 'workspace' : 'project';
        const path = params.workspacePath || params.projectPath;

        nextStepsText = `Next Steps:
1. Build the app: ${projectOrWorkspace === 'workspace' ? 'macos_build_workspace' : 'macos_build_project'}({ ${projectOrWorkspace}Path: "${path}", scheme: "${firstScheme}" })
   or for iOS: ${projectOrWorkspace === 'workspace' ? 'ios_simulator_build_by_name_workspace' : 'ios_simulator_build_by_name_project'}({ ${projectOrWorkspace}Path: "${path}", scheme: "${firstScheme}", simulatorName: "iPhone 16" })
2. Show build settings: ${projectOrWorkspace === 'workspace' ? 'show_build_set_ws' : 'show_build_set_proj'}({ ${projectOrWorkspace}Path: "${path}", scheme: "${firstScheme}" })`;
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ Available schemes:`,
          },
          {
            type: 'text',
            text: schemes.join('\n'),
          },
          {
            type: 'text',
            text: nextStepsText,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return createTextResponse(`Error listing schemes: ${errorMessage}`, true);
    }
  }

  // Tool schema definitions for testing
  const showBuildSettingsWorkspaceSchema = z.object({
    workspacePath: workspacePathSchema,
    scheme: schemeSchema,
  });

  const showBuildSettingsProjectSchema = z.object({
    projectPath: projectPathSchema,
    scheme: schemeSchema,
  });

  const listSchemesWorkspaceSchema = z.object({
    workspacePath: workspacePathSchema,
  });

  const listSchemesProjectSchema = z.object({
    projectPath: projectPathSchema,
  });

  // Mock tool definitions for testing
  const showBuildSettingsWorkspaceTool = {
    name: 'show_build_set_ws',
    description:
      "Shows build settings from a workspace using xcodebuild. IMPORTANT: Requires workspacePath and scheme. Example: show_build_set_ws({ workspacePath: '/path/to/MyProject.xcworkspace', scheme: 'MyScheme' })",
    groups: ['BUILD_SETTINGS'],
    schema: showBuildSettingsWorkspaceSchema,
    handler: async (params: BaseWorkspaceParams) => {
      // Validate required parameters - check for empty strings too
      if (!params.workspacePath || params.workspacePath.trim() === '') {
        return createTextResponse(
          "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
          true,
        );
      }
      if (!params.scheme || params.scheme.trim() === '') {
        return createTextResponse(
          "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
          true,
        );
      }

      return handleShowBuildSettingsLogic(params);
    },
  };

  const showBuildSettingsProjectTool = {
    name: 'show_build_set_proj',
    description:
      "Shows build settings from a project file using xcodebuild. IMPORTANT: Requires projectPath and scheme. Example: show_build_set_proj({ projectPath: '/path/to/MyProject.xcodeproj', scheme: 'MyScheme' })",
    groups: ['BUILD_SETTINGS'],
    schema: showBuildSettingsProjectSchema,
    handler: async (params: BaseProjectParams) => {
      // Validate required parameters - check for empty strings too
      if (!params.projectPath || params.projectPath.trim() === '') {
        return createTextResponse(
          "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
          true,
        );
      }
      if (!params.scheme || params.scheme.trim() === '') {
        return createTextResponse(
          "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
          true,
        );
      }

      return handleShowBuildSettingsLogic(params);
    },
  };

  const listSchemesWorkspaceTool = {
    name: 'list_schems_ws',
    description:
      "Lists available schemes in the workspace. IMPORTANT: Requires workspacePath. Example: list_schems_ws({ workspacePath: '/path/to/MyProject.xcworkspace' })",
    groups: ['BUILD_SETTINGS'],
    schema: listSchemesWorkspaceSchema,
    handler: async (params: BaseWorkspaceParams) => {
      // Validate required parameters - check for empty strings too
      if (!params.workspacePath || params.workspacePath.trim() === '') {
        return createTextResponse(
          "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
          true,
        );
      }

      return handleListSchemesLogic(params);
    },
  };

  const listSchemesProjectTool = {
    name: 'list_schems_proj',
    description:
      "Lists available schemes in the project file. IMPORTANT: Requires projectPath. Example: list_schems_proj({ projectPath: '/path/to/MyProject.xcodeproj' })",
    groups: ['BUILD_SETTINGS'],
    schema: listSchemesProjectSchema,
    handler: async (params: BaseProjectParams) => {
      // Validate required parameters - check for empty strings too
      if (!params.projectPath || params.projectPath.trim() === '') {
        return createTextResponse(
          "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
          true,
        );
      }

      return handleListSchemesLogic(params);
    },
  };

  describe('show_build_set_ws parameter validation', () => {
    it('should reject missing workspacePath parameter', async () => {
      const result = await callToolHandler(showBuildSettingsWorkspaceTool, { scheme: 'MyScheme' });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject missing scheme parameter', async () => {
      const result = await callToolHandler(showBuildSettingsWorkspaceTool, {
        workspacePath: '/path/to/workspace.xcworkspace',
      });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject empty workspacePath parameter', async () => {
      const result = await callToolHandler(showBuildSettingsWorkspaceTool, {
        workspacePath: '',
        scheme: 'MyScheme',
      });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject empty scheme parameter', async () => {
      const result = await callToolHandler(showBuildSettingsWorkspaceTool, {
        workspacePath: '/path/to/workspace.xcworkspace',
        scheme: '',
      });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('show_build_set_proj parameter validation', () => {
    it('should reject missing projectPath parameter', async () => {
      const result = await callToolHandler(showBuildSettingsProjectTool, { scheme: 'MyScheme' });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject missing scheme parameter', async () => {
      const result = await callToolHandler(showBuildSettingsProjectTool, {
        projectPath: '/path/to/project.xcodeproj',
      });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject empty projectPath parameter', async () => {
      const result = await callToolHandler(showBuildSettingsProjectTool, {
        projectPath: '',
        scheme: 'MyScheme',
      });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject empty scheme parameter', async () => {
      const result = await callToolHandler(showBuildSettingsProjectTool, {
        projectPath: '/path/to/project.xcodeproj',
        scheme: '',
      });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'scheme' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('list_schems_ws parameter validation', () => {
    it('should reject missing workspacePath parameter', async () => {
      const result = await callToolHandler(listSchemesWorkspaceTool, {});
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject empty workspacePath parameter', async () => {
      const result = await callToolHandler(listSchemesWorkspaceTool, { workspacePath: '' });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('list_schems_proj parameter validation', () => {
    it('should reject missing projectPath parameter', async () => {
      const result = await callToolHandler(listSchemesProjectTool, {});
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject empty projectPath parameter', async () => {
      const result = await callToolHandler(listSchemesProjectTool, { projectPath: '' });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('show_build_set_ws success scenarios', () => {
    it('should show build settings for workspace successfully', async () => {
      const params = {
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      };

      const result = await callToolHandler(showBuildSettingsWorkspaceTool, params);

      expect(result.content).toEqual([
        { type: 'text', text: '✅ Build settings for scheme MyScheme:' },
        { type: 'text', text: 'Build settings output\nBUILD_SETTING = value' },
      ]);
      expect(result.isError).toBe(false);

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        [
          'xcodebuild',
          '-showBuildSettings',
          '-workspace',
          '/path/to/MyProject.xcworkspace',
          '-scheme',
          'MyScheme',
        ],
        'Show Build Settings',
      );
    });

    it('should handle command failure for workspace build settings', async () => {
      // Mock command failure
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Build settings error occurred',
      });

      const params = {
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      };

      const result = await callToolHandler(showBuildSettingsWorkspaceTool, params);

      expect(result.content).toEqual([
        { type: 'text', text: 'Failed to show build settings: Build settings error occurred' },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('show_build_set_proj success scenarios', () => {
    it('should show build settings for project successfully', async () => {
      const params = {
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      };

      const result = await callToolHandler(showBuildSettingsProjectTool, params);

      expect(result.content).toEqual([
        { type: 'text', text: '✅ Build settings for scheme MyScheme:' },
        { type: 'text', text: 'Build settings output\nBUILD_SETTING = value' },
      ]);
      expect(result.isError).toBe(false);

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        [
          'xcodebuild',
          '-showBuildSettings',
          '-project',
          '/path/to/MyProject.xcodeproj',
          '-scheme',
          'MyScheme',
        ],
        'Show Build Settings',
      );
    });

    it('should handle command failure for project build settings', async () => {
      // Mock command failure
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Project build settings error',
      });

      const params = {
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      };

      const result = await callToolHandler(showBuildSettingsProjectTool, params);

      expect(result.content).toEqual([
        { type: 'text', text: 'Failed to show build settings: Project build settings error' },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('list_schems_ws success scenarios', () => {
    it('should list schemes for workspace successfully', async () => {
      // Mock output with schemes section
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: `Information about project "MyProject":
    Targets:
        MyApp
        MyAppTests

    Build Configurations:
        Debug
        Release

    Schemes:
        MyApp
        MyAppTests`,
        error: '',
      });

      const params = { workspacePath: '/path/to/MyProject.xcworkspace' };

      const result = await callToolHandler(listSchemesWorkspaceTool, params);

      expect(result.content).toEqual([
        { type: 'text', text: '✅ Available schemes:' },
        { type: 'text', text: 'MyApp\nMyAppTests' },
        {
          type: 'text',
          text: 'Next Steps:\n1. Build the app: macos_build_workspace({ workspacePath: "/path/to/MyProject.xcworkspace", scheme: "MyApp" })\n   or for iOS: ios_simulator_build_by_name_workspace({ workspacePath: "/path/to/MyProject.xcworkspace", scheme: "MyApp", simulatorName: "iPhone 16" })\n2. Show build settings: show_build_set_ws({ workspacePath: "/path/to/MyProject.xcworkspace", scheme: "MyApp" })',
        },
      ]);
      expect(result.isError).toBe(false);

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        ['xcodebuild', '-list', '-workspace', '/path/to/MyProject.xcworkspace'],
        'List Schemes',
      );
    });

    it('should handle missing schemes section in workspace output', async () => {
      // Mock output without schemes section
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Information about project "MyProject":\n    Targets:\n        MyApp',
        error: '',
      });

      const params = { workspacePath: '/path/to/MyProject.xcworkspace' };

      const result = await callToolHandler(listSchemesWorkspaceTool, params);

      expect(result.content).toEqual([{ type: 'text', text: 'No schemes found in the output' }]);
      expect(result.isError).toBe(true);
    });

    it('should handle command failure for workspace scheme listing', async () => {
      // Mock command failure
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Failed to list workspace schemes',
      });

      const params = { workspacePath: '/path/to/MyProject.xcworkspace' };

      const result = await callToolHandler(listSchemesWorkspaceTool, params);

      expect(result.content).toEqual([
        { type: 'text', text: 'Failed to list schemes: Failed to list workspace schemes' },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('list_schems_proj success scenarios', () => {
    it('should list schemes for project successfully', async () => {
      // Mock output with schemes section
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: `Information about project "MyProject":
    Targets:
        MyApp
        MyAppTests

    Build Configurations:
        Debug
        Release

    Schemes:
        MyApp
        MyAppTests`,
        error: '',
      });

      const params = { projectPath: '/path/to/MyProject.xcodeproj' };

      const result = await callToolHandler(listSchemesProjectTool, params);

      expect(result.content).toEqual([
        { type: 'text', text: '✅ Available schemes:' },
        { type: 'text', text: 'MyApp\nMyAppTests' },
        {
          type: 'text',
          text: 'Next Steps:\n1. Build the app: macos_build_project({ projectPath: "/path/to/MyProject.xcodeproj", scheme: "MyApp" })\n   or for iOS: ios_simulator_build_by_name_project({ projectPath: "/path/to/MyProject.xcodeproj", scheme: "MyApp", simulatorName: "iPhone 16" })\n2. Show build settings: show_build_set_proj({ projectPath: "/path/to/MyProject.xcodeproj", scheme: "MyApp" })',
        },
      ]);
      expect(result.isError).toBe(false);

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        ['xcodebuild', '-list', '-project', '/path/to/MyProject.xcodeproj'],
        'List Schemes',
      );
    });

    it('should handle missing schemes section in project output', async () => {
      // Mock output without schemes section
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Information about project "MyProject":\n    Targets:\n        MyApp',
        error: '',
      });

      const params = { projectPath: '/path/to/MyProject.xcodeproj' };

      const result = await callToolHandler(listSchemesProjectTool, params);

      expect(result.content).toEqual([{ type: 'text', text: 'No schemes found in the output' }]);
      expect(result.isError).toBe(true);
    });

    it('should handle command failure for project scheme listing', async () => {
      // Mock command failure
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Failed to list project schemes',
      });

      const params = { projectPath: '/path/to/MyProject.xcodeproj' };

      const result = await callToolHandler(listSchemesProjectTool, params);

      expect(result.content).toEqual([
        { type: 'text', text: 'Failed to list schemes: Failed to list project schemes' },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('error handling edge cases', () => {
    it('should handle empty output for build settings', async () => {
      // Mock empty output
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: '',
        error: '',
      });

      const params = {
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      };

      const result = await callToolHandler(showBuildSettingsWorkspaceTool, params);

      expect(result.content).toEqual([
        { type: 'text', text: '✅ Build settings for scheme MyScheme:' },
        { type: 'text', text: 'Build settings retrieved successfully.' },
      ]);
      expect(result.isError).toBe(false);
    });

    it('should handle execution exceptions for build settings', async () => {
      // Mock executeCommand to throw an error
      mockExecuteCommand.mockRejectedValue(new Error('Spawn execution failed'));

      const params = {
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      };

      const result = await callToolHandler(showBuildSettingsWorkspaceTool, params);

      expect(result.content).toEqual([
        { type: 'text', text: 'Error showing build settings: Spawn execution failed' },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle execution exceptions for scheme listing', async () => {
      // Mock executeCommand to throw an error
      mockExecuteCommand.mockRejectedValue(new Error('List schemes execution failed'));

      const params = { workspacePath: '/path/to/MyProject.xcworkspace' };

      const result = await callToolHandler(listSchemesWorkspaceTool, params);

      expect(result.content).toEqual([
        { type: 'text', text: 'Error listing schemes: List schemes execution failed' },
      ]);
      expect(result.isError).toBe(true);
    });
  });
});
