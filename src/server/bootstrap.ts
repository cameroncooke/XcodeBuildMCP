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
import { readXcodeIdeState } from '../utils/xcode-state-reader.ts';
import { sessionStore } from '../utils/session-store.ts';
import { startXcodeStateWatcher, lookupBundleId } from '../utils/xcode-state-watcher.ts';
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
  const executor = getDefaultCommandExecutor();
  const xcodeDetection = await detectXcodeRuntime(executor);
  if (xcodeDetection.runningUnderXcode) {
    log('info', `[xcode] Running under Xcode agent environment`);

    // Get project/workspace path from config session defaults (for monorepo disambiguation)
    const configSessionDefaults = result.runtime.config.sessionDefaults;
    const projectPath = configSessionDefaults?.projectPath;
    const workspacePath = configSessionDefaults?.workspacePath;

    // Sync session defaults from Xcode's IDE state
    const xcodeState = await readXcodeIdeState({
      executor,
      cwd: result.runtime.cwd,
      projectPath,
      workspacePath,
    });

    if (xcodeState.error) {
      log('debug', `[xcode] Could not read Xcode IDE state: ${xcodeState.error}`);
    } else {
      const syncedDefaults: Record<string, string> = {};
      if (xcodeState.scheme) {
        syncedDefaults.scheme = xcodeState.scheme;
      }
      if (xcodeState.simulatorId) {
        syncedDefaults.simulatorId = xcodeState.simulatorId;
      }
      if (xcodeState.simulatorName) {
        syncedDefaults.simulatorName = xcodeState.simulatorName;
      }

      if (Object.keys(syncedDefaults).length > 0) {
        sessionStore.setDefaults(syncedDefaults);
        log(
          'info',
          `[xcode] Synced session defaults from Xcode: ${JSON.stringify(syncedDefaults)}`,
        );
      }

      // Look up bundle ID asynchronously (non-blocking)
      if (xcodeState.scheme) {
        lookupBundleId(executor, xcodeState.scheme, projectPath, workspacePath)
          .then((bundleId) => {
            if (bundleId) {
              sessionStore.setDefaults({ bundleId });
              log('info', `[xcode] Bundle ID resolved: "${bundleId}"`);
            }
          })
          .catch((e) => {
            log('debug', `[xcode] Failed to lookup bundle ID: ${e}`);
          });
      }
    }

    // Start file watcher to auto-sync when user changes scheme/simulator in Xcode
    if (!result.runtime.config.disableXcodeAutoSync) {
      const watcherStarted = await startXcodeStateWatcher({
        executor,
        cwd: result.runtime.cwd,
        projectPath,
        workspacePath,
      });
      if (watcherStarted) {
        log('info', `[xcode] Started file watcher for automatic sync`);
      }
    } else {
      log('info', `[xcode] Automatic Xcode sync disabled via config`);
    }
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
