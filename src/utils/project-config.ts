import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { FileSystemExecutor } from './FileSystemExecutor.ts';
import type { SessionDefaults } from './session-store.ts';
import { log } from './logger.ts';
import { removeUndefined } from './remove-undefined.ts';
import { runtimeConfigFileSchema, type RuntimeConfigFile } from './runtime-config-schema.ts';

const CONFIG_DIR = '.xcodebuildmcp';
const CONFIG_FILE = 'config.yaml';

export type ProjectConfig = RuntimeConfigFile & {
  schemaVersion: 1;
  sessionDefaults?: Partial<SessionDefaults>;
  enabledWorkflows?: string[];
  debuggerBackend?: 'dap' | 'lldb-cli';
  [key: string]: unknown;
};

export type LoadProjectConfigOptions = {
  fs: FileSystemExecutor;
  cwd: string;
};

export type LoadProjectConfigResult =
  | { found: false }
  | { found: false; path: string; error: Error }
  | { found: true; path: string; config: ProjectConfig; notices: string[] };

export type PersistSessionDefaultsOptions = {
  fs: FileSystemExecutor;
  cwd: string;
  patch: Partial<SessionDefaults>;
  deleteKeys?: (keyof SessionDefaults)[];
};

function getConfigDir(cwd: string): string {
  return path.join(cwd, CONFIG_DIR);
}

function getConfigPath(cwd: string): string {
  return path.join(getConfigDir(cwd), CONFIG_FILE);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

function hasValue<T extends Record<string, unknown>>(defaults: T, key: keyof T): boolean {
  return Object.prototype.hasOwnProperty.call(defaults, key) && defaults[key] !== undefined;
}

function normalizeMutualExclusivity(defaults: Partial<SessionDefaults>): {
  normalized: Partial<SessionDefaults>;
  notices: string[];
} {
  const normalized: Partial<SessionDefaults> = { ...defaults };
  const notices: string[] = [];

  if (hasValue(normalized, 'projectPath') && hasValue(normalized, 'workspacePath')) {
    delete normalized.projectPath;
    notices.push('Both projectPath and workspacePath were provided; keeping workspacePath.');
  }

  if (hasValue(normalized, 'simulatorId') && hasValue(normalized, 'simulatorName')) {
    delete normalized.simulatorName;
    notices.push('Both simulatorId and simulatorName were provided; keeping simulatorId.');
  }

  return { normalized, notices };
}

function tryFileUrlToPath(value: string): string | null {
  if (!value.startsWith('file:')) {
    return null;
  }

  try {
    return fileURLToPath(value);
  } catch (error) {
    log('warning', `Failed to parse file URL path: ${value}. ${String(error)}`);
    return null;
  }
}

function normalizePathValue(value: string, cwd: string): string {
  const fileUrlPath = tryFileUrlToPath(value);
  if (fileUrlPath) {
    return fileUrlPath;
  }

  if (path.isAbsolute(value)) {
    return value;
  }

  return path.resolve(cwd, value);
}

function resolveRelativeSessionPaths(
  defaults: Partial<SessionDefaults>,
  cwd: string,
): Partial<SessionDefaults> {
  const resolved: Partial<SessionDefaults> = { ...defaults };
  const pathKeys = ['projectPath', 'workspacePath', 'derivedDataPath'] as const;

  for (const key of pathKeys) {
    const value = resolved[key];
    if (typeof value === 'string' && value.length > 0) {
      resolved[key] = normalizePathValue(value, cwd);
    }
  }

  return resolved;
}

function normalizeEnabledWorkflows(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    const normalized = value
      .filter((name): name is string => typeof name === 'string')
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean);
    return normalized;
  }
  if (typeof value === 'string') {
    const normalized = value
      .split(',')
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean);
    return normalized;
  }
  return [];
}

