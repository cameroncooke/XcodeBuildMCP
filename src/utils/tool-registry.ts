import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadWorkflowGroups } from '../core/plugin-registry.ts';
import { ToolResponse } from '../types/common.ts';
import { log } from './logger.ts';
import { recordRuntimeRegistration } from './runtime-registry.ts';
import { resolveSelectedWorkflows } from './workflow-selection.ts';

/**
 * Register workflows (selected list or all when omitted)
 */
export async function registerWorkflows(
  server: McpServer,
  workflowNames: string[] = [],
): Promise<void> {
  const workflowGroups = await loadWorkflowGroups();
  const selection = resolveSelectedWorkflows(workflowGroups, workflowNames);
  let registeredCount = 0;
  const registeredTools = new Set<string>();
  const registeredWorkflows = new Set<string>();

  for (const workflow of selection.selectedWorkflows) {
    registeredWorkflows.add(workflow.directoryName);
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

  recordRuntimeRegistration({
    enabledWorkflows: [...registeredWorkflows],
    enabledTools: [...registeredTools],
  });

  if (selection.selectedNames) {
    log(
      'info',
      `✅ Registered ${registeredCount} tools from workflows: ${selection.selectedNames.join(', ')}`,
    );
  } else {
    log('info', `✅ Registered ${registeredCount} tools in static mode.`);
  }
}
