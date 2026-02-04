import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SetLevelRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { registerResources } from '../core/resources.ts';
import type { FileSystemExecutor } from '../utils/FileSystemExecutor.ts';
import { log, setLogLevel, type LogLevel } from '../utils/logger.ts';
import type { RuntimeConfigOverrides } from '../utils/config-store.ts';
import { registerWorkflowsFromManifest } from '../utils/tool-registry.ts';
import { bootstrapRuntime } from '../runtime/bootstrap-runtime.ts';
import { getXcodeToolsBridgeManager } from '../integrations/xcode-tools-bridge/index.ts';
import { detectXcodeRuntime } from '../utils/xcode-process.ts';
import { getDefaultCommandExecutor } from '../utils/command.ts';
import type { PredicateContext } from '../visibility/predicate-types.ts';

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

  // Detect if running under Xcode
  const xcodeDetection = await detectXcodeRuntime(getDefaultCommandExecutor());
  if (xcodeDetection.runningUnderXcode) {
    log('info', `[xcode] Running under Xcode agent environment`);
  }

  // Build predicate context for manifest-based registration
  const ctx: PredicateContext = {
    runtime: 'mcp',
    config: result.runtime.config,
    runningUnderXcode: xcodeDetection.runningUnderXcode,
    xcodeToolsActive: false, // Will be updated after Xcode tools bridge sync
  };

  // Register workflows using manifest system
  await registerWorkflowsFromManifest(enabledWorkflows, ctx);

  const xcodeIdeEnabled = enabledWorkflows.includes('xcode-ide');
  const xcodeToolsBridge = getXcodeToolsBridgeManager(server);
  xcodeToolsBridge?.setWorkflowEnabled(xcodeIdeEnabled);
  if (xcodeIdeEnabled && xcodeToolsBridge) {
    try {
      const syncResult = await xcodeToolsBridge.syncTools({ reason: 'startup' });
      // After sync, if Xcode tools are active, re-register with updated context
      if (syncResult.total > 0 && xcodeDetection.runningUnderXcode) {
        log('info', `[xcode-ide] Xcode tools active - applying conflict filtering`);
        ctx.xcodeToolsActive = true;
        await registerWorkflowsFromManifest(enabledWorkflows, ctx);
      }
    } catch (error) {
      log(
        'warning',
        `[xcode-ide] Startup sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  await registerResources(server);
}
