#!/usr/bin/env node
import { bootstrapRuntime } from './runtime/bootstrap-runtime.ts';
import { buildCliToolCatalog } from './cli/cli-tool-catalog.ts';
import { buildYargsApp } from './cli/yargs-app.ts';
import { getSocketPath, getWorkspaceKey, resolveWorkspaceRoot } from './daemon/socket-path.ts';
import { startMcpServer } from './server/start-mcp-server.ts';
import { loadManifest } from './core/manifest/load-manifest.ts';

async function main(): Promise<void> {
  if (process.argv.includes('mcp')) {
    await startMcpServer();
    return;
  }

  // CLI mode uses disableSessionDefaults to show all tool parameters as flags
  const result = await bootstrapRuntime({
    runtime: 'cli',
    configOverrides: {
      disableSessionDefaults: true,
    },
  });

  // CLI uses its own catalog with ALL workflows enabled (except session-management)
  // This is independent of the enabledWorkflows config which is for MCP
  const catalog = await buildCliToolCatalog();

  // Compute workspace context for daemon routing
  const workspaceRoot = resolveWorkspaceRoot({
    cwd: result.runtime.cwd,
    projectConfigPath: result.configPath,
  });

  const defaultSocketPath = getSocketPath({
    cwd: result.runtime.cwd,
    projectConfigPath: result.configPath,
  });

  const workspaceKey = getWorkspaceKey({
    cwd: result.runtime.cwd,
    projectConfigPath: result.configPath,
  });

  const CLI_EXCLUDED_WORKFLOWS = new Set(['session-management', 'workflow-discovery']);
  const manifest = loadManifest();
  const workflowNames = Array.from(manifest.workflows.keys()).filter(
    (name) => !CLI_EXCLUDED_WORKFLOWS.has(name),
  );

  const enabledWorkflows = [...new Set(catalog.tools.map((tool) => tool.workflow))];

  const yargsApp = buildYargsApp({
    catalog,
    runtimeConfig: result.runtime.config,
    defaultSocketPath,
    workspaceRoot,
    workspaceKey,
    workflowNames,
    enabledWorkflows,
  });

  await yargsApp.parseAsync();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
