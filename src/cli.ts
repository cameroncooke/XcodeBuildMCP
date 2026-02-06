#!/usr/bin/env node
import { bootstrapRuntime } from './runtime/bootstrap-runtime.ts';
import { buildCliToolCatalog } from './cli/cli-tool-catalog.ts';
import { buildYargsApp } from './cli/yargs-app.ts';
import { getSocketPath, getWorkspaceKey, resolveWorkspaceRoot } from './daemon/socket-path.ts';
import { startMcpServer } from './server/start-mcp-server.ts';
import { listCliWorkflowIdsFromManifest } from './runtime/tool-catalog.ts';

function findTopLevelCommand(argv: string[]): string | undefined {
  const flagsWithValue = new Set(['--socket', '--log-level', '--style']);
  let skipNext = false;

  for (const token of argv) {
    if (skipNext) {
      skipNext = false;
      continue;
    }

    if (token.startsWith('-')) {
      if (flagsWithValue.has(token)) {
        skipNext = true;
      }
      continue;
    }

    return token;
  }

  return undefined;
}

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

  const cliExposedWorkflowIds = await listCliWorkflowIdsFromManifest({
    excludeWorkflows: ['session-management', 'workflow-discovery'],
  });
  const topLevelCommand = findTopLevelCommand(process.argv.slice(2));
  const discoveryMode =
    topLevelCommand === 'xcode-ide' || topLevelCommand === 'tools' ? 'quick' : 'none';

  // CLI uses a manifest-resolved catalog plus daemon-backed xcode-ide dynamic tools.
  const catalog = await buildCliToolCatalog({
    socketPath: defaultSocketPath,
    workspaceRoot,
    cliExposedWorkflowIds,
    logLevel: result.runtime.config.debug ? 'info' : undefined,
    discoveryMode,
  });

  const workflowNames = cliExposedWorkflowIds;

  const yargsApp = buildYargsApp({
    catalog,
    runtimeConfig: result.runtime.config,
    defaultSocketPath,
    workspaceRoot,
    workspaceKey,
    workflowNames,
    cliExposedWorkflowIds,
  });

  await yargsApp.parseAsync();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
