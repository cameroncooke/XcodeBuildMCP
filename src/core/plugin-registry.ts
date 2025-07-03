import { globSync } from 'glob';
import { pathToFileURL } from 'node:url';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { PluginMeta, WorkflowGroup, WorkflowMeta } from './plugin-types.js';

const IGNORE_GLOBS = [
  '**/*.test.{ts,mts,cts}',
  '**/*.spec.{ts,mts,cts}',
  '**/__tests__/**',
  '**/__mocks__/**',
  '**/fixtures/**',
  '**/coverage/**',
];

export async function loadPlugins(
  root = new URL('../plugins/', import.meta.url),
): Promise<Map<string, PluginMeta>> {
  const plugins = new Map<string, PluginMeta>();
  const files = globSync('**/*.{js,ts}', {
    cwd: root.pathname,
    absolute: true,
    ignore: IGNORE_GLOBS,
  });

  for (const file of files) {
    const mod = await import(pathToFileURL(file).href);

    // Handle default export (single tool)
    if (mod.default?.name && typeof mod.default.handler === 'function') {
      plugins.set(mod.default.name, mod.default);
    }

    // Handle named exports (re-exported shared tools)
    for (const [key, value] of Object.entries(mod)) {
      if (key !== 'default' && value && typeof value === 'object') {
        const tool = value as PluginMeta;
        if (tool.name && typeof tool.handler === 'function') {
          plugins.set(tool.name, tool);
        }
      }
    }
  }

  return plugins;
}

/**
 * Load workflow groups with metadata validation
 */
export async function loadWorkflowGroups(
  root = new URL('../plugins/', import.meta.url),
): Promise<Map<string, WorkflowGroup>> {
  const workflows = new Map<string, WorkflowGroup>();

  // Get all plugin directories
  const directories = readdirSync(root.pathname, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  for (const dirName of directories) {
    const dirPath = join(root.pathname, dirName);

    // Load workflow metadata from index.js
    const indexPath = join(dirPath, 'index.js');
    let workflowMeta: WorkflowMeta;

    try {
      const indexModule = await import(pathToFileURL(indexPath).href);

      if (!indexModule.workflow) {
        throw new Error(
          `Workflow metadata missing: ${dirName}/index.js must export 'workflow' object`,
        );
      }

      workflowMeta = indexModule.workflow;

      // Validate required fields
      if (!workflowMeta.name || typeof workflowMeta.name !== 'string') {
        throw new Error(`Invalid workflow.name in ${dirName}/index.js: must be a non-empty string`);
      }

      if (!workflowMeta.description || typeof workflowMeta.description !== 'string') {
        throw new Error(
          `Invalid workflow.description in ${dirName}/index.js: must be a non-empty string`,
        );
      }
    } catch (error) {
      throw new Error(
        `Failed to load workflow metadata for '${dirName}': ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // Load tools from this directory
    const tools: PluginMeta[] = [];
    const files = globSync('*.{js,ts}', {
      cwd: dirPath,
      absolute: true,
      ignore: [...IGNORE_GLOBS, 'index.{js,ts}'], // Don't include index files as tools
    });

    for (const file of files) {
      const mod = await import(pathToFileURL(file).href);

      // Handle default export (single tool)
      if (mod.default?.name && typeof mod.default.handler === 'function') {
        tools.push(mod.default);
      }

      // Handle named exports (re-exported shared tools)
      for (const [key, value] of Object.entries(mod)) {
        if (key !== 'default' && value && typeof value === 'object') {
          const tool = value as PluginMeta;
          if (tool.name && typeof tool.handler === 'function') {
            tools.push(tool);
          }
        }
      }
    }

    workflows.set(dirName, {
      workflow: workflowMeta,
      tools,
      directoryName: dirName,
    });
  }

  return workflows;
}

/**
 * Get workflow metadata by directory name
 */
export async function getWorkflowMetadata(
  directoryName: string,
  root = new URL('../plugins/', import.meta.url),
): Promise<WorkflowMeta | null> {
  const indexPath = join(root.pathname, directoryName, 'index.js');

  try {
    const indexModule = await import(pathToFileURL(indexPath).href);
    return indexModule.workflow || null;
  } catch {
    return null;
  }
}
