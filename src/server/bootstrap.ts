import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SetLevelRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { registerResources } from '../core/resources.ts';
import type { FileSystemExecutor } from '../utils/FileSystemExecutor.ts';
import { log, setLogLevel, type LogLevel } from '../utils/logger.ts';
import type { RuntimeConfigOverrides } from '../utils/config-store.ts';
import { registerWorkflows } from '../utils/tool-registry.ts';
import { bootstrapRuntime } from '../runtime/bootstrap-runtime.ts';
import { getXcodeToolsBridgeManager } from '../integrations/xcode-tools-bridge/index.ts';

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

  const result = await bootstrapRuntime({
    runtime: 'mcp',
    cwd: options.cwd,
    fs: options.fileSystemExecutor,
    configOverrides: overrides,
  });

  if (result.configFound) {
    for (const notice of result.notices) {
      log('info', `[ProjectConfig] ${notice}`);
    }
  }

  const enabledWorkflows = result.runtime.config.enabledWorkflows;
  log('info', `🚀 Initializing server...`);
  await registerWorkflows(enabledWorkflows);

  const xcodeIdeEnabled = enabledWorkflows.includes('xcode-ide');
  const xcodeToolsBridge = getXcodeToolsBridgeManager(server);
  xcodeToolsBridge?.setWorkflowEnabled(xcodeIdeEnabled);
  if (xcodeIdeEnabled && xcodeToolsBridge) {
    try {
      await xcodeToolsBridge.syncTools({ reason: 'startup' });
    } catch (error) {
      log(
        'warn',
        `[xcode-ide] Startup sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  await registerResources(server);
}
