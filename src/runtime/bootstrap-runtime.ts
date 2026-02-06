import process from 'node:process';
import {
  initConfigStore,
  getConfig,
  type RuntimeConfigOverrides,
  type ResolvedRuntimeConfig,
} from '../utils/config-store.ts';
import { sessionStore } from '../utils/session-store.ts';
import { getDefaultFileSystemExecutor } from '../utils/command.ts';
import { getDefaultCommandExecutor } from '../utils/execution/index.ts';
import { log } from '../utils/logger.ts';
import type { FileSystemExecutor } from '../utils/FileSystemExecutor.ts';
import { resolveSimulatorNameToId } from '../utils/simulator-resolver.ts';

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

  const defaults = { ...(config.sessionDefaults ?? {}) };
  if (Object.keys(defaults).length > 0) {
    // Auto-resolve simulatorName to simulatorId if only name is provided
    if (defaults.simulatorName && !defaults.simulatorId) {
      const executor = getDefaultCommandExecutor();
      const resolution = await resolveSimulatorNameToId(executor, defaults.simulatorName);
      if (resolution.success) {
        defaults.simulatorId = resolution.simulatorId;
        log(
          'info',
          `Resolved simulatorName "${defaults.simulatorName}" to simulatorId: ${resolution.simulatorId}`,
        );
      } else {
        log(
          'warning',
          `Failed to resolve simulatorName "${defaults.simulatorName}": ${resolution.error}`,
        );
      }
    }
    sessionStore.setDefaults(defaults);
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
