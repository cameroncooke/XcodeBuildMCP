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
import { createTypedTool } from '../../../utils/typed-tool-factory.js';
import { getDefaultCommandExecutor } from '../../../utils/command.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Using McpServer type from SDK instead of custom interface

// Configuration for LLM parameters - made configurable instead of hardcoded
interface LLMConfig {
  maxTokens: number;
  temperature?: number;
}

// Default LLM configuration with environment variable overrides
const getLLMConfig = (): LLMConfig => ({
  maxTokens: process.env.XCODEBUILDMCP_LLM_MAX_TOKENS
    ? parseInt(process.env.XCODEBUILDMCP_LLM_MAX_TOKENS, 10)
    : 200,
  temperature: process.env.XCODEBUILDMCP_LLM_TEMPERATURE
    ? parseFloat(process.env.XCODEBUILDMCP_LLM_TEMPERATURE)
    : undefined,
});

/**
 * Sanitizes user input to prevent injection attacks and ensure safe LLM usage
 * @param input The raw user input to sanitize
 * @returns Sanitized input safe for LLM processing
 */
function sanitizeTaskDescription(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Task description must be a non-empty string');
  }

  // Remove control characters and normalize whitespace
  let sanitized = input
    // eslint-disable-next-line no-control-regex -- Intentional control character removal for security
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Length validation - prevent excessively long inputs
  if (sanitized.length === 0) {
    throw new Error('Task description cannot be empty after sanitization');
  }

  if (sanitized.length > 2000) {
    sanitized = sanitized.substring(0, 2000);
    log('warn', 'Task description truncated to 2000 characters for safety');
  }

  // Basic injection prevention - remove potential prompt injection patterns
  const suspiciousPatterns = [
    /ignore\s+previous\s+instructions/gi,
    /forget\s+everything/gi,
    /system\s*:/gi,
    /assistant\s*:/gi,
    /you\s+are\s+now/gi,
    /act\s+as/gi,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitized)) {
      log('warn', 'Potentially suspicious pattern detected in task description');
      sanitized = sanitized.replace(pattern, '[filtered]');
    }
  }

  return sanitized;
}

// Define schema as ZodObject
const discoverToolsSchema = z.object({
  task_description: z
    .string()
    .describe(
      'A detailed description of the development task you want to accomplish. ' +
        "For example: 'I need to build my iOS app and run it on the iPhone 16 simulator.' " +
        'If working with Xcode projects, explicitly state whether you are using a .xcworkspace (workspace) or a .xcodeproj (project).',
    ),
  additive: z
    .boolean()
    .optional()
    .describe(
      'If true, add the discovered tools to existing enabled workflows. ' +
        'If false (default), replace all existing workflows with the newly discovered one. ' +
        'Use additive mode when you need tools from multiple workflows simultaneously.',
    ),
});

// Use z.infer for type safety
type DiscoverToolsParams = z.infer<typeof discoverToolsSchema>;

// Dependencies interface for dependency injection
interface Dependencies {
  getAvailableWorkflows?: () => string[];
  generateWorkflowDescriptions?: () => string;
  enableWorkflows?: (server: McpServer, workflows: string[], additive?: boolean) => Promise<void>;
}

