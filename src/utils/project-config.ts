import path from 'node:path';
import * as z from 'zod';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { FileSystemExecutor } from './FileSystemExecutor.ts';
import type { SessionDefaults } from './session-store.ts';
import { log } from './logger.ts';
import { sessionDefaultsSchema } from './session-defaults-schema.ts';
import { removeUndefined } from './remove-undefined.ts';

const CONFIG_DIR = '.xcodebuildmcp';
const CONFIG_FILE = 'config.yaml';

const projectConfigSchema = z
  .object({
    schemaVersion: z.literal(1).optional().default(1),
    sessionDefaults: sessionDefaultsSchema.optional(),
  })
  .passthrough();

type ProjectConfigSchema = z.infer<typeof projectConfigSchema>;

export type ProjectConfig = {
  schemaVersion: 1;
  sessionDefaults?: Partial<SessionDefaults>;
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

function resolveRelativeSessionPaths(
  defaults: Partial<SessionDefaults>,
  cwd: string,
): Partial<SessionDefaults> {
  const resolved: Partial<SessionDefaults> = { ...defaults };
  const pathKeys = ['projectPath', 'workspacePath', 'derivedDataPath'] as const;

  for (const key of pathKeys) {
    const value = resolved[key];
    if (typeof value === 'string' && value.length > 0 && !path.isAbsolute(value)) {
      resolved[key] = path.resolve(cwd, value);
    }
  }

  return resolved;
}

function parseProjectConfig(rawText: string): ProjectConfigSchema {
  const parsed: unknown = parseYaml(rawText);
  if (!isPlainObject(parsed)) {
    throw new Error('Project config must be an object');
  }
  return projectConfigSchema.parse(parsed);
}

export async function loadProjectConfig(
  options: LoadProjectConfigOptions,
): Promise<LoadProjectConfigResult> {
  const configPath = getConfigPath(options.cwd);

  if (!options.fs.existsSync(configPath)) {
    return { found: false };
  }

  let parsed: ProjectConfigSchema;
  try {
    const rawText = await options.fs.readFile(configPath, 'utf8');
    parsed = parseProjectConfig(rawText);

    if (!parsed.sessionDefaults) {
      return { found: true, path: configPath, config: parsed, notices: [] };
    }

    const { normalized, notices } = normalizeMutualExclusivity(parsed.sessionDefaults);
    const resolved = resolveRelativeSessionPaths(normalized, options.cwd);

    const config: ProjectConfig = {
      ...parsed,
      sessionDefaults: resolved,
    };

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
      baseConfig = { ...parsed, schemaVersion: 1 };
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
