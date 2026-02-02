import { type RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import { server } from '../server/server-state.ts';
import { ToolResponse } from '../types/common.ts';
import { log } from './logger.ts';
import { loadWorkflowGroups } from '../core/plugin-registry.ts';
import { resolveSelectedWorkflows } from './workflow-selection.ts';
import { processToolResponse } from './responses/index.ts';

export interface RuntimeToolInfo {
  enabledWorkflows: string[];
  registeredToolCount: number;
}

const registryState: {
  tools: Map<string, RegisteredTool>;
  enabledWorkflows: Set<string>;
} = {
  tools: new Map<string, RegisteredTool>(),
  enabledWorkflows: new Set<string>(),
};

export function getRuntimeRegistration(): RuntimeToolInfo | null {
  if (registryState.tools.size === 0 && registryState.enabledWorkflows.size === 0) {
    return null;
  }
  return {
    enabledWorkflows: [...registryState.enabledWorkflows],
    registeredToolCount: registryState.tools.size,
  };
}

export async function applyWorkflowSelection(workflowNames: string[]): Promise<RuntimeToolInfo> {
  if (!server) {
    throw new Error('Tool registry has not been initialized.');
  }

  const workflowGroups = await loadWorkflowGroups();
  const selection = resolveSelectedWorkflows(workflowNames, workflowGroups);
  const desiredToolNames = new Set<string>();
  const desiredWorkflows = new Set<string>();

  for (const workflow of selection.selectedWorkflows) {
    desiredWorkflows.add(workflow.directoryName);
    for (const tool of workflow.tools) {
      const { name, description, schema, annotations, handler } = tool;
      desiredToolNames.add(name);
      if (!registryState.tools.has(name)) {
        const registeredTool = server.registerTool(
          name,
          {
            description: description ?? '',
            inputSchema: schema,
            annotations,
          },
          async (args: unknown): Promise<ToolResponse> => {
            const response = await handler(args as Record<string, unknown>);
            // Apply MCP-style next steps rendering
            return processToolResponse(response, 'mcp', 'normal');
          },
        );
        registryState.tools.set(name, registeredTool);
      }
    }
  }

  for (const [toolName, registeredTool] of registryState.tools.entries()) {
    if (!desiredToolNames.has(toolName)) {
      registeredTool.remove();
      registryState.tools.delete(toolName);
    }
  }

  registryState.enabledWorkflows = desiredWorkflows;

  const workflowLabel = selection.selectedNames.join(', ');
  log('info', `✅ Registered ${desiredToolNames.size} tools from workflows: ${workflowLabel}`);

  return {
    enabledWorkflows: [...registryState.enabledWorkflows],
    registeredToolCount: registryState.tools.size,
  };
}

export function getRegisteredWorkflows(): string[] {
  return [...registryState.enabledWorkflows];
}

/**
 * Register workflows (selected list or all when omitted)
 */
export async function registerWorkflows(workflowNames?: string[]): Promise<void> {
  await applyWorkflowSelection(workflowNames ?? []);
}

export async function updateWorkflows(workflowNames?: string[]): Promise<void> {
  await applyWorkflowSelection(workflowNames ?? []);
}
