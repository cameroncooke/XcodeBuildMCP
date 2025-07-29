import { z } from 'zod';
import { createTextResponse } from '../../../utils/index.js';
import { log } from '../../../utils/index.js';
// Removed CreateMessageResultSchema import as it's no longer used
import { ToolResponse } from '../../../types/common.js';
import {
  enableWorkflows,
  getAvailableWorkflows,
  generateWorkflowDescriptions,
} from '../../../core/dynamic-tools.js';

// Import the MCP server interface type
interface MCPServerInterface {
  tool(
    name: string,
    description: string,
    schema: unknown,
    handler: (args: unknown) => Promise<unknown>,
  ): void;
  notifyToolsChanged?: () => Promise<void>;
}

// Dependencies interface for dependency injection
interface Dependencies {
  getAvailableWorkflows?: () => string[];
  generateWorkflowDescriptions?: () => string;
  enableWorkflows?: (
    server: Record<string, unknown>,
    workflows: string[],
    additive?: boolean,
  ) => Promise<void>;
}

export async function discover_toolsLogic(
  args: Record<string, unknown>,
  deps?: Dependencies,
): Promise<ToolResponse> {
  const { task_description, additive } = args;
  log('info', `Discovering tools for task: ${task_description}`);

  try {
    // Get the server instance from the global context
    const server = (globalThis as { mcpServer?: Record<string, unknown> }).mcpServer;
    if (!server) {
      throw new Error('Server instance not available');
    }

    // 1. Check for sampling capability
    const serverInstance = (server.server || server) as Record<string, unknown> & {
      _clientCapabilities?: { sampling?: boolean };
      request: (params: {
        method: string;
        params: unknown;
      }) => Promise<{ content?: Array<{ text?: string }> }>;
    };
    const clientCapabilities = serverInstance._clientCapabilities;
    if (!clientCapabilities?.sampling) {
      log('warn', 'Client does not support sampling capability');
      return createTextResponse(
        'Your client does not support the sampling feature required for dynamic tool discovery. ' +
          'Please use XCODEBUILDMCP_DYNAMIC_TOOLS=false to use the standard tool set.',
        true,
      );
    }

    // 2. Get available workflows using generated metadata
    const workflowNames = (deps?.getAvailableWorkflows || getAvailableWorkflows)();
    const workflowDescriptions = (
      deps?.generateWorkflowDescriptions || generateWorkflowDescriptions
    )();

    // 3. Construct the prompt for the LLM
    const userPrompt = `You are an expert assistant for the XcodeBuildMCP server. Your task is to select the most relevant workflow for a user's Apple development request.

The user wants to perform the following task: "${task_description}"

IMPORTANT: Each workflow represents a complete end-to-end development workflow. Choose ONLY ONE workflow that best matches the user's project type and target platform:

**Project Type Selection Guide:**
- If working with .xcworkspace files (CocoaPods, SPM, multi-project): Choose *-workspace workflows
- If working with .xcodeproj files (single project): Choose *-project workflows  
- If working with Swift Package Manager: Choose swift-package
- If only exploring/discovering projects: Choose project-discovery

**Platform Selection Guide:**
- iOS development on simulators: Choose simulator-workspace or simulator-project
- iOS development on physical devices: Choose device-workspace or device-project
- macOS development: Choose macos-workspace or macos-project

Available Workflows:
${workflowDescriptions}

Respond with ONLY a JSON array containing ONE workflow name that best matches the task (e.g., ["simulator-workspace"]).
Each workflow contains ALL tools needed for its complete development workflow - no need to combine workflows.`;

    // 4. Send sampling request
    log('debug', 'Sending sampling request to client LLM');
    const samplingResult = await serverInstance.request({
      method: 'sampling/createMessage',
      params: {
        messages: [{ role: 'user', content: { type: 'text', text: userPrompt } }],
        maxTokens: 200,
      },
    });

    // 5. Parse the response
    let selectedWorkflows: string[] = [];
    try {
      const content = samplingResult.content as
        | Array<{ type: 'text'; text: string }>
        | { type: 'text'; text: string };
      let responseText = '';

      // Handle both array and single object content formats
      if (Array.isArray(content) && content.length > 0 && content[0].type === 'text') {
        responseText = content[0].text.trim();
      } else if (
        content &&
        typeof content === 'object' &&
        'type' in content &&
        content.type === 'text' &&
        'text' in content
      ) {
        responseText = (content.text as string).trim();
      } else {
        throw new Error('Invalid content format in sampling response');
      }

      log('debug', `LLM response: ${responseText}`);

      selectedWorkflows = JSON.parse(responseText);

      if (!Array.isArray(selectedWorkflows)) {
        throw new Error('Response is not an array');
      }

      // Validate that all selected workflows are valid
      const validWorkflows = selectedWorkflows.filter((workflow) =>
        workflowNames.includes(workflow),
      );
      if (validWorkflows.length !== selectedWorkflows.length) {
        const invalidWorkflows = selectedWorkflows.filter(
          (workflow) => !workflowNames.includes(workflow),
        );
        log('warn', `LLM selected invalid workflows: ${invalidWorkflows.join(', ')}`);
        selectedWorkflows = validWorkflows;
      }
    } catch (error) {
      log('error', `Failed to parse LLM response: ${error}`);
      // Extract the response text for error reporting
      let errorResponseText = 'Unknown response format';
      try {
        const content = samplingResult.content as
          | Array<{ type: 'text'; text: string }>
          | { type: 'text'; text: string };
        if (Array.isArray(content) && content.length > 0 && content[0].type === 'text') {
          errorResponseText = content[0].text;
        } else if (
          content &&
          typeof content === 'object' &&
          'type' in content &&
          content.type === 'text' &&
          'text' in content
        ) {
          errorResponseText = content.text as string;
        }
      } catch {
        // Keep default error message
      }

      return createTextResponse(
        `I was unable to determine the right tools for your task. The AI model returned: "${errorResponseText}". ` +
          `Could you please rephrase your request or try a more specific description?`,
        true,
      );
    }

    // 6. Handle empty selection
    if (selectedWorkflows.length === 0) {
      log('info', 'LLM returned empty workflow selection');
      return createTextResponse(
        "No specific Xcode tools seem necessary for that task. Could you provide more details about what you'd like to accomplish with Xcode?",
      );
    }

    // 7. Enable the selected workflows
    const isAdditive = Boolean(additive);
    log(
      'info',
      `${isAdditive ? 'Adding' : 'Replacing with'} workflows: ${selectedWorkflows.join(', ')}`,
    );
    await (deps?.enableWorkflows || enableWorkflows)(
      server as Record<string, unknown> & MCPServerInterface,
      selectedWorkflows,
      isAdditive,
    );

    // 8. Return success response - we can't easily get tool count ahead of time with dynamic loading
    // but that's okay since the user will see the tools when they're loaded

    const actionWord = isAdditive ? 'Added' : 'Enabled';
    const modeDescription = isAdditive
      ? `Added tools from ${selectedWorkflows.join(', ')} to your existing workflow tools.`
      : `Replaced previous tools with ${selectedWorkflows.join(', ')} workflow tools.`;

    return createTextResponse(
      `✅ ${actionWord} XcodeBuildMCP tools for: ${selectedWorkflows.join(', ')}.\n\n` +
        `${modeDescription}\n\n` +
        `Use XcodeBuildMCP tools for all Apple platform development tasks from now on. ` +
        `Call tools/list to see all available tools for your workflow.`,
    );
  } catch (error) {
    log('error', `Error in discoverTools: ${error}`);
    return createTextResponse(
      `An error occurred while discovering tools: ${error instanceof Error ? error.message : 'Unknown error'}`,
      true,
    );
  }
}

export default {
  name: 'discover_tools',
  description:
    'Analyzes a natural language task description to enable a relevant set of Xcode and Apple development tools for the current session.',
  schema: {
    task_description: z
      .string()
      .describe(
        'A detailed description of the development task you want to accomplish. ' +
          "For example: 'I need to build my iOS app and run it on the iPhone 15 Pro simulator.'",
      ),
    additive: z
      .boolean()
      .optional()
      .describe(
        'If true, add the discovered tools to existing enabled workflows. ' +
          'If false (default), replace all existing workflows with the newly discovered one. ' +
          'Use additive mode when you need tools from multiple workflows simultaneously.',
      ),
  },
  handler: async (args: Record<string, unknown>): Promise<ToolResponse> => {
    return discover_toolsLogic(args);
  },
};
