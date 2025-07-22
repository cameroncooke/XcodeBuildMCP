import type { PluginMeta, WorkflowGroup, WorkflowMeta } from './plugin-types.js';
import { WORKFLOW_LOADERS, WorkflowName, WORKFLOW_METADATA } from './generated-plugins.js';

export async function loadPlugins(): Promise<Map<string, PluginMeta>> {
  const plugins = new Map<string, PluginMeta>();

  // Load all workflows and collect all their tools
  const workflowGroups = await loadWorkflowGroups();

  for (const workflow of workflowGroups.values()) {
    for (const tool of workflow.tools) {
      if (tool?.name && typeof tool.handler === 'function') {
        plugins.set(tool.name, tool);
      }
    }
  }

  return plugins;
}

/**
 * Load workflow groups with metadata validation using generated loaders
 */
export async function loadWorkflowGroups(): Promise<Map<string, WorkflowGroup>> {
  const workflows = new Map<string, WorkflowGroup>();

  for (const [workflowName, loader] of Object.entries(WORKFLOW_LOADERS)) {
    try {
      // Dynamic import with code-splitting
      const workflowModule = await loader();

      if (!workflowModule.workflow) {
        throw new Error(`Workflow metadata missing in ${workflowName}/index.js`);
      }

      // Validate required fields
      const workflowMeta = workflowModule.workflow;
      if (!workflowMeta.name || typeof workflowMeta.name !== 'string') {
        throw new Error(
          `Invalid workflow.name in ${workflowName}/index.js: must be a non-empty string`,
        );
      }

      if (!workflowMeta.description || typeof workflowMeta.description !== 'string') {
        throw new Error(
          `Invalid workflow.description in ${workflowName}/index.js: must be a non-empty string`,
        );
      }

      workflows.set(workflowName, {
        workflow: workflowMeta,
        tools: await loadWorkflowTools(workflowModule),
        directoryName: workflowName,
      });
    } catch (error) {
      throw new Error(
        `Failed to load workflow '${workflowName}': ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  return workflows;
}

/**
 * Load workflow tools from the workflow module
 */
async function loadWorkflowTools(workflowModule: Record<string, unknown>): Promise<PluginMeta[]> {
  const tools: PluginMeta[] = [];

  // Load individual tool files from the workflow module
  for (const [key, value] of Object.entries(workflowModule)) {
    if (key !== 'workflow' && value && typeof value === 'object') {
      const tool = value as PluginMeta;
      if (tool.name && typeof tool.handler === 'function') {
        tools.push(tool);
      }
    }
  }

  return tools;
}

/**
 * Get workflow metadata by directory name using generated loaders
 */
export async function getWorkflowMetadata(directoryName: string): Promise<WorkflowMeta | null> {
  try {
    // First try to get from generated metadata (fast path)
    const metadata = WORKFLOW_METADATA[directoryName as WorkflowName];
    if (metadata) {
      return metadata;
    }

    // Fall back to loading the actual module
    const loader = WORKFLOW_LOADERS[directoryName as WorkflowName];
    if (loader) {
      const workflowModule = await loader();
      return workflowModule.workflow || null;
    }

    return null;
  } catch {
    return null;
  }
}