export async function discover_toolsLogic(
  args: DiscoverToolsParams,
  _executor?: unknown,
  deps?: Dependencies,
): Promise<ToolResponse> {
  // Enhanced null safety checks
  if (!args || typeof args !== 'object') {
    return createTextResponse('Invalid arguments provided to discover_tools', true);
  }

  const { task_description, additive } = args;

  // Sanitize the task description to prevent injection attacks
  let sanitizedTaskDescription: string;
  try {
    sanitizedTaskDescription = sanitizeTaskDescription(task_description);
    log('info', `Discovering tools for task: ${sanitizedTaskDescription}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid task description';
    log('error', `Task description sanitization failed: ${errorMessage}`);
    return createTextResponse(`Invalid task description: ${errorMessage}`, true);
  }

  try {
    // Get the server instance from the global context
    const server = (globalThis as { mcpServer?: McpServer }).mcpServer;
    if (!server) {
      throw new Error('Server instance not available');
    }

    // 1. Check for sampling capability
    const clientCapabilities = server.server?.getClientCapabilities?.();
    if (!clientCapabilities?.sampling) {
      log('warn', 'Client does not support sampling capability');
      return createTextResponse(
        'Your client does not support the sampling feature required for dynamic tool discovery. ' +
          'Please use XCODEBUILDMCP_DYNAMIC_TOOLS=false to use the standard tool set.',
        true,
      );
    }

    // 2. Get available workflows using generated metadata
    const workflowNames = (deps?.getAvailableWorkflows ?? getAvailableWorkflows)();
    const workflowDescriptions = (
      deps?.generateWorkflowDescriptions ?? generateWorkflowDescriptions
    )();

    // 3. Construct the prompt for the LLM using sanitized input
    const userPrompt = `You are an expert assistant for the XcodeBuildMCP server. Your task is to select the most relevant workflow for a user's Apple development request.

The user wants to perform the following task: "${sanitizedTaskDescription}"

IMPORTANT: Select EXACTLY ONE workflow that best matches the user's task. In most cases, users are working with a project or workspace. Use this selection guide:

Primary (project/workspace-based) workflows:
- iOS simulator with .xcworkspace: choose "simulator-workspace"
- iOS simulator with .xcodeproj: choose "simulator-project"
- iOS physical device with .xcworkspace: choose "device-workspace"
- iOS physical device with .xcodeproj: choose "device-project"
- macOS with .xcworkspace: choose "macos-workspace"
- macOS with .xcodeproj: choose "macos-project"
- Swift Package Manager (no Xcode project): choose "swift-package"

Secondary (task-based, no project/workspace needed):
- Simulator management (boot, list, open, status bar, appearance, GPS/location): choose "simulator-management"
- Logging or log capture (simulator or device): choose "logging"
- UI automation/gestures/screenshots on a simulator app: choose "ui-testing"
- System/environment diagnostics or validation: choose "diagnostics"
- Create new iOS/macOS projects from templates: choose "project-scaffolding"

All available workflows:
${workflowDescriptions}

Respond with ONLY a JSON array containing ONE workflow name that best matches the task (e.g., ["simulator-workspace"]).`;

    // 4. Send sampling request with configurable parameters
    const llmConfig = getLLMConfig();
    log('debug', `Sending sampling request to client LLM with maxTokens: ${llmConfig.maxTokens}`);
    if (!server.server?.createMessage) {
      throw new Error('Server does not support message creation');
    }

    const samplingOptions: {
      messages: Array<{ role: 'user'; content: { type: 'text'; text: string } }>;
      maxTokens: number;
      temperature?: number;
    } = {
      messages: [{ role: 'user', content: { type: 'text', text: userPrompt } }],
      maxTokens: llmConfig.maxTokens,
    };

    // Only add temperature if configured
    if (llmConfig.temperature !== undefined) {
      samplingOptions.temperature = llmConfig.temperature;
    }

    const samplingResult = await server.server.createMessage(samplingOptions);

    // 5. Parse the response with enhanced null safety checks
    let selectedWorkflows: string[] = [];
    try {
      // Enhanced null safety - check if samplingResult exists and has expected structure
      if (!samplingResult || typeof samplingResult !== 'object') {
        throw new Error('Invalid sampling result: null or not an object');
      }

      const content = (
        samplingResult as {
          content?: Array<{ type: 'text'; text: string }> | { type: 'text'; text: string } | null;
        }
      ).content;

      if (!content) {
        throw new Error('No content in sampling response');
      }

      let responseText = '';

      // Handle both array and single object content formats with enhanced null checks
      if (Array.isArray(content)) {
        if (content.length === 0) {
          throw new Error('Empty content array in sampling response');
        }
        const firstItem = content[0];
        if (!firstItem || typeof firstItem !== 'object' || firstItem.type !== 'text') {
          throw new Error('Invalid first content item in array');
        }
        if (!firstItem.text || typeof firstItem.text !== 'string') {
          throw new Error('Invalid text content in first array item');
        }
        responseText = firstItem.text.trim();
      } else if (
        content &&
        typeof content === 'object' &&
        'type' in content &&
        content.type === 'text' &&
        'text' in content &&
        typeof content.text === 'string'
      ) {
        responseText = content.text.trim();
      } else {
        throw new Error('Invalid content format in sampling response');
      }

      if (!responseText) {
        throw new Error('Empty response text after parsing');
      }

      log('debug', `LLM response: ${responseText}`);

      const parsedResponse: unknown = JSON.parse(responseText);

      if (!Array.isArray(parsedResponse)) {
        throw new Error('Response is not an array');
      }

      // Validate that all items are strings
      if (!parsedResponse.every((item): item is string => typeof item === 'string')) {
        throw new Error('Response array contains non-string items');
      }

      selectedWorkflows = parsedResponse;

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
      // Extract the response text for error reporting with enhanced null safety
      let errorResponseText = 'Unknown response format';
      try {
        if (samplingResult && typeof samplingResult === 'object') {
          const content = (
            samplingResult as {
              content?:
                | Array<{ type: 'text'; text: string }>
                | { type: 'text'; text: string }
                | null;
            }
          ).content;

          if (content && Array.isArray(content) && content.length > 0) {
            const firstItem = content[0];
            if (
              firstItem &&
              typeof firstItem === 'object' &&
              firstItem.type === 'text' &&
              typeof firstItem.text === 'string'
            ) {
              errorResponseText = firstItem.text;
            }
          } else if (
            content &&
            typeof content === 'object' &&
            'type' in content &&
            content.type === 'text' &&
            'text' in content &&
            typeof content.text === 'string'
          ) {
            errorResponseText = content.text;
          }
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
    await (deps?.enableWorkflows ?? enableWorkflows)(server, selectedWorkflows, isAdditive);

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
    'Analyzes a natural language task description and enables the most relevant development workflow. Prioritizes project/workspace workflows (simulator/device/macOS) and also supports task-based workflows (simulator-management, logging, diagnostics) and Swift packages.',
  schema: discoverToolsSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    discoverToolsSchema,
    (params: DiscoverToolsParams, executor) => {
      return discover_toolsLogic(params, executor);
    },
    getDefaultCommandExecutor,
  ),
};
