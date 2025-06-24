/**
 * Build Settings Tests - Tests actual production functions from build_settings.ts
 *
 * This test file provides complete coverage for the build_settings.ts tools:
 * - show_build_set_ws: Show build settings for workspace
 * - show_build_set_proj: Show build settings for project
 * - list_schems_ws: List schemes for workspace
 * - list_schems_proj: List schemes for project
 *
 * Refactored to test actual production functions instead of mock implementations.
 * Follows CLAUDE.md testing principles exactly.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

// ✅ Import actual production functions
import {
  registerShowBuildSettingsWorkspaceTool,
  registerShowBuildSettingsProjectTool,
  registerListSchemesWorkspaceTool,
  registerListSchemesProjectTool,
} from './build_settings.js';

// ✅ Mock external dependencies only
vi.mock('child_process', () => ({ spawn: vi.fn() }));

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
}));

// ✅ Mock the command execution utility
vi.mock('../utils/command.js', () => ({
  executeCommand: vi.fn(),
}));

// ✅ Mock the logger to prevent logging during tests
vi.mock('../utils/logger.js', () => ({
  log: vi.fn(),
}));

// ✅ Helper function to create mock server for testing tool registration
function createMockServer() {
  const tools = new Map();
  return {
    setRequestHandler: vi.fn(),
    tool: vi.fn((name: string, description: string, schema: any, handler: any) => {
      tools.set(name, { name, description, schema, handler });
    }),
    tools,
  } as any;
}

// ✅ Helper function to extract registered tool handler
function getRegisteredTool(registerFunction: any, toolName: string) {
  const mockServer = createMockServer();
  registerFunction(mockServer);
  return mockServer.tools.get(toolName);
}

describe('build_settings tests', () => {
  let mockExecuteCommand: MockedFunction<any>;

  beforeEach(async () => {
    // ✅ Import and setup the mocked executeCommand function
    const commandModule = await import('../utils/command.js');
    mockExecuteCommand = commandModule.executeCommand as MockedFunction<any>;

    // ✅ Default success behavior for executeCommand
    mockExecuteCommand.mockResolvedValue({
      success: true,
      output: 'Build settings output\nBUILD_SETTING = value',
      error: '',
    });

    vi.clearAllMocks();
  });

  // ✅ Test actual production functions
  describe('show_build_set_ws parameter validation', () => {
    let showBuildSettingsTool: any;

    beforeEach(() => {
      showBuildSettingsTool = getRegisteredTool(
        registerShowBuildSettingsWorkspaceTool,
        'show_build_set_ws',
      );
    });

    it('should reject missing workspacePath parameter', async () => {
      const result = await showBuildSettingsTool.handler({ scheme: 'MyScheme' });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'workspacePath' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject missing scheme parameter', async () => {
      const result = await showBuildSettingsTool.handler({
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
  });

  describe('show_build_set_proj parameter validation', () => {
    let showBuildSettingsTool: any;

    beforeEach(() => {
      showBuildSettingsTool = getRegisteredTool(
        registerShowBuildSettingsProjectTool,
        'show_build_set_proj',
      );
    });

    it('should reject missing projectPath parameter', async () => {
      const result = await showBuildSettingsTool.handler({ scheme: 'MyScheme' });
      expect(result.content).toEqual([
        {
          type: 'text',
          text: "Required parameter 'projectPath' is missing. Please provide a value for this parameter.",
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should reject missing scheme parameter', async () => {
      const result = await showBuildSettingsTool.handler({
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
  });

  describe('list_schems_ws parameter validation', () => {
    let listSchemesTool: any;

    beforeEach(() => {
      listSchemesTool = getRegisteredTool(registerListSchemesWorkspaceTool, 'list_schems_ws');
    });

    it('should reject missing workspacePath parameter', async () => {
      const result = await listSchemesTool.handler({});
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
    let listSchemesTool: any;

    beforeEach(() => {
      listSchemesTool = getRegisteredTool(registerListSchemesProjectTool, 'list_schems_proj');
    });

    it('should reject missing projectPath parameter', async () => {
      const result = await listSchemesTool.handler({});
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
    let showBuildSettingsTool: any;

    beforeEach(() => {
      showBuildSettingsTool = getRegisteredTool(
        registerShowBuildSettingsWorkspaceTool,
        'show_build_set_ws',
      );
    });

    it('should show build settings for workspace successfully', async () => {
      const params = {
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      };

      const result = await showBuildSettingsTool.handler(params);

      expect(result.content).toEqual([
        { type: 'text', text: '✅ Build settings for scheme MyScheme:' },
        { type: 'text', text: 'Build settings output\nBUILD_SETTING = value' },
      ]);
      expect(result.isError).toBe(false);

      // ✅ Verify actual production function called external dependency correctly
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
      // ✅ Mock external dependency failure
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Build settings error occurred',
      });

      const params = {
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      };

      const result = await showBuildSettingsTool.handler(params);

      expect(result.content).toEqual([
        { type: 'text', text: 'Failed to show build settings: Build settings error occurred' },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('show_build_set_proj success scenarios', () => {
    let showBuildSettingsTool: any;

    beforeEach(() => {
      showBuildSettingsTool = getRegisteredTool(
        registerShowBuildSettingsProjectTool,
        'show_build_set_proj',
      );
    });

    it('should show build settings for project successfully', async () => {
      const params = {
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      };

      const result = await showBuildSettingsTool.handler(params);

      expect(result.content).toEqual([
        { type: 'text', text: '✅ Build settings for scheme MyScheme:' },
        { type: 'text', text: 'Build settings output\nBUILD_SETTING = value' },
      ]);
      expect(result.isError).toBe(false);

      // ✅ Verify actual production function called external dependency correctly
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
      // ✅ Mock external dependency failure
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Project build settings error',
      });

      const params = {
        projectPath: '/path/to/MyProject.xcodeproj',
        scheme: 'MyScheme',
      };

      const result = await showBuildSettingsTool.handler(params);

      expect(result.content).toEqual([
        { type: 'text', text: 'Failed to show build settings: Project build settings error' },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('list_schems_ws success scenarios', () => {
    let listSchemesTool: any;

    beforeEach(() => {
      listSchemesTool = getRegisteredTool(registerListSchemesWorkspaceTool, 'list_schems_ws');
    });

    it('should list schemes for workspace successfully', async () => {
      // ✅ Mock external dependency output with schemes section
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

      const result = await listSchemesTool.handler(params);

      expect(result.content).toEqual([
        { type: 'text', text: '✅ Available schemes:' },
        { type: 'text', text: 'MyApp\nMyAppTests' },
        {
          type: 'text',
          text: 'Next Steps:\n1. Build the app: macos_build_workspace({ workspacePath: "/path/to/MyProject.xcworkspace", scheme: "MyApp" })\n   or for iOS: ios_simulator_build_by_name_workspace({ workspacePath: "/path/to/MyProject.xcworkspace", scheme: "MyApp", simulatorName: "iPhone 16" })\n2. Show build settings: show_build_set_ws({ workspacePath: "/path/to/MyProject.xcworkspace", scheme: "MyApp" })',
        },
      ]);
      expect(result.isError).toBe(false);

      // ✅ Verify actual production function called external dependency correctly
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        ['xcodebuild', '-list', '-workspace', '/path/to/MyProject.xcworkspace'],
        'List Schemes',
      );
    });

    it('should handle missing schemes section in workspace output', async () => {
      // ✅ Mock external dependency output without schemes section
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Information about project "MyProject":\n    Targets:\n        MyApp',
        error: '',
      });

      const params = { workspacePath: '/path/to/MyProject.xcworkspace' };

      const result = await listSchemesTool.handler(params);

      expect(result.content).toEqual([{ type: 'text', text: 'No schemes found in the output' }]);
      expect(result.isError).toBe(true);
    });

    it('should handle command failure for workspace scheme listing', async () => {
      // ✅ Mock external dependency failure
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Failed to list workspace schemes',
      });

      const params = { workspacePath: '/path/to/MyProject.xcworkspace' };

      const result = await listSchemesTool.handler(params);

      expect(result.content).toEqual([
        { type: 'text', text: 'Failed to list schemes: Failed to list workspace schemes' },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  describe('list_schems_proj success scenarios', () => {
    let listSchemesTool: any;

    beforeEach(() => {
      listSchemesTool = getRegisteredTool(registerListSchemesProjectTool, 'list_schems_proj');
    });

    it('should list schemes for project successfully', async () => {
      // ✅ Mock external dependency output with schemes section
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

      const result = await listSchemesTool.handler(params);

      expect(result.content).toEqual([
        { type: 'text', text: '✅ Available schemes:' },
        { type: 'text', text: 'MyApp\nMyAppTests' },
        {
          type: 'text',
          text: 'Next Steps:\n1. Build the app: macos_build_project({ projectPath: "/path/to/MyProject.xcodeproj", scheme: "MyApp" })\n   or for iOS: ios_simulator_build_by_name_project({ projectPath: "/path/to/MyProject.xcodeproj", scheme: "MyApp", simulatorName: "iPhone 16" })\n2. Show build settings: show_build_set_proj({ projectPath: "/path/to/MyProject.xcodeproj", scheme: "MyApp" })',
        },
      ]);
      expect(result.isError).toBe(false);

      // ✅ Verify actual production function called external dependency correctly
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        ['xcodebuild', '-list', '-project', '/path/to/MyProject.xcodeproj'],
        'List Schemes',
      );
    });

    it('should handle missing schemes section in project output', async () => {
      // ✅ Mock external dependency output without schemes section
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Information about project "MyProject":\n    Targets:\n        MyApp',
        error: '',
      });

      const params = { projectPath: '/path/to/MyProject.xcodeproj' };

      const result = await listSchemesTool.handler(params);

      expect(result.content).toEqual([{ type: 'text', text: 'No schemes found in the output' }]);
      expect(result.isError).toBe(true);
    });

    it('should handle command failure for project scheme listing', async () => {
      // ✅ Mock external dependency failure
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Failed to list project schemes',
      });

      const params = { projectPath: '/path/to/MyProject.xcodeproj' };

      const result = await listSchemesTool.handler(params);

      expect(result.content).toEqual([
        { type: 'text', text: 'Failed to list schemes: Failed to list project schemes' },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  // ✅ Error handling tests
  describe('error handling edge cases', () => {
    it('should handle empty output for build settings', async () => {
      // ✅ Mock external dependency with empty output
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: '',
        error: '',
      });

      const showBuildSettingsTool = getRegisteredTool(
        registerShowBuildSettingsWorkspaceTool,
        'show_build_set_ws',
      );
      const params = {
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      };

      const result = await showBuildSettingsTool.handler(params);

      expect(result.content).toEqual([
        { type: 'text', text: '✅ Build settings for scheme MyScheme:' },
        { type: 'text', text: 'Build settings retrieved successfully.' },
      ]);
      expect(result.isError).toBe(false);
    });

    it('should handle execution exceptions for build settings', async () => {
      // ✅ Mock external dependency to throw an error
      mockExecuteCommand.mockRejectedValue(new Error('Spawn execution failed'));

      const showBuildSettingsTool = getRegisteredTool(
        registerShowBuildSettingsWorkspaceTool,
        'show_build_set_ws',
      );
      const params = {
        workspacePath: '/path/to/MyProject.xcworkspace',
        scheme: 'MyScheme',
      };

      const result = await showBuildSettingsTool.handler(params);

      expect(result.content).toEqual([
        { type: 'text', text: 'Error showing build settings: Spawn execution failed' },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle execution exceptions for scheme listing', async () => {
      // ✅ Mock external dependency to throw an error
      mockExecuteCommand.mockRejectedValue(new Error('List schemes execution failed'));

      const listSchemesTool = getRegisteredTool(registerListSchemesWorkspaceTool, 'list_schems_ws');
      const params = { workspacePath: '/path/to/MyProject.xcworkspace' };

      const result = await listSchemesTool.handler(params);

      expect(result.content).toEqual([
        { type: 'text', text: 'Error listing schemes: List schemes execution failed' },
      ]);
      expect(result.isError).toBe(true);
    });
  });

  // ✅ Tool registration verification
  describe('tool registration', () => {
    it('should register all 4 tools with correct names', () => {
      const expectedTools = [
        'show_build_set_ws',
        'show_build_set_proj',
        'list_schems_ws',
        'list_schems_proj',
      ];

      const mockServer = createMockServer();

      // ✅ Register all tools
      registerShowBuildSettingsWorkspaceTool(mockServer);
      registerShowBuildSettingsProjectTool(mockServer);
      registerListSchemesWorkspaceTool(mockServer);
      registerListSchemesProjectTool(mockServer);

      // ✅ Verify exactly 4 tools registered
      expect(mockServer.tools.size).toBe(4);

      // ✅ Verify correct tool names
      expectedTools.forEach((toolName) => {
        expect(mockServer.tools.has(toolName)).toBe(true);
      });
    });
  });
});
