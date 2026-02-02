import { createHash } from 'node:crypto';
import { mkdirSync, existsSync, unlinkSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

/**
 * Base directory for all daemon-related files.
 */
export function daemonBaseDir(): string {
  return join(homedir(), '.xcodebuildmcp');
}

/**
 * Directory containing all workspace daemons.
 */
export function daemonsDir(): string {
  return join(daemonBaseDir(), 'daemons');
}

/**
 * Resolve the workspace root from the given context.
 *
 * If a project config was found (path to .xcodebuildmcp/config.yaml), use its parent directory.
 * Otherwise, use realpath(cwd).
 */
export function resolveWorkspaceRoot(opts: { cwd: string; projectConfigPath?: string }): string {
  if (opts.projectConfigPath) {
    // Config is at .xcodebuildmcp/config.yaml, so parent of parent is workspace root
    const configDir = dirname(opts.projectConfigPath);
    return dirname(configDir);
  }
  try {
    return realpathSync(opts.cwd);
  } catch {
    return opts.cwd;
  }
}

/**
 * Generate a short, stable key from a workspace root path.
 * Uses first 12 characters of SHA-256 hash.
 */
export function workspaceKeyForRoot(workspaceRoot: string): string {
  const hash = createHash('sha256').update(workspaceRoot).digest('hex');
  return hash.slice(0, 12);
}

/**
 * Get the daemon directory for a specific workspace key.
 */
export function daemonDirForWorkspaceKey(key: string): string {
  return join(daemonsDir(), key);
}

/**
 * Get the socket path for a specific workspace root.
 */
export function socketPathForWorkspaceRoot(workspaceRoot: string): string {
  const key = workspaceKeyForRoot(workspaceRoot);
  return join(daemonDirForWorkspaceKey(key), 'daemon.sock');
}

/**
 * Get the registry file path for a specific workspace key.
 */
export function registryPathForWorkspaceKey(key: string): string {
  return join(daemonDirForWorkspaceKey(key), 'daemon.json');
}

/**
 * Get the log file path for a specific workspace key.
 */
export function logPathForWorkspaceKey(key: string): string {
  return join(daemonDirForWorkspaceKey(key), 'daemon.log');
}

export interface GetSocketPathOptions {
  cwd?: string;
  projectConfigPath?: string;
  env?: NodeJS.ProcessEnv;
}

/**
 * Get the socket path from environment or compute per-workspace.
 *
 * Resolution order:
 * 1. If env.XCODEBUILDMCP_SOCKET is set, use it (explicit override)
 * 2. If cwd is provided, compute workspace root and return per-workspace socket
 * 3. Fall back to process.cwd() and compute workspace socket from that
 */
export function getSocketPath(opts?: GetSocketPathOptions): string {
  const env = opts?.env ?? process.env;

  // Explicit override takes precedence
  if (env.XCODEBUILDMCP_SOCKET) {
    return env.XCODEBUILDMCP_SOCKET;
  }

  // Compute workspace-derived socket path
  const cwd = opts?.cwd ?? process.cwd();
  const workspaceRoot = resolveWorkspaceRoot({
    cwd,
    projectConfigPath: opts?.projectConfigPath,
  });

  return socketPathForWorkspaceRoot(workspaceRoot);
}

/**
 * Get the workspace key for the current context.
 */
export function getWorkspaceKey(opts?: GetSocketPathOptions): string {
  const cwd = opts?.cwd ?? process.cwd();
  const workspaceRoot = resolveWorkspaceRoot({
    cwd,
    projectConfigPath: opts?.projectConfigPath,
  });
  return workspaceKeyForRoot(workspaceRoot);
}

/**
 * Ensure the directory for the socket exists with proper permissions.
 */
export function ensureSocketDir(socketPath: string): void {
  const dir = dirname(socketPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

/**
 * Remove a stale socket file if it exists.
 * Should only be called after confirming no daemon is running.
 */
export function removeStaleSocket(socketPath: string): void {
  if (existsSync(socketPath)) {
    unlinkSync(socketPath);
  }
}

/**
 * Legacy: Get the default socket path for the daemon.
 * @deprecated Use getSocketPath() with workspace context instead.
 */
export function defaultSocketPath(): string {
  return getSocketPath();
}
