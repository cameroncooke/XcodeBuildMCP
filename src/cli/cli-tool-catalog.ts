import { buildCliToolCatalogFromManifest } from '../runtime/tool-catalog.ts';
import type { ToolCatalog } from '../runtime/types.ts';

const CLI_EXCLUDED_WORKFLOWS = ['session-management', 'workflow-discovery'];

/**
 * Build a tool catalog for CLI usage using the manifest system.
 * CLI shows ALL workflows (not config-driven) except session-management and workflow-discovery.
 */
export async function buildCliToolCatalog(): Promise<ToolCatalog> {
  return buildCliToolCatalogFromManifest({
    excludeWorkflows: CLI_EXCLUDED_WORKFLOWS,
  });
}
