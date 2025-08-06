import { log } from '../utils/logger.js';
import { getDefaultCommandExecutor, CommandExecutor } from '../utils/command.js';
import { WORKFLOW_LOADERS, WorkflowName, WORKFLOW_METADATA } from './generated-plugins.js';
import { ToolResponse } from '../types/common.js';
import { PluginMeta } from './plugin-types.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  registerAndTrackTools,
  removeTrackedTools,
  isToolRegistered,
} from '../utils/tool-registry.js';
import { ZodRawShape } from 'zod';

// Track enabled workflows and their tools for replacement functionality
const enabledWorkflows = new Set<string>();
const enabledTools = new Map<string, string>(); // toolName -> workflowName

// Type for the handler function from our tools
type ToolHandler = (
  args: Record<string, unknown>,
  executor: CommandExecutor,
) => Promise<ToolResponse>;

// Use the actual McpServer type from the SDK instead of a custom interface

/**
 * Wrapper function to adapt MCP SDK handler calling convention to our dependency injection pattern
 * MCP SDK calls handlers with just (args), but our handlers expect (args, executor)
 */
function wrapHandlerWithExecutor(handler: ToolHandler) {
  return async (args: unknown): Promise<ToolResponse> => {
    return handler(args as Record<string, unknown>, getDefaultCommandExecutor());
  };
}

/**
 * Clear currently enabled workflows by actually removing registered tools
 */
export function clearEnabledWorkflows(): void {
  if (enabledTools.size === 0) {
    log('debug', 'No tools to clear');
    return;
  }

  const clearedWorkflows = Array.from(enabledWorkflows);
  const toolNamesToRemove = Array.from(enabledTools.keys());
  const clearedToolCount = toolNamesToRemove.length;

  log('info', `Removing ${clearedToolCount} tools from workflows: ${clearedWorkflows.join(', ')}`);

  // Actually remove the registered tools using the tool registry
  const removedTools = removeTrackedTools(toolNamesToRemove);

  // Clear our tracking
  enabledWorkflows.clear();
  enabledTools.clear();

  log('info', `✅ Removed ${removedTools.length} tools successfully`);
}

/**
 * Get currently enabled workflows
 */
export function getEnabledWorkflows(): string[] {
  return Array.from(enabledWorkflows);
}

/**
 * Enable workflows by registering their tools dynamically using generated loaders
 * @param server - MCP server instance
 * @param workflowNames - Array of workflow names to enable
 * @param additive - If true, add to existing workflows. If false (default), replace existing workflows
 */
export async function enableWorkflows(
  server: McpServer,
  workflowNames: string[],
  additive: boolean = false,
): Promise<void> {
  if (!server) {
    throw new Error('Server instance not available for dynamic tool registration');
  }

  // Clear existing workflow tracking unless in additive mode
  if (!additive && enabledWorkflows.size > 0) {
    log('info', `Replacing existing workflows: ${Array.from(enabledWorkflows).join(', ')}`);
    clearEnabledWorkflows();
  }

  let totalToolsAdded = 0;

  for (const workflowName of workflowNames) {
    const loader = WORKFLOW_LOADERS[workflowName as WorkflowName];

    if (!loader) {
      log('warn', `Workflow '${workflowName}' not found in available workflows`);
      continue;
    }

    try {
      log('info', `Loading workflow '${workflowName}' with code-splitting...`);

      // Dynamic import with code-splitting
      const workflowModule = (await loader()) as Record<string, unknown>;

      // Get tools count from the module (excluding 'workflow' key)
      const toolKeys = Object.keys(workflowModule).filter((key) => key !== 'workflow');

      log('info', `Enabling ${toolKeys.length} tools from '${workflowName}' workflow`);

      const toolsToRegister: Array<{
        name: string;
        config: {
          title?: string;
          description?: string;
          inputSchema?: ZodRawShape;
          outputSchema?: ZodRawShape;
          annotations?: Record<string, unknown>;
        };
        callback: (args: Record<string, unknown>) => Promise<ToolResponse>;
      }> = [];

      // Collect all tools from this workflow, filtering out already-registered tools
      for (const toolKey of toolKeys) {
        const tool = workflowModule[toolKey] as PluginMeta | undefined;

        if (tool?.name && typeof tool.handler === 'function') {
          // Always skip tools that are already registered (in all modes)
          if (isToolRegistered(tool.name)) {
            log('debug', `Skipping already registered tool: ${tool.name}`);
            continue;
          }

          toolsToRegister.push({
            name: tool.name,
            config: {
              description: tool.description ?? '',
              inputSchema: tool.schema,
            },
            callback: wrapHandlerWithExecutor(tool.handler as ToolHandler),
          });

          // Track the tool and workflow
          enabledTools.set(tool.name, workflowName);
          totalToolsAdded++;
        } else {
          log('warn', `Invalid tool definition for '${toolKey}' in workflow '${workflowName}'`);
        }
      }

      // Register all tools using bulk registration
      if (toolsToRegister.length > 0) {
        log(
          'info',
          `🚀 Registering ${toolsToRegister.length} tools from '${workflowName}' workflow`,
        );

        // Convert to proper tool registration format
        const toolRegistrations = toolsToRegister.map((tool) => ({
          name: tool.name,
          config: {
            description: tool.config.description,
            inputSchema: tool.config.inputSchema as unknown,
          },
          callback: (args: unknown): Promise<ToolResponse> =>
            tool.callback(args as Record<string, unknown>),
        }));

        // Use bulk registration - no fallback needed with proper duplicate handling
        const registeredTools = registerAndTrackTools(server, toolRegistrations);
        log('info', `✅ Registered ${registeredTools.length} tools from '${workflowName}'`);
      } else {
        log('info', `No new tools to register from '${workflowName}' (all already registered)`);
      }

      // Track the workflow as enabled
      enabledWorkflows.add(workflowName);
    } catch (error) {
      log(
        'error',
        `Failed to load workflow '${workflowName}': ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // registerAndTrackTools() handles tool list change notifications automatically

  log(
    'info',
    `✅ Successfully enabled ${totalToolsAdded} tools from ${workflowNames.length} workflows`,
  );
}

/**
 * Get list of currently available workflows using generated metadata
 */
export function getAvailableWorkflows(): string[] {
  return Object.keys(WORKFLOW_LOADERS);
}

/**
 * Get workflow information for LLM prompt generation using generated metadata
 */
export function generateWorkflowDescriptions(): string {
  return Object.entries(WORKFLOW_METADATA)
    .map(([name, metadata]) => `- **${name.toUpperCase()}**: ${metadata.description}`)
    .join('\n');
}
