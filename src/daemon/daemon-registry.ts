import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import {
  daemonsDir,
  daemonDirForWorkspaceKey,
  registryPathForWorkspaceKey,
} from './socket-path.ts';

/**
 * Metadata stored for each running daemon.
 */
export interface DaemonRegistryEntry {
  workspaceKey: string;
  workspaceRoot: string;
  socketPath: string;
  logPath?: string;
  pid: number;
  startedAt: string;
  enabledWorkflows: string[];
  version: string;
}

/**
 * Write a daemon registry entry.
 * Creates the daemon directory if it doesn't exist.
 */
export function writeDaemonRegistryEntry(entry: DaemonRegistryEntry): void {
  const registryPath = registryPathForWorkspaceKey(entry.workspaceKey);
  const dir = dirname(registryPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  writeFileSync(registryPath, JSON.stringify(entry, null, 2), {
    mode: 0o600,
  });
}

/**
 * Remove a daemon registry entry.
 */
export function removeDaemonRegistryEntry(workspaceKey: string): void {
  const registryPath = registryPathForWorkspaceKey(workspaceKey);

  if (existsSync(registryPath)) {
    unlinkSync(registryPath);
  }
}

/**
 * Read a daemon registry entry by workspace key.
 * Returns null if the entry doesn't exist.
 */
export function readDaemonRegistryEntry(workspaceKey: string): DaemonRegistryEntry | null {
  const registryPath = registryPathForWorkspaceKey(workspaceKey);

  if (!existsSync(registryPath)) {
    return null;
  }

  try {
    const content = readFileSync(registryPath, 'utf8');
    return JSON.parse(content) as DaemonRegistryEntry;
  } catch {
    return null;
  }
}

/**
 * List all daemon registry entries.
 * Enumerates the daemons directory and reads each daemon.json file.
 */
export function listDaemonRegistryEntries(): DaemonRegistryEntry[] {
  const dir = daemonsDir();

  if (!existsSync(dir)) {
    return [];
  }

  const entries: DaemonRegistryEntry[] = [];

  try {
    const subdirs = readdirSync(dir, { withFileTypes: true });

    for (const subdir of subdirs) {
      if (!subdir.isDirectory()) continue;

      const workspaceKey = subdir.name;
      const registryPath = join(daemonDirForWorkspaceKey(workspaceKey), 'daemon.json');

      if (!existsSync(registryPath)) continue;

      try {
        const content = readFileSync(registryPath, 'utf8');
        const entry = JSON.parse(content) as DaemonRegistryEntry;
        entries.push(entry);
      } catch {
        // Skip malformed entries
      }
    }
  } catch {
    // Directory read error, return empty
  }

  return entries;
}

/**
 * Remove all registry files for a workspace key (socket + registry).
 */
export function cleanupWorkspaceDaemonFiles(workspaceKey: string): void {
  const daemonDir = daemonDirForWorkspaceKey(workspaceKey);

  if (!existsSync(daemonDir)) {
    return;
  }

  // Remove daemon.json
  const registryPath = join(daemonDir, 'daemon.json');
  if (existsSync(registryPath)) {
    unlinkSync(registryPath);
  }

  // Remove daemon.sock
  const socketPath = join(daemonDir, 'daemon.sock');
  if (existsSync(socketPath)) {
    unlinkSync(socketPath);
  }
}
