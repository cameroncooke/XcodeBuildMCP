import { log } from '../utils/logger.js';
import { getDefaultCommandExecutor, CommandExecutor } from '../utils/command.js';
import { WORKFLOW_LOADERS, WorkflowName, WORKFLOW_METADATA } from './generated-plugins.js';
import { ToolResponse } from '../types/common.js';
import { PluginMeta } from './plugin-types.js';

// Track enabled workflows and their tools for replacement functionality
const enabledWorkflows = new Set<string>();
const enabledTools = new Map<string, string>(); // toolName -> workflowName

// Type for the handler function from our tools
type ToolHandler = (
  args: Record<string, unknown>,
  executor: CommandExecutor,
) => Promise<ToolResponse>;

// Interface for the MCP server with the methods we need
interface MCPServerInterface {
  tool(
    name: string,
    description: string,
    schema: unknown,
    handler: (args: unknown) => Promise<unknown>,
  ): void;
  registerTool?(
    name: string,
    config: {
      title?: string;
      description: string;
      inputSchema?: unknown;
      outputSchema?: unknown;
      annotations?: unknown;
    },
    callback: (args: unknown) => Promise<unknown>,
  ): unknown;
  registerTools?(
    tools: Array<{
      name: string;
      config: {
        title?: string;
        description: string;
        inputSchema?: unknown;
        outputSchema?: unknown;
        annotations?: unknown;
      };
      callback: (args: unknown) => Promise<unknown>;
    }>,
  ): unknown[];
  notifyToolsChanged?: () => Promise<void>;
}

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
  server: MCPServerInterface,
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

      // Prepare tools for bulk registration
      const toolsToRegister: Array<{
        name: string;
        config: {
          title?: string;
          description: string;
          inputSchema?: unknown;
          outputSchema?: unknown;
          annotations?: unknown;
        };
        callback: (args: unknown) => Promise<unknown>;
      }> = [];

      // Collect all tools from this workflow
      for (const toolKey of toolKeys) {
        const tool = workflowModule[toolKey] as PluginMeta | undefined;

        if (tool?.name && typeof tool.handler === 'function') {
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

      // Use bulk registration if available, otherwise fall back to individual registration
      if (typeof (server as any).registerTools === 'function') {
        try {
          log('info', `🚀 Enabling ${toolsToRegister.length} tools from '${workflowName}' workflow`);
          const registeredTools = (server as any).registerTools(toolsToRegister);
          log('info', `✅ Registered ${registeredTools.length} tools from '${workflowName}'`);
          // registerTools() automatically sends tool list change notification internally
        } catch (error) {
          log('error', `Failed to register tools from '${workflowName}': ${error}`);
        }
      } else if (typeof (server as any).registerTool === 'function') {
        // Use registerTool (fewer notifications than tool())
        log('info', `🚀 Enabling ${toolsToRegister.length} tools from '${workflowName}' workflow`);
        for (const toolToRegister of toolsToRegister) {
          try {
            (server as any).registerTool(
              toolToRegister.name,
              toolToRegister.config,
              toolToRegister.callback,
            );
            log('debug', `Registered tool: ${toolToRegister.name}`);
          } catch (error) {
            log('error', `Failed to register tool '${toolToRegister.name}': ${error}`);
          }
        }
        log('info', `✅ Registered ${toolsToRegister.length} tools from '${workflowName}'`);
      } else {
        // Final fallback to tool() method (most notifications)
        log('info', `🚀 Enabling ${toolsToRegister.length} tools from '${workflowName}' workflow`);
        for (const toolToRegister of toolsToRegister) {
          try {
            server.tool(
              toolToRegister.name,
              toolToRegister.config.description,
              toolToRegister.config.inputSchema,
              toolToRegister.callback,
            );
            log('debug', `Registered tool: ${toolToRegister.name}`);
          } catch (error) {
            log('error', `Failed to register tool '${toolToRegister.name}': ${error}`);
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

  // Notify the client about the tool list change
  // Only send manual notifications if we're not using registerTools (which sends automatically)
  let needsManualNotification = true;
  
  for (const workflowName of workflowNames) {
    if (typeof (server as any).registerTools === 'function') {
      needsManualNotification = false;
      break;
    }
  }
  
  if (needsManualNotification) {
    try {
      if (typeof (server as any).sendToolListChanged === 'function') {
        (server as any).sendToolListChanged();
        log('debug', 'Sent tool list changed notification');
      } else if (server.notifyToolsChanged) {
        await server.notifyToolsChanged();
        log('debug', 'Notified client of tool list changes (fallback)');
      }
    } catch (error) {
      log('warn', `Failed to notify client of tool changes: ${error}`);
    }
  } else {
    log('debug', 'Skipping manual notification - registerTools() handles notifications automatically');
  }

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
