import { log } from '../utils/logger.js';
import { getDefaultCommandExecutor } from '../utils/command.js';
import { WORKFLOW_LOADERS, WorkflowName, WORKFLOW_METADATA } from './generated-plugins.js';

// Track enabled workflows and their tools for replacement functionality
const enabledWorkflows = new Set<string>();
const enabledTools = new Map<string, string>(); // toolName -> workflowName

/**
 * Wrapper function to adapt MCP SDK handler calling convention to our dependency injection pattern
 * MCP SDK calls handlers with just (args), but our handlers expect (args, executor)
 */
function wrapHandlerWithExecutor(handler: (args: unknown, executor: unknown) => Promise<unknown>) {
  return async (args: unknown): Promise<unknown> => {
    return handler(args, getDefaultCommandExecutor());
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
  server: Record<string, unknown>,
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
      const workflowModule = await loader();

      // Get tools count from the module (excluding 'workflow' key)
      const toolKeys = Object.keys(workflowModule).filter((key) => key !== 'workflow');

      log('info', `Enabling ${toolKeys.length} tools from '${workflowName}' workflow`);

      // Register each tool in the workflow
      for (const toolKey of toolKeys) {
        const tool = workflowModule[toolKey];

        if (tool && tool.name && typeof tool.handler === 'function') {
          try {
            server.tool(
              tool.name,
              tool.description || '',
              tool.schema,
              wrapHandlerWithExecutor(tool.handler),
            );

            // Track the tool and workflow
            enabledTools.set(tool.name, workflowName);

            totalToolsAdded++;
            log('debug', `Registered tool: ${tool.name}`);
          } catch (error) {
            log('error', `Failed to register tool '${tool.name}': ${error}`);
          }
        } else {
          log('warn', `Invalid tool definition for '${toolKey}' in workflow '${workflowName}'`);
        }
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
  if (server.notifyToolsChanged) {
    try {
      await server.notifyToolsChanged();
      log('debug', 'Notified client of tool list changes');
    } catch (error) {
      log('warn', `Failed to notify client of tool changes: ${error}`);
    }
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
