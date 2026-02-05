import { buildCliToolCatalogFromManifest } from '../runtime/tool-catalog.ts';
import type { ToolCatalog } from '../runtime/types.ts';

/**
 * Build a tool catalog for CLI usage using the manifest system.
 * CLI visibility is determined by manifest availability and predicates.
 */
export async function buildCliToolCatalog(): Promise<ToolCatalog> {
  return buildCliToolCatalogFromManifest();
}
