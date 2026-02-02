import process from 'node:process';
import {
  initConfigStore,
  getConfig,
  type RuntimeConfigOverrides,
  type ResolvedRuntimeConfig,
} from '../utils/config-store.ts';
import { sessionStore } from '../utils/session-store.ts';
import { getDefaultFileSystemExecutor } from '../utils/command.ts';
import { log } from '../utils/logger.ts';
import type { FileSystemExecutor } from '../utils/FileSystemExecutor.ts';

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

  const defaults = config.sessionDefaults ?? {};
  if (Object.keys(defaults).length > 0) {
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
