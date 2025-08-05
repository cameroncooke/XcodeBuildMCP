import { log } from '../utils/logger.js';
import { getDefaultCommandExecutor, CommandExecutor } from '../utils/command.js';
import { WORKFLOW_LOADERS, WorkflowName, WORKFLOW_METADATA } from './generated-plugins.js';
import { ToolResponse } from '../types/common.js';
import { PluginMeta } from './plugin-types.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAndTrackTools } from '../utils/tool-registry.js';
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
 * Clear tracking of currently enabled workflows
 * Note: MCP doesn't support removing tools, so this only clears our internal tracking.
 * Tool replacement happens by overriding existing tool registrations.
 */
export function clearEnabledWorkflows(): void {
  if (enabledTools.size === 0) {
    log('debug', 'No tools to clear from tracking');
    return;
  }

  const clearedWorkflows = Array.from(enabledWorkflows);
  const clearedToolCount = enabledTools.size;

  log(
    'info',
    `Clearing tracking for ${clearedToolCount} tools from workflows: ${clearedWorkflows.join(', ')}`,
  );

  // Clear our tracking - tools will be overridden by new registrations
  enabledWorkflows.clear();
  enabledTools.clear();

  log('debug', `✅ Cleared tracking for ${clearedToolCount} tools`);
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

      // Collect all tools from this workflow
      for (const toolKey of toolKeys) {
        const tool = workflowModule[toolKey] as PluginMeta | undefined;

        if (tool?.name && typeof tool.handler === 'function') {
          toolsToRegister.push({
            name: tool.name,
            config: {
              description: tool.description ?? '',
              inputSchema: tool.schema, // MCP SDK now handles complex types properly
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

      // Use bulk registration with proper types - no runtime checking needed
      try {
        const availableTools = toolsToRegister.filter((tool) => {
          // In testing/development, check for duplicate registrations
          // The MCP SDK handles this internally, so this is just for logging
          log('debug', `Preparing to register tool: ${tool.name}`);
          return true;
        });

        if (availableTools.length > 0) {
          log('info', `🚀 Enabling ${availableTools.length} tools from '${workflowName}' workflow`);

          // Convert to proper tool registration format, adapting callback signature
          const toolRegistrations = availableTools.map((tool) => ({
            name: tool.name,
            config: {
              description: tool.config.description,
              inputSchema: tool.config.inputSchema as unknown, // Cast to unknown for SDK interface
            },
            // Adapt callback to match SDK's expected signature (args, extra) => result
            callback: (args: unknown): Promise<ToolResponse> =>
              tool.callback(args as Record<string, unknown>),
          }));

          // Use registerTools with proper types and tracking
          const registeredTools = registerAndTrackTools(server, toolRegistrations);
          log('info', `✅ Registered ${registeredTools.length} tools from '${workflowName}'`);
          // registerTools() automatically sends tool list change notification internally
        } else {
          log(
            'info',
            `All ${toolsToRegister.length} tools from '${workflowName}' were already registered`,
          );
        }
      } catch (error) {
        log('error', `Failed to register tools from '${workflowName}': ${error}`);
        // Fallback to simplified tool registration one at a time
        log(
          'info',
          `🚀 Fallback: Enabling ${toolsToRegister.length} tools individually from '${workflowName}' workflow`,
        );
        for (const toolToRegister of toolsToRegister) {
          try {
            // Use the simplified registerTools method with single tool to avoid type complexity
            const singleToolRegistration = [
              {
                name: toolToRegister.name,
                config: {
                  description: toolToRegister.config.description,
                  inputSchema: toolToRegister.config.inputSchema as unknown, // Cast to unknown for SDK interface
                },
                // Adapt callback to match SDK's expected signature
                callback: (args: unknown): Promise<ToolResponse> =>
                  toolToRegister.callback(args as Record<string, unknown>),
              },
            ];
            registerAndTrackTools(server, singleToolRegistration);
            log('debug', `Registered tool: ${toolToRegister.name}`);
          } catch (toolError) {
            log('error', `Failed to register tool '${toolToRegister.name}': ${toolError}`);
          }
        }
        log('info', `✅ Registered ${toolsToRegister.length} tools from '${workflowName}'`);
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

  // No manual notification needed - registerTools() handles notifications automatically
  log('debug', 'Tool list change notifications handled automatically by registerTools()');

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
