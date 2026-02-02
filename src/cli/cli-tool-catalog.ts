import { listWorkflowDirectoryNames } from '../core/plugin-registry.ts';
import { buildToolCatalog } from '../runtime/tool-catalog.ts';
import type { ToolCatalog } from '../runtime/types.ts';

const CLI_EXCLUDED_WORKFLOWS = ['session-management', 'workflow-discovery'];

/**
 * Build a tool catalog for CLI usage.
 * CLI shows ALL workflows (not config-driven) except session-management.
 */
export async function buildCliToolCatalog(): Promise<ToolCatalog> {
  const allWorkflows = listWorkflowDirectoryNames();

  return buildToolCatalog({
    enabledWorkflows: allWorkflows,
    excludeWorkflows: CLI_EXCLUDED_WORKFLOWS,
  });
}
