import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SetLevelRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import process from 'node:process';
import { registerResources } from '../core/resources.ts';
import { getDefaultFileSystemExecutor } from '../utils/command.ts';
import type { FileSystemExecutor } from '../utils/FileSystemExecutor.ts';
import { log, setLogLevel, type LogLevel } from '../utils/logger.ts';
import { getConfig, initConfigStore, type RuntimeConfigOverrides } from '../utils/config-store.ts';
import { sessionStore } from '../utils/session-store.ts';
import { registerWorkflows } from '../utils/tool-registry.ts';

export interface BootstrapOptions {
  enabledWorkflows?: string[];
  configOverrides?: RuntimeConfigOverrides;
  fileSystemExecutor?: FileSystemExecutor;
  cwd?: string;
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

  const hasLegacyEnabledWorkflows = Object.prototype.hasOwnProperty.call(
    options,
    'enabledWorkflows',
  );
  let overrides: RuntimeConfigOverrides | undefined;
  if (options.configOverrides !== undefined) {
    overrides = { ...options.configOverrides };
  }
  if (hasLegacyEnabledWorkflows) {
    overrides ??= {};
    overrides.enabledWorkflows = options.enabledWorkflows ?? [];
  }

  const configResult = await initConfigStore({
    cwd,
    fs: fileSystemExecutor,
    overrides,
  });
  if (configResult.found) {
    for (const notice of configResult.notices) {
      log('info', `[ProjectConfig] ${notice}`);
    }
  }

  const config = getConfig();
  const defaults = config.sessionDefaults ?? {};
  if (Object.keys(defaults).length > 0) {
    sessionStore.setDefaults(defaults);
  }

  const enabledWorkflows = config.enabledWorkflows;
  log('info', `🚀 Initializing server...`);
  await registerWorkflows(enabledWorkflows);

  await registerResources(server);
}
