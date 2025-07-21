/**
 * Tests for discover_tools plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import discoverTools, { discover_toolsLogic } from '../discover_tools.ts';

// Mock dependencies interface for dependency injection
interface MockDependencies {
  loadWorkflowGroups?: () => Promise<Map<string, any>>;
  enableWorkflows?: (server: any, workflows: string[], groups: Map<string, any>) => Promise<void>;
}

// Track function calls manually for verification
interface CallTracker {
  loadWorkflowGroupsCalls: Array<any[]>;
  enableWorkflowsCalls: Array<any[]>;
}

function createMockDependencies(
  config: {
    workflowGroups?: Map<string, any>;
    enableWorkflowsError?: Error;
    loadWorkflowGroupsError?: Error;
  },
  callTracker: CallTracker,
): MockDependencies {
  return {
    loadWorkflowGroups: config.loadWorkflowGroupsError
      ? async () => {
          callTracker.loadWorkflowGroupsCalls.push([]);
          throw config.loadWorkflowGroupsError;
        }
      : async () => {
          callTracker.loadWorkflowGroupsCalls.push([]);
          return config.workflowGroups || new Map();
        },
    enableWorkflows: config.enableWorkflowsError
      ? async (server: any, workflows: string[], groups: Map<string, any>) => {
          callTracker.enableWorkflowsCalls.push([server, workflows, groups]);
          throw config.enableWorkflowsError;
        }
      : async (server: any, workflows: string[], groups: Map<string, any>) => {
          callTracker.enableWorkflowsCalls.push([server, workflows, groups]);
          return undefined;
        },
  };
}

describe('discover_tools', () => {
  let mockServer: Record<string, unknown>;
  let originalGlobalThis: Record<string, unknown>;
  let callTracker: CallTracker;
  let requestCalls: Array<any[]>;
  let notifyToolsChangedCalls: Array<any[]>;

  beforeEach(() => {
    // Save original globalThis
    originalGlobalThis = globalThis.mcpServer;
    // Initialize call trackers
    callTracker = {
      loadWorkflowGroupsCalls: [],
      enableWorkflowsCalls: [],
    };
    requestCalls = [];
    notifyToolsChangedCalls = [];
    // Create mock server
    mockServer = {
      server: {
        _clientCapabilities: { sampling: true },
        request: async (...args: any[]) => {
          requestCalls.push(args);
          throw new Error('Mock request not configured');
        },
      },
      notifyToolsChanged: (...args: any[]) => {
        notifyToolsChangedCalls.push(args);
      },
    };
    // Set up global server
    (globalThis as any).mcpServer = mockServer;
    // Reset all mocks
  });

  afterEach(() => {
    // Restore original globalThis
    globalThis.mcpServer = originalGlobalThis;
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(discoverTools.name).toBe('discover_tools');
    });

    it('should have correct description', () => {
      expect(discoverTools.description).toBe(
        'Analyzes a natural language task description to enable a relevant set of Xcode and Apple development tools for the current session.',
      );
    });

    it('should have handler function', () => {
      expect(typeof discover_toolsLogic).toBe('function');
    });

    it('should have correct schema with task_description string field', () => {
      const schema = z.object(discoverTools.schema);

      // Valid inputs
      expect(schema.safeParse({ task_description: 'Build my iOS app' }).success).toBe(true);
      expect(schema.safeParse({ task_description: 'Test my React Native app' }).success).toBe(true);

      // Invalid inputs
      expect(schema.safeParse({ task_description: 123 }).success).toBe(false);
      expect(schema.safeParse({ task_description: null }).success).toBe(false);
      expect(schema.safeParse({ task_description: undefined }).success).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  describe('Capability Detection', () => {
    it('should return error when client lacks sampling capability', async () => {
      // Mock server without sampling capability
      mockServer.server._clientCapabilities = {};

      const result = await discover_toolsLogic({ task_description: 'Build my app' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Your client does not support the sampling feature required for dynamic tool discovery. Please use XCODEBUILDMCP_DYNAMIC_TOOLS=false to use the standard tool set.',
          },
        ],
        isError: true,
      });
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
            tools: [{ name: 'build_sim_ws', handler: () => {} }],
            directoryName: 'simulator-workspace',
          },
        ],
      ]);

      const mockDeps = createMockDependencies({ workflowGroups: mockWorkflowGroups }, callTracker);

      // Configure mock request to return successful response
      (mockServer.server as any).request = async (...args: any[]) => {
        requestCalls.push(args);
        return {
          content: [{ type: 'text', text: '["simulator-workspace"]' }],
        };
      };

      const result = await discover_toolsLogic({ task_description: 'Build my iOS app' }, mockDeps);

      expect(result.isError).toBeFalsy();
      expect(callTracker.loadWorkflowGroupsCalls).toHaveLength(1);
    });
  });

  describe('Workflow Loading', () => {
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
            tools: [{ name: 'build_sim_ws', handler: () => {} }],
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
            tools: [{ name: 'build_mac_proj', handler: () => {} }],
            directoryName: 'macos-project',
          },
        ],
      ]);

      const mockDeps = createMockDependencies({ workflowGroups: mockWorkflowGroups }, callTracker);

      // Configure mock request to capture calls and return response
      (mockServer.server as any).request = async (...args: any[]) => {
        requestCalls.push(args);
        return {
          content: [{ type: 'text', text: '["simulator-workspace"]' }],
        };
      };

      await discover_toolsLogic({ task_description: 'Build my iOS app' }, mockDeps);

      // Verify workflow groups were loaded
      expect(callTracker.loadWorkflowGroupsCalls).toHaveLength(1);

      // Verify LLM prompt includes workflow descriptions
      expect(requestCalls).toHaveLength(1);
      const requestCall = requestCalls[0];
      const prompt = requestCall[0].params.messages[0].content.text;

      expect(prompt).toContain('SIMULATOR-WORKSPACE');
      expect(prompt).toContain(
        'Complete iOS development workflow for .xcworkspace files targeting simulators',
      );
      expect(prompt).toContain('MACOS-PROJECT');
      expect(prompt).toContain('Complete macOS development workflow for .xcodeproj files');
    });
  });

  describe('LLM Interaction', () => {
    let mockDeps: MockDependencies;
    let mockWorkflowGroups: Map<string, any>;
    let localCallTracker: CallTracker;

    beforeEach(() => {
      // Reset local call tracker for this describe block
      localCallTracker = {
        loadWorkflowGroupsCalls: [],
        enableWorkflowsCalls: [],
      };
      mockWorkflowGroups = new Map([
        [
          'simulator-workspace',
          {
            workflow: {
              name: 'iOS Simulator Workspace',
              description: 'iOS development for workspaces',
            },
            tools: [{ name: 'build_sim_ws', handler: () => {} }],
            directoryName: 'simulator-workspace',
          },
        ],
      ]);
      mockDeps = createMockDependencies({ workflowGroups: mockWorkflowGroups }, localCallTracker);
    });

    it('should send correct sampling request to LLM', async () => {
      // Reset request calls for this test
      requestCalls.length = 0;

      // Configure mock request to capture calls and return response
      (mockServer.server as any).request = async (...args: any[]) => {
        requestCalls.push(args);
        return {
          content: [{ type: 'text', text: '["simulator-workspace"]' }],
        };
      };

      await discover_toolsLogic({ task_description: 'Build my iOS app and test it' }, mockDeps);

      expect(requestCalls).toHaveLength(1);
      const requestCall = requestCalls[0];
      expect(requestCall[0]).toEqual({
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
      });
      expect(requestCall[1]).toBeDefined(); // Schema parameter
    });

    it('should handle array content format in LLM response', async () => {
      // Reset call trackers for this test
      localCallTracker.enableWorkflowsCalls.length = 0;

      // Configure mock request to return response
      (mockServer.server as any).request = async (...args: any[]) => {
        return {
          content: [{ type: 'text', text: '["simulator-workspace"]' }],
        };
      };

      const result = await discover_toolsLogic({ task_description: 'Build my app' }, mockDeps);

      expect(result.isError).toBeFalsy();
      expect(localCallTracker.enableWorkflowsCalls).toHaveLength(1);
      expect(localCallTracker.enableWorkflowsCalls[0]).toEqual([
        mockServer,
        ['simulator-workspace'],
        mockWorkflowGroups,
      ]);
    });

    it('should handle single object content format in LLM response', async () => {
      // Reset call trackers for this test
      localCallTracker.enableWorkflowsCalls.length = 0;

      // Configure mock request to return response with single object format
      (mockServer.server as any).request = async (...args: any[]) => {
        return {
          content: { type: 'text', text: '["simulator-workspace"]' },
        };
      };

      const result = await discover_toolsLogic({ task_description: 'Build my app' }, mockDeps);

      expect(result.isError).toBeFalsy();
      expect(localCallTracker.enableWorkflowsCalls).toHaveLength(1);
      expect(localCallTracker.enableWorkflowsCalls[0]).toEqual([
        mockServer,
        ['simulator-workspace'],
        mockWorkflowGroups,
      ]);
    });

    it('should filter out invalid workflow names from LLM response', async () => {
      // Reset call trackers for this test
      localCallTracker.enableWorkflowsCalls.length = 0;

      // Configure mock request to return response with invalid workflows
      (mockServer.server as any).request = async (...args: any[]) => {
        return {
          content: [
            {
              type: 'text',
              text: '["simulator-workspace", "invalid-workflow", "another-invalid"]',
            },
          ],
        };
      };

      const result = await discover_toolsLogic({ task_description: 'Build my app' }, mockDeps);

      expect(result.isError).toBeFalsy();
      expect(localCallTracker.enableWorkflowsCalls).toHaveLength(1);
      expect(localCallTracker.enableWorkflowsCalls[0]).toEqual([
        mockServer,
        ['simulator-workspace'], // Only valid workflow should remain
        mockWorkflowGroups,
      ]);
    });

    it('should handle malformed JSON in LLM response', async () => {
      // Configure mock request to return malformed JSON
      (mockServer.server as any).request = async (...args: any[]) => {
        return {
          content: [{ type: 'text', text: 'This is not JSON at all!' }],
        };
      };

      const result = await discover_toolsLogic({ task_description: 'Build my app' }, mockDeps);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'I was unable to determine the right tools for your task. The AI model returned: "This is not JSON at all!". Could you please rephrase your request or try a more specific description?',
          },
        ],
        isError: true,
      });
    });

    it('should handle non-array JSON in LLM response', async () => {
      // Configure mock request to return non-array JSON
      (mockServer.server as any).request = async (...args: any[]) => {
        return {
          content: [{ type: 'text', text: '{"workflow": "simulator-workspace"}' }],
        };
      };

      const result = await discover_toolsLogic({ task_description: 'Build my app' }, mockDeps);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'I was unable to determine the right tools for your task. The AI model returned: "{"workflow": "simulator-workspace"}". Could you please rephrase your request or try a more specific description?',
          },
        ],
        isError: true,
      });
    });

    it('should handle empty workflow selection', async () => {
      // Reset call trackers for this test
      localCallTracker.enableWorkflowsCalls.length = 0;

      // Configure mock request to return empty array
      (mockServer.server as any).request = async (...args: any[]) => {
        return {
          content: [{ type: 'text', text: '[]' }],
        };
      };

      const result = await discover_toolsLogic({ task_description: 'Just saying hello' }, mockDeps);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "No specific Xcode tools seem necessary for that task. Could you provide more details about what you'd like to accomplish with Xcode?",
          },
        ],
        isError: false,
      });
      expect(localCallTracker.enableWorkflowsCalls).toHaveLength(0);
    });
  });

  describe('Workflow Enabling', () => {
    let mockDeps: MockDependencies;
    let mockWorkflowGroups: Map<string, any>;
    let workflowCallTracker: CallTracker;

    beforeEach(() => {
      // Reset call tracker for this describe block
      workflowCallTracker = {
        loadWorkflowGroupsCalls: [],
        enableWorkflowsCalls: [],
      };
      mockWorkflowGroups = new Map([
        [
          'simulator-workspace',
          {
            workflow: {
              name: 'iOS Simulator Workspace',
              description: 'iOS development for workspaces',
            },
            tools: [
              { name: 'build_sim_ws', handler: () => {} },
              { name: 'test_sim_ws', handler: () => {} },
            ],
            directoryName: 'simulator-workspace',
          },
        ],
      ]);
      mockDeps = createMockDependencies(
        { workflowGroups: mockWorkflowGroups },
        workflowCallTracker,
      );
    });

    it('should enable selected workflows and return success message', async () => {
      // Configure mock request to return successful response
      (mockServer.server as any).request = async (...args: any[]) => {
        return {
          content: [{ type: 'text', text: '["simulator-workspace"]' }],
        };
      };

      const result = await discover_toolsLogic({ task_description: 'Build my iOS app' }, mockDeps);

      expect(workflowCallTracker.enableWorkflowsCalls).toHaveLength(1);
      expect(workflowCallTracker.enableWorkflowsCalls[0]).toEqual([
        mockServer,
        ['simulator-workspace'],
        mockWorkflowGroups,
      ]);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ Successfully enabled 2 XcodeBuildMCP tools for: simulator-workspace.\n\nUse XcodeBuildMCP tools for all Apple platform development tasks from now on. Call tools/list to see all available tools for your workflow.',
          },
        ],
        isError: false,
      });
    });

    it('should handle workflow enabling errors gracefully', async () => {
      const errorCallTracker: CallTracker = {
        loadWorkflowGroupsCalls: [],
        enableWorkflowsCalls: [],
      };

      const mockDepsWithError = createMockDependencies(
        {
          workflowGroups: mockWorkflowGroups,
          enableWorkflowsError: new Error('Failed to enable workflows'),
        },
        errorCallTracker,
      );

      // Configure mock request to return successful response
      (mockServer.server as any).request = async (...args: any[]) => {
        return {
          content: [{ type: 'text', text: '["simulator-workspace"]' }],
        };
      };

      const result = await discover_toolsLogic(
        { task_description: 'Build my app' },
        mockDepsWithError,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'An error occurred while discovering tools: Failed to enable workflows',
          },
        ],
        isError: true,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing server instance', async () => {
      (globalThis as any).mcpServer = undefined;

      const result = await discover_toolsLogic({ task_description: 'Build my app' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'An error occurred while discovering tools: Server instance not available',
          },
        ],
        isError: true,
      });
    });

    it('should handle workflow loading errors', async () => {
      const errorCallTracker: CallTracker = {
        loadWorkflowGroupsCalls: [],
        enableWorkflowsCalls: [],
      };

      const mockDepsWithError = createMockDependencies(
        {
          loadWorkflowGroupsError: new Error('Failed to load workflows'),
        },
        errorCallTracker,
      );

      const result = await discover_toolsLogic(
        { task_description: 'Build my app' },
        mockDepsWithError,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'An error occurred while discovering tools: Failed to load workflows',
          },
        ],
        isError: true,
      });
    });

    it('should handle LLM request errors', async () => {
      const errorCallTracker: CallTracker = {
        loadWorkflowGroupsCalls: [],
        enableWorkflowsCalls: [],
      };

      const mockDeps = createMockDependencies({ workflowGroups: new Map() }, errorCallTracker);

      // Configure mock request to throw error
      (mockServer.server as any).request = async (...args: any[]) => {
        throw new Error('LLM request failed');
      };

      const result = await discover_toolsLogic({ task_description: 'Build my app' }, mockDeps);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'An error occurred while discovering tools: LLM request failed',
          },
        ],
        isError: true,
      });
    });
  });

  describe('Prompt Generation', () => {
    it('should include task description in LLM prompt', async () => {
      const promptCallTracker: CallTracker = {
        loadWorkflowGroupsCalls: [],
        enableWorkflowsCalls: [],
      };

      const mockWorkflowGroups = new Map([
        [
          'simulator-workspace',
          {
            workflow: {
              name: 'iOS Simulator Workspace',
              description: 'iOS development for workspaces',
            },
            tools: [{ name: 'build_sim_ws', handler: () => {} }],
            directoryName: 'simulator-workspace',
          },
        ],
      ]);

      const mockDeps = createMockDependencies(
        { workflowGroups: mockWorkflowGroups },
        promptCallTracker,
      );

      // Reset request calls for this test
      requestCalls.length = 0;

      // Configure mock request to capture calls and return response
      (mockServer.server as any).request = async (...args: any[]) => {
        requestCalls.push(args);
        return {
          content: [{ type: 'text', text: '["simulator-workspace"]' }],
        };
      };

      const taskDescription =
        'I need to build my React Native iOS app for the simulator and run tests';

      await discover_toolsLogic({ task_description: taskDescription }, mockDeps);

      expect(requestCalls).toHaveLength(1);
      const requestCall = requestCalls[0];
      const prompt = requestCall[0].params.messages[0].content.text;

      expect(prompt).toContain(taskDescription);
      expect(prompt).toContain('Project Type Selection Guide');
      expect(prompt).toContain('Platform Selection Guide');
      expect(prompt).toContain('Available Workflows');
    });

    it('should provide clear selection guidelines in prompt', async () => {
      const promptCallTracker: CallTracker = {
        loadWorkflowGroupsCalls: [],
        enableWorkflowsCalls: [],
      };

      const mockDeps = createMockDependencies({ workflowGroups: new Map() }, promptCallTracker);

      // Reset request calls for this test
      requestCalls.length = 0;

      // Configure mock request to capture calls and return response
      (mockServer.server as any).request = async (...args: any[]) => {
        requestCalls.push(args);
        return {
          content: [{ type: 'text', text: '[]' }],
        };
      };

      await discover_toolsLogic({ task_description: 'Build my app' }, mockDeps);

      expect(requestCalls).toHaveLength(1);
      const requestCall = requestCalls[0];
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
