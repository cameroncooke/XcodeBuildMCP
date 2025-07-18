import { log } from '../utils/logger.js';
import { getDefaultCommandExecutor } from '../utils/command.js';
import type { WorkflowGroup } from './plugin-types.js';

/**
 * Wrapper function to adapt MCP SDK handler calling convention to our dependency injection pattern
 * MCP SDK calls handlers with just (args), but our handlers expect (args, executor)
 */
function wrapHandlerWithExecutor(handler: any) {
  return async (args: any) => {
    return handler(args, getDefaultCommandExecutor());
  };
}

/**
 * Enable workflows by registering their tools dynamically
 */
export async function enableWorkflows(
  server: Record<string, unknown>,
  workflowNames: string[],
  workflowGroups: Map<string, WorkflowGroup>,
): Promise<void> {
  if (!server) {
    throw new Error('Server instance not available for dynamic tool registration');
  }

  let totalToolsAdded = 0;

  for (const workflowName of workflowNames) {
    const workflow = workflowGroups.get(workflowName);

    if (!workflow) {
      log('warn', `Workflow '${workflowName}' not found`);
      continue;
    }

    log('info', `Enabling ${workflow.tools.length} tools from '${workflowName}' workflow`);

    // Register each tool in the workflow
    for (const tool of workflow.tools) {
      try {
        server.tool(
          tool.name,
          tool.description || '',
          tool.schema,
          wrapHandlerWithExecutor(tool.handler),
        );
        totalToolsAdded++;
        log('debug', `Registered tool: ${tool.name}`);
      } catch (error) {
        log('error', `Failed to register tool '${tool.name}': ${error}`);
      }
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
 * Get list of currently available workflows
 */
export function getAvailableWorkflows(workflowGroups: Map<string, WorkflowGroup>): string[] {
  return Array.from(workflowGroups.keys());
}

/**
 * Get workflow information for LLM prompt generation
 */
export function generateWorkflowDescriptions(workflowGroups: Map<string, WorkflowGroup>): string {
  return Array.from(workflowGroups.values())
    .map((group) => `- **${group.directoryName.toUpperCase()}**: ${group.workflow.description}`)
    .join('\n');
}
