import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadWorkflowGroups } from '../core/plugin-registry.ts';
import { ToolResponse } from '../types/common.ts';
import { log } from './logger.ts';

// Workflow that must always be included as other tools depend on it
const REQUIRED_WORKFLOW = 'session-management';

/**
 * Register workflows (selected list or all when omitted)
 */
export async function registerWorkflows(
  server: McpServer,
  workflowNames: string[] = [],
): Promise<void> {
  const workflowGroups = await loadWorkflowGroups();
  let registeredCount = 0;
  const registeredTools = new Set<string>();

  const normalizedNames = workflowNames.map((name) => name.trim().toLowerCase());
  const selectedNames =
    normalizedNames.length > 0 ? [...new Set([REQUIRED_WORKFLOW, ...normalizedNames])] : null;

  const workflows = selectedNames
    ? selectedNames.map((workflowName) => workflowGroups.get(workflowName))
    : [...workflowGroups.values()];

  for (const workflow of workflows) {
    if (!workflow) {
      continue;
    }
    for (const tool of workflow.tools) {
      if (registeredTools.has(tool.name)) {
        continue;
      }
      server.registerTool(
        tool.name,
        {
          description: tool.description ?? '',
          inputSchema: tool.schema,
          annotations: tool.annotations,
        },
        (args: unknown): Promise<ToolResponse> => tool.handler(args as Record<string, unknown>),
      );
      registeredTools.add(tool.name);
      registeredCount += 1;
    }
  }

  if (selectedNames) {
    log(
      'info',
      `✅ Registered ${registeredCount} tools from workflows: ${selectedNames.join(', ')}`,
    );
  } else {
    log('info', `✅ Registered ${registeredCount} tools in static mode.`);
  }
}
