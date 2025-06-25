import { globSync } from 'glob';
import { pathToFileURL } from 'node:url';
import type { PluginMeta } from './plugin-types.js';

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

  // Also load shared tools directly
  const sharedRoot = new URL('../tools-shared/', import.meta.url);
  const sharedFiles = globSync('**/*.ts', {
    cwd: sharedRoot.pathname,
    absolute: true,
    ignore: IGNORE_GLOBS,
  });

  for (const file of sharedFiles) {
    const mod = await import(pathToFileURL(file).href);
    if (mod.default?.name && typeof mod.default.handler === 'function') {
      plugins.set(mod.default.name, mod.default);
    }
  }

  return plugins;
}
