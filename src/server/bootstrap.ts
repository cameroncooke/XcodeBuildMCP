import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SetLevelRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import process from 'node:process';
import { registerResources } from '../core/resources.ts';
import { getDefaultFileSystemExecutor } from '../utils/command.ts';
import type { FileSystemExecutor } from '../utils/FileSystemExecutor.ts';
import { log, setLogLevel, type LogLevel } from '../utils/logger.ts';
import { loadProjectConfig } from '../utils/project-config.ts';
import { sessionStore } from '../utils/session-store.ts';
import { registerWorkflows } from '../utils/tool-registry.ts';

export interface BootstrapOptions {
  enabledWorkflows?: string[];
  fileSystemExecutor?: FileSystemExecutor;
  cwd?: string;
}

function parseEnabledWorkflows(value: string): string[] {
  return value
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
}

export async function bootstrapServer(
  server: McpServer,
  options: BootstrapOptions = {},
): Promise<void> {
  server.server.setRequestHandler(SetLevelRequestSchema, async (request) => {
    const { level } = request.params;
    setLogLevel(level as LogLevel);
    log('info', `Client requested log level: ${level}`);
    return {};
  });

  const cwd = options.cwd ?? process.cwd();
  const fileSystemExecutor = options.fileSystemExecutor ?? getDefaultFileSystemExecutor();

  try {
    const configResult = await loadProjectConfig({ fs: fileSystemExecutor, cwd });
    if (configResult.found) {
      const defaults = configResult.config.sessionDefaults ?? {};
      if (Object.keys(defaults).length > 0) {
        sessionStore.setDefaults(defaults);
      }
      for (const notice of configResult.notices) {
        log('info', `[ProjectConfig] ${notice}`);
      }
    }
  } catch (error) {
    log('warning', `Failed to load project config from ${cwd}. ${error}`);
  }

  const defaultEnabledWorkflows = ['simulator'];

  const enabledWorkflows = options.enabledWorkflows?.length
    ? options.enabledWorkflows
    : process.env.XCODEBUILDMCP_ENABLED_WORKFLOWS
      ? parseEnabledWorkflows(process.env.XCODEBUILDMCP_ENABLED_WORKFLOWS)
      : defaultEnabledWorkflows;

  if (enabledWorkflows.length > 0) {
    log('info', `🚀 Initializing server with selected workflows: ${enabledWorkflows.join(', ')}`);
    await registerWorkflows(enabledWorkflows);
  } else {
    log('info', '🚀 Initializing server with all tools...');
    await registerWorkflows([]);
  }

  await registerResources(server);
}