function resolveRelativeTopLevelPaths(config: ProjectConfig, cwd: string): ProjectConfig {
  const resolved: ProjectConfig = { ...config };
  const pathKeys = ['axePath', 'iosTemplatePath', 'macosTemplatePath'] as const;

  for (const key of pathKeys) {
    const value = resolved[key];
    if (typeof value === 'string' && value.length > 0) {
      resolved[key] = normalizePathValue(value, cwd);
    }
  }

  return resolved;
}

function normalizeDebuggerBackend(config: RuntimeConfigFile): ProjectConfig {
  if (config.debuggerBackend === 'lldb') {
    const normalized: RuntimeConfigFile = { ...config, debuggerBackend: 'lldb-cli' };
    return toProjectConfig(normalized);
  }
  return toProjectConfig(config);
}

function normalizeConfigForPersistence(config: RuntimeConfigFile): ProjectConfig {
  const base = normalizeDebuggerBackend(config);
  if (config.enabledWorkflows === undefined) {
    return base;
  }
  const normalizedWorkflows = normalizeEnabledWorkflows(config.enabledWorkflows);
  return { ...base, enabledWorkflows: normalizedWorkflows };
}

function toProjectConfig(config: RuntimeConfigFile): ProjectConfig {
  return config as ProjectConfig;
}

function parseProjectConfig(rawText: string): RuntimeConfigFile {
  const parsed: unknown = parseYaml(rawText);
  if (!isPlainObject(parsed)) {
    throw new Error('Project config must be an object');
  }
  return runtimeConfigFileSchema.parse(parsed) as RuntimeConfigFile;
}

export async function loadProjectConfig(
  options: LoadProjectConfigOptions,
): Promise<LoadProjectConfigResult> {
  const configPath = getConfigPath(options.cwd);

  if (!options.fs.existsSync(configPath)) {
    return { found: false };
  }

  try {
    const rawText = await options.fs.readFile(configPath, 'utf8');
    const parsed = parseProjectConfig(rawText);
    const notices: string[] = [];

    let config = normalizeDebuggerBackend(parsed);

    if (parsed.enabledWorkflows !== undefined) {
      const normalizedWorkflows = normalizeEnabledWorkflows(parsed.enabledWorkflows);
      config = { ...config, enabledWorkflows: normalizedWorkflows };
    }

    if (config.sessionDefaults) {
      const normalized = normalizeMutualExclusivity(config.sessionDefaults);
      notices.push(...normalized.notices);
      const resolved = resolveRelativeSessionPaths(normalized.normalized, options.cwd);
      config = { ...config, sessionDefaults: resolved };
    }

    config = resolveRelativeTopLevelPaths(config, options.cwd);

    return { found: true, path: configPath, config, notices };
  } catch (error) {
    return { found: false, path: configPath, error: toError(error) };
  }
}

export async function persistSessionDefaultsToProjectConfig(
  options: PersistSessionDefaultsOptions,
): Promise<{ path: string }> {
  const configDir = getConfigDir(options.cwd);
  const configPath = getConfigPath(options.cwd);

  await options.fs.mkdir(configDir, { recursive: true });

  let baseConfig: ProjectConfig = { schemaVersion: 1 };

  if (options.fs.existsSync(configPath)) {
    try {
      const rawText = await options.fs.readFile(configPath, 'utf8');
      const parsed = parseProjectConfig(rawText);
      baseConfig = { ...normalizeConfigForPersistence(parsed), schemaVersion: 1 };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(
        'warning',
        `Failed to read or parse project config at ${configPath}. Overwriting with new config. ${errorMessage}`,
      );
      baseConfig = { schemaVersion: 1 };
    }
  }

  const patch = removeUndefined(options.patch as Record<string, unknown>);
  const nextSessionDefaults: Partial<SessionDefaults> = {
    ...(baseConfig.sessionDefaults ?? {}),
    ...patch,
  };

  for (const key of options.deleteKeys ?? []) {
    delete nextSessionDefaults[key];
  }

  const nextConfig: ProjectConfig = {
    ...baseConfig,
    schemaVersion: 1,
    sessionDefaults: nextSessionDefaults,
  };

  await options.fs.writeFile(configPath, stringifyYaml(nextConfig), 'utf8');

  return { path: configPath };
}
