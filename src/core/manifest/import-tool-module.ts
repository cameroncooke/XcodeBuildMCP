/**
 * Tool module importer with backward-compatible adapter.
 * Dynamically imports tool modules and adapts both old (PluginMeta default export)
 * and new (named exports) formats.
 */

import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ToolSchemaShape } from '../plugin-types.ts';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { getPackageRoot } from './load-manifest.ts';

/**
 * Imported tool module interface.
 * This is what we extract from each tool module for runtime use.
 */
export interface ImportedToolModule {
  schema: ToolSchemaShape;
  handler: (params: Record<string, unknown>) => Promise<unknown>;
  annotations?: ToolAnnotations;
}

/**
 * Cache for imported modules.
 */
const moduleCache = new Map<string, ImportedToolModule>();

/**
 * Import a tool module by its manifest module path.
 *
 * Supports two module formats:
 * 1. Legacy: `export default { name, schema, handler, annotations?, ... }`
 * 2. New: Named exports `{ schema, handler, annotations? }`
 *
 * @param moduleId - Extensionless module path (e.g., 'mcp/tools/simulator/build_sim')
 * @returns Imported tool module with schema, handler, and optional annotations
 */
export async function importToolModule(moduleId: string): Promise<ImportedToolModule> {
  // Check cache first
  const cached = moduleCache.get(moduleId);
  if (cached) {
    return cached;
  }

  const packageRoot = getPackageRoot();
  const modulePath = path.join(packageRoot, 'build', `${moduleId}.js`);
  const moduleUrl = pathToFileURL(modulePath).href;

  let mod: Record<string, unknown>;
  try {
    mod = (await import(moduleUrl)) as Record<string, unknown>;
  } catch (err) {
    throw new Error(`Failed to import tool module '${moduleId}': ${err}`);
  }

  const result = extractToolExports(mod, moduleId);

  // Cache the result
  moduleCache.set(moduleId, result);

  return result;
}

/**
 * Extract tool exports from a module, supporting both legacy and new formats.
 */
function extractToolExports(mod: Record<string, unknown>, moduleId: string): ImportedToolModule {
  // Try legacy format first: default export with PluginMeta shape
  if (mod.default && typeof mod.default === 'object') {
    const defaultExport = mod.default as Record<string, unknown>;

    // Check if it looks like a PluginMeta (has schema and handler)
    if (defaultExport.schema && typeof defaultExport.handler === 'function') {
      return {
        schema: defaultExport.schema as ToolSchemaShape,
        handler: defaultExport.handler as (params: Record<string, unknown>) => Promise<unknown>,
        annotations: defaultExport.annotations as ToolAnnotations | undefined,
      };
    }
  }

  // Try new format: named exports
  if (mod.schema && typeof mod.handler === 'function') {
    return {
      schema: mod.schema as ToolSchemaShape,
      handler: mod.handler as (params: Record<string, unknown>) => Promise<unknown>,
      annotations: mod.annotations as ToolAnnotations | undefined,
    };
  }

  throw new Error(
    `Tool module '${moduleId}' does not export the required shape. ` +
      `Expected either a default export with { schema, handler } or named exports { schema, handler }.`,
  );
}

/**
 * Clear the module cache.
 * Useful for testing or hot-reloading scenarios.
 */
export function clearModuleCache(): void {
  moduleCache.clear();
}

/**
 * Preload multiple tool modules in parallel.
 */
export async function preloadToolModules(moduleIds: string[]): Promise<void> {
  await Promise.all(moduleIds.map((id) => importToolModule(id)));
}
