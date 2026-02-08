import process from 'node:process';
import {
  initConfigStore,
  getConfig,
  type RuntimeConfigOverrides,
  type ResolvedRuntimeConfig,
} from '../utils/config-store.ts';
import { sessionStore, type SessionDefaults } from '../utils/session-store.ts';
import { getDefaultFileSystemExecutor } from '../utils/command.ts';
import { log } from '../utils/logger.ts';
import type { FileSystemExecutor } from '../utils/FileSystemExecutor.ts';
import { scheduleSimulatorDefaultsRefresh } from '../utils/simulator-defaults-refresh.ts';

export type RuntimeKind = 'cli' | 'daemon' | 'mcp';

export interface BootstrapRuntimeOptions {
  runtime: RuntimeKind;
  cwd?: string;
  fs?: FileSystemExecutor;
  configOverrides?: RuntimeConfigOverrides;
}

export interface BootstrappedRuntime {
  runtime: RuntimeKind;
  cwd: string;
  config: ResolvedRuntimeConfig;
}

export interface BootstrapRuntimeResult {
  runtime: BootstrappedRuntime;
  configFound: boolean;
  configPath?: string;
  notices: string[];
}

function hydrateSessionDefaultsForMcp(defaults: Partial<SessionDefaults> | undefined): void {
  const hydratedDefaults = { ...(defaults ?? {}) };
  if (Object.keys(hydratedDefaults).length === 0) {
    return;
  }

  sessionStore.setDefaults(hydratedDefaults);
  const revision = sessionStore.getRevision();
  scheduleSimulatorDefaultsRefresh({
    expectedRevision: revision,
    reason: 'startup-hydration',
    persist: true,
    simulatorId: hydratedDefaults.simulatorId,
    simulatorName: hydratedDefaults.simulatorName,
    recomputePlatform: true,
  });
}

export async function bootstrapRuntime(
  opts: BootstrapRuntimeOptions,
): Promise<BootstrapRuntimeResult> {
  process.env.XCODEBUILDMCP_RUNTIME = opts.runtime;
  const cwd = opts.cwd ?? process.cwd();
  const fs = opts.fs ?? getDefaultFileSystemExecutor();

  const configResult = await initConfigStore({
    cwd,
    fs,
    overrides: opts.configOverrides,
  });

  if (configResult.found) {
    log('info', `Loaded project config from ${configResult.path} (cwd: ${cwd})`);
  } else {
    log('info', `No project config found (cwd: ${cwd}).`);
  }

  const config = getConfig();

  if (opts.runtime === 'mcp') {
    hydrateSessionDefaultsForMcp(config.sessionDefaults);
    log('info', '[Session] Hydrated MCP session defaults; simulator metadata refresh scheduled.');
  }

  return {
    runtime: {
      runtime: opts.runtime,
      cwd,
      config,
    },
    configFound: configResult.found,
    configPath: configResult.path,
    notices: configResult.notices,
  };
}
