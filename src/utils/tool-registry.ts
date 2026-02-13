import { type RegisteredTool } from '@modelcontextprotocol/sdk/server/mcp.js';
import { server } from '../server/server-state.ts';
import type { ToolResponse } from '../types/common.ts';
import { log } from './logger.ts';
import { processToolResponse } from './responses/index.ts';
import { loadManifest } from '../core/manifest/load-manifest.ts';
import { importToolModule } from '../core/manifest/import-tool-module.ts';
import type { PredicateContext } from '../visibility/predicate-types.ts';
import { selectWorkflowsForMcp, isToolExposedForRuntime } from '../visibility/exposure.ts';
import { getConfig } from './config-store.ts';
import { recordInternalErrorMetric, recordToolInvocationMetric } from './sentry.ts';

export interface RuntimeToolInfo {
  enabledWorkflows: string[];
  registeredToolCount: number;
}

const registryState: {
  tools: Map<string, RegisteredTool>;
  enabledWorkflows: Set<string>;
  /** Current MCP predicate context (stored for use by manage_workflows) */
  currentContext: PredicateContext | null;
} = {
  tools: new Map<string, RegisteredTool>(),
  enabledWorkflows: new Set<string>(),
  currentContext: null,
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

export function getRegisteredWorkflows(): string[] {
  return [...registryState.enabledWorkflows];
}

function defaultPredicateContext(): PredicateContext {
  return {
    runtime: 'mcp',
    config: getConfig(),
    runningUnderXcode: false,
    xcodeToolsActive: false,
    xcodeToolsAvailable: false,
  };
}

/**
 * Get the current MCP predicate context.
 * Returns the context used for the most recent workflow registration,
 * or a default context if not yet initialized.
 */
export function getMcpPredicateContext(): PredicateContext {
  return registryState.currentContext ?? defaultPredicateContext();
}

/**
 * Apply workflow selection using the manifest system.
 */
export async function applyWorkflowSelectionFromManifest(
  requestedWorkflows: string[] | undefined,
  ctx: PredicateContext,
): Promise<RuntimeToolInfo> {
  if (!server) {
    throw new Error('Tool registry has not been initialized.');
  }

  // Store the context for later use (e.g., by manage_workflows)
  registryState.currentContext = ctx;

  const manifest = loadManifest();
  const allWorkflows = Array.from(manifest.workflows.values());

  // Select workflows using manifest-driven rules
  const selectedWorkflows = selectWorkflowsForMcp(allWorkflows, requestedWorkflows, ctx);

  const desiredToolNames = new Set<string>();
  const desiredWorkflows = new Set<string>();

  for (const workflow of selectedWorkflows) {
    desiredWorkflows.add(workflow.id);

    for (const toolId of workflow.tools) {
      const toolManifest = manifest.tools.get(toolId);
      if (!toolManifest) continue;

      // Check tool visibility using predicates
      if (!isToolExposedForRuntime(toolManifest, ctx)) {
        continue;
      }

      const toolName = toolManifest.names.mcp;
      desiredToolNames.add(toolName);

      if (!registryState.tools.has(toolName)) {
        // Import the tool module
        let toolModule;
        try {
          toolModule = await importToolModule(toolManifest.module);
        } catch (err) {
          log('warning', `Failed to import tool module ${toolManifest.module}: ${err}`);
          continue;
        }

        const registeredTool = server.registerTool(
          toolName,
          {
            description: toolManifest.description ?? '',
            inputSchema: toolModule.schema,
            annotations: toolManifest.annotations,
          },
          async (args: unknown): Promise<ToolResponse> => {
            const startedAt = Date.now();
            try {
              const response = await toolModule.handler(args as Record<string, unknown>);
              recordToolInvocationMetric({
                toolName,
                runtime: 'mcp',
                transport: 'direct',
                outcome: 'completed',
                durationMs: Date.now() - startedAt,
              });
              return processToolResponse(response as ToolResponse, 'mcp', 'normal');
            } catch (error) {
              recordInternalErrorMetric({
                component: 'mcp-tool-registry',
                runtime: 'mcp',
                errorKind: error instanceof Error ? error.name || 'Error' : typeof error,
              });
              recordToolInvocationMetric({
                toolName,
                runtime: 'mcp',
                transport: 'direct',
                outcome: 'infra_error',
                durationMs: Date.now() - startedAt,
              });
              throw error;
            }
          },
        );
        registryState.tools.set(toolName, registeredTool);
      }
    }
  }

  // Unregister tools no longer in selection
  for (const [toolName, registeredTool] of registryState.tools.entries()) {
    if (!desiredToolNames.has(toolName)) {
      registeredTool.remove();
      registryState.tools.delete(toolName);
    }
  }

  registryState.enabledWorkflows = desiredWorkflows;

  const workflowLabel = selectedWorkflows.map((w) => w.id).join(', ');
  log('info', `Registered ${desiredToolNames.size} tools from workflows: ${workflowLabel}`);

  return {
    enabledWorkflows: [...registryState.enabledWorkflows],
    registeredToolCount: registryState.tools.size,
  };
}

/**
 * Register workflows using manifest system.
 */
export async function registerWorkflowsFromManifest(
  workflowNames?: string[],
  ctx?: PredicateContext,
): Promise<void> {
  await applyWorkflowSelectionFromManifest(workflowNames, ctx ?? defaultPredicateContext());
}

/**
 * Update workflows using manifest system.
 */
export async function updateWorkflowsFromManifest(
  workflowNames?: string[],
  ctx?: PredicateContext,
): Promise<void> {
  await registerWorkflowsFromManifest(workflowNames, ctx);
}

export function __resetToolRegistryForTests(): void {
  for (const tool of registryState.tools.values()) {
    try {
      tool.remove();
    } catch {
      // Safe to ignore: server may already be closed during cleanup
    }
  }
  registryState.tools.clear();
  registryState.enabledWorkflows.clear();
  registryState.currentContext = null;
}
