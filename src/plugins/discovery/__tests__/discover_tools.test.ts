import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import discoverTools from '../discover_tools.ts';

// Mock only external dependencies, not utility functions
vi.mock('../../utils/index.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    loadWorkflowGroups: vi.fn(),
    enableWorkflows: vi.fn(),
  };
});

// Import the mocked functions
import { loadWorkflowGroups, enableWorkflows } from '../../../utils/index.js';
const mockLoadWorkflowGroups = vi.mocked(loadWorkflowGroups);
const mockEnableWorkflows = vi.mocked(enableWorkflows);

describe('discover_tools', () => {
  let mockServer: any;
  let originalGlobalThis: any;

  beforeEach(() => {
    // Save original globalThis
    originalGlobalThis = globalThis.mcpServer;

    // Create mock server
    mockServer = {
      server: {
        _clientCapabilities: { sampling: true },
        request: vi.fn(),
      },
      notifyToolsChanged: vi.fn(),
    };

    // Set up global server
    (globalThis as any).mcpServer = mockServer;

    // Reset all mocks
    vi.clearAllMocks();

    // Set up mock return values
    mockLoadWorkflowGroups.mockResolvedValue(new Map());
    mockEnableWorkflows.mockResolvedValue();
  });

  afterEach(() => {
    // Restore original globalThis
    globalThis.mcpServer = originalGlobalThis;
  });

  describe('basic functionality', () => {
    it('should have correct tool metadata', () => {
      expect(discoverTools.name).toBe('discover_tools');
      expect(discoverTools.description).toContain('Analyzes a natural language task description');
      expect(discoverTools.schema).toBeDefined();
      expect(discoverTools.handler).toBeInstanceOf(Function);
    });

    it('should validate schema for task_description parameter', () => {
      const schema = discoverTools.schema;
      expect(schema.task_description).toBeDefined();

      // Test valid input
      const validResult = schema.task_description.safeParse('Build my iOS app');
      expect(validResult.success).toBe(true);

      // Test invalid input
      const invalidResult = schema.task_description.safeParse(123);
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('capability detection', () => {
    it('should return error when client lacks sampling capability', async () => {
      // Mock server without sampling capability
      mockServer.server._clientCapabilities = {};

      const result = await discoverTools.handler({ task_description: 'Build my app' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        'Your client does not support the sampling feature required for dynamic tool discovery. Please use XCODEBUILDMCP_DYNAMIC_TOOLS=false to use the standard tool set.',
      );
    });

    it('should proceed when client has sampling capability', async () => {
      // Mock workflow groups
      const mockWorkflowGroups = new Map([
        [
          'simulator-workspace',
          {
            workflow: {
              name: 'iOS Simulator Workspace',
              description: 'iOS development for workspaces',
            },
            tools: [{ name: 'build_sim_ws', handler: vi.fn() }],
            directoryName: 'simulator-workspace',
          },
        ],
      ]);

      mockLoadWorkflowGroups.mockResolvedValue(mockWorkflowGroups);

      // Mock successful LLM response
      mockServer.server.request.mockResolvedValue({
        content: [{ type: 'text', text: '["simulator-workspace"]' }],
      });

      mockEnableWorkflows.mockResolvedValue();

      const result = await discoverTools.handler({ task_description: 'Build my iOS app' });

      expect(result.isError).toBeFalsy();
      expect(mockLoadWorkflowGroups).toHaveBeenCalled();
    });
  });

  describe('workflow loading', () => {
    it('should load workflow groups and build descriptions', async () => {
      const mockWorkflowGroups = new Map([
        [
          'simulator-workspace',
          {
            workflow: {
              name: 'iOS Simulator Workspace',
              description:
                'Complete iOS development workflow for .xcworkspace files targeting simulators',
            },
            tools: [{ name: 'build_sim_ws', handler: vi.fn() }],
            directoryName: 'simulator-workspace',
          },
        ],
        [
          'macos-project',
          {
            workflow: {
              name: 'macOS Project',
              description: 'Complete macOS development workflow for .xcodeproj files',
            },
            tools: [{ name: 'build_mac_proj', handler: vi.fn() }],
            directoryName: 'macos-project',
          },
        ],
      ]);

      mockLoadWorkflowGroups.mockResolvedValue(mockWorkflowGroups);

      // Mock LLM response
      mockServer.server.request.mockResolvedValue({
        content: [{ type: 'text', text: '["simulator-workspace"]' }],
      });

      mockEnableWorkflows.mockResolvedValue();

      await discoverTools.handler({ task_description: 'Build my iOS app' });

      // Verify workflow groups were loaded
      expect(mockLoadWorkflowGroups).toHaveBeenCalled();

      // Verify LLM prompt includes workflow descriptions
      const requestCall = mockServer.server.request.mock.calls[0];
      const prompt = requestCall[0].params.messages[0].content.text;

      expect(prompt).toContain('SIMULATOR-WORKSPACE');
      expect(prompt).toContain(
        'Complete iOS development workflow for .xcworkspace files targeting simulators',
      );
      expect(prompt).toContain('MACOS-PROJECT');
      expect(prompt).toContain('Complete macOS development workflow for .xcodeproj files');
    });
  });

  describe('LLM interaction', () => {
    beforeEach(() => {
      const mockWorkflowGroups = new Map([
        [
          'simulator-workspace',
          {
            workflow: {
              name: 'iOS Simulator Workspace',
              description: 'iOS development for workspaces',
            },
            tools: [{ name: 'build_sim_ws', handler: vi.fn() }],
            directoryName: 'simulator-workspace',
          },
        ],
      ]);
      mockLoadWorkflowGroups.mockResolvedValue(mockWorkflowGroups);
      mockEnableWorkflows.mockResolvedValue();
    });

    it('should send correct sampling request to LLM', async () => {
      mockServer.server.request.mockResolvedValue({
        content: [{ type: 'text', text: '["simulator-workspace"]' }],
      });

      await discoverTools.handler({ task_description: 'Build my iOS app and test it' });

      expect(mockServer.server.request).toHaveBeenCalledWith(
        {
          method: 'sampling/createMessage',
          params: {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: expect.stringContaining('Build my iOS app and test it'),
                },
              },
            ],
            maxTokens: 200,
          },
        },
        expect.any(Object),
      );
    });

    it('should handle array content format in LLM response', async () => {
      mockServer.server.request.mockResolvedValue({
        content: [{ type: 'text', text: '["simulator-workspace"]' }],
      });

      const result = await discoverTools.handler({ task_description: 'Build my app' });

      expect(result.isError).toBeFalsy();
      expect(mockEnableWorkflows).toHaveBeenCalledWith(
        mockServer,
        ['simulator-workspace'],
        expect.any(Map),
      );
    });

    it('should handle single object content format in LLM response', async () => {
      mockServer.server.request.mockResolvedValue({
        content: { type: 'text', text: '["simulator-workspace"]' },
      });

      const result = await discoverTools.handler({ task_description: 'Build my app' });

      expect(result.isError).toBeFalsy();
      expect(mockEnableWorkflows).toHaveBeenCalledWith(
        mockServer,
        ['simulator-workspace'],
        expect.any(Map),
      );
    });

    it('should filter out invalid workflow names from LLM response', async () => {
      mockServer.server.request.mockResolvedValue({
        content: [
          { type: 'text', text: '["simulator-workspace", "invalid-workflow", "another-invalid"]' },
        ],
      });

      const result = await discoverTools.handler({ task_description: 'Build my app' });

      expect(result.isError).toBeFalsy();
      expect(mockEnableWorkflows).toHaveBeenCalledWith(
        mockServer,
        ['simulator-workspace'], // Only valid workflow should remain
        expect.any(Map),
      );
    });

    it('should handle malformed JSON in LLM response', async () => {
      mockServer.server.request.mockResolvedValue({
        content: [{ type: 'text', text: 'This is not JSON at all!' }],
      });

      const result = await discoverTools.handler({ task_description: 'Build my app' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        'I was unable to determine the right tools for your task. The AI model returned: "This is not JSON at all!". Could you please rephrase your request or try a more specific description?',
      );
    });

    it('should handle non-array JSON in LLM response', async () => {
      mockServer.server.request.mockResolvedValue({
        content: [{ type: 'text', text: '{"workflow": "simulator-workspace"}' }],
      });

      const result = await discoverTools.handler({ task_description: 'Build my app' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        'I was unable to determine the right tools for your task. The AI model returned: "{"workflow": "simulator-workspace"}". Could you please rephrase your request or try a more specific description?',
      );
    });

    it('should handle empty workflow selection', async () => {
      mockServer.server.request.mockResolvedValue({
        content: [{ type: 'text', text: '[]' }],
      });

      const result = await discoverTools.handler({ task_description: 'Just saying hello' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(
        "No specific Xcode tools seem necessary for that task. Could you provide more details about what you'd like to accomplish with Xcode?",
      );
      expect(mockEnableWorkflows).not.toHaveBeenCalled();
    });
  });

  describe('workflow enabling', () => {
    beforeEach(() => {
      const mockWorkflowGroups = new Map([
        [
          'simulator-workspace',
          {
            workflow: {
              name: 'iOS Simulator Workspace',
              description: 'iOS development for workspaces',
            },
            tools: [
              { name: 'build_sim_ws', handler: vi.fn() },
              { name: 'test_sim_ws', handler: vi.fn() },
            ],
            directoryName: 'simulator-workspace',
          },
        ],
      ]);
      mockLoadWorkflowGroups.mockResolvedValue(mockWorkflowGroups);
    });

    it('should enable selected workflows and return success message', async () => {
      mockServer.server.request.mockResolvedValue({
        content: [{ type: 'text', text: '["simulator-workspace"]' }],
      });

      mockEnableWorkflows.mockResolvedValue();

      const result = await discoverTools.handler({ task_description: 'Build my iOS app' });

      expect(mockEnableWorkflows).toHaveBeenCalledWith(
        mockServer,
        ['simulator-workspace'],
        expect.any(Map),
      );

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toBe(
        '✅ Successfully enabled 2 XcodeBuildMCP tools for: simulator-workspace.\n\nUse XcodeBuildMCP tools for all Apple platform development tasks from now on. Call tools/list to see all available tools for your workflow.',
      );
    });

    it('should handle workflow enabling errors gracefully', async () => {
      // Set up workflow groups
      const mockWorkflowGroups = new Map([
        [
          'simulator-workspace',
          {
            workflow: {
              name: 'iOS Simulator Workspace',
              description: 'iOS development for workspaces',
            },
            tools: [{ name: 'build_sim_ws', handler: vi.fn() }],
            directoryName: 'simulator-workspace',
          },
        ],
      ]);
      mockLoadWorkflowGroups.mockResolvedValue(mockWorkflowGroups);

      mockServer.server.request.mockResolvedValue({
        content: [{ type: 'text', text: '["simulator-workspace"]' }],
      });

      mockEnableWorkflows.mockRejectedValue(new Error('Failed to enable workflows'));

      const result = await discoverTools.handler({ task_description: 'Build my app' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        'An error occurred while discovering tools: Failed to enable workflows',
      );
    });
  });

  describe('error handling', () => {
    it('should handle missing server instance', async () => {
      (globalThis as any).mcpServer = undefined;

      const result = await discoverTools.handler({ task_description: 'Build my app' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        'An error occurred while discovering tools: Server instance not available',
      );
    });

    it('should handle workflow loading errors', async () => {
      mockLoadWorkflowGroups.mockRejectedValue(new Error('Failed to load workflows'));

      const result = await discoverTools.handler({ task_description: 'Build my app' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        'An error occurred while discovering tools: Failed to load workflows',
      );
    });

    it('should handle LLM request errors', async () => {
      mockLoadWorkflowGroups.mockResolvedValue(new Map());
      mockServer.server.request.mockRejectedValue(new Error('LLM request failed'));

      const result = await discoverTools.handler({ task_description: 'Build my app' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe(
        'An error occurred while discovering tools: LLM request failed',
      );
    });
  });

  describe('prompt generation', () => {
    it('should include task description in LLM prompt', async () => {
      const mockWorkflowGroups = new Map([
        [
          'simulator-workspace',
          {
            workflow: {
              name: 'iOS Simulator Workspace',
              description: 'iOS development for workspaces',
            },
            tools: [{ name: 'build_sim_ws', handler: vi.fn() }],
            directoryName: 'simulator-workspace',
          },
        ],
      ]);

      mockLoadWorkflowGroups.mockResolvedValue(mockWorkflowGroups);
      mockServer.server.request.mockResolvedValue({
        content: [{ type: 'text', text: '["simulator-workspace"]' }],
      });
      mockEnableWorkflows.mockResolvedValue();

      const taskDescription =
        'I need to build my React Native iOS app for the simulator and run tests';

      await discoverTools.handler({ task_description: taskDescription });

      const requestCall = mockServer.server.request.mock.calls[0];
      const prompt = requestCall[0].params.messages[0].content.text;

      expect(prompt).toContain(taskDescription);
      expect(prompt).toContain('Project Type Selection Guide');
      expect(prompt).toContain('Platform Selection Guide');
      expect(prompt).toContain('Available Workflows');
    });

    it('should provide clear selection guidelines in prompt', async () => {
      const mockWorkflowGroups = new Map();
      mockLoadWorkflowGroups.mockResolvedValue(mockWorkflowGroups);
      mockServer.server.request.mockResolvedValue({
        content: [{ type: 'text', text: '[]' }],
      });

      await discoverTools.handler({ task_description: 'Build my app' });

      const requestCall = mockServer.server.request.mock.calls[0];
      const prompt = requestCall[0].params.messages[0].content.text;

      expect(prompt).toContain('Choose ONLY ONE workflow');
      expect(prompt).toContain('If working with .xcworkspace files');
      expect(prompt).toContain('If working with .xcodeproj files');
      expect(prompt).toContain('iOS development on simulators');
      expect(prompt).toContain('macOS development');
      expect(prompt).toContain('Respond with ONLY a JSON array');
    });
  });
});
