import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { DaemonClient } from './daemon-client.ts';

/**
 * Default timeout for daemon startup in milliseconds.
 */
export const DEFAULT_DAEMON_STARTUP_TIMEOUT_MS = 5000;

/**
 * Default polling interval when waiting for daemon to be ready.
 */
export const DEFAULT_POLL_INTERVAL_MS = 100;

/**
 * Get the path to the daemon executable.
 */
export function getDaemonExecutablePath(): string {
  // In the built output, this file is build/cli/daemon-control.js and daemon is build/daemon.js.
  const currentFile = fileURLToPath(import.meta.url);
  const buildDir = dirname(currentFile);
  const candidateJs = resolve(buildDir, '..', 'daemon.js');
  if (existsSync(candidateJs)) {
    return candidateJs;
  }

  // Fallback for source/dev layouts.
  return resolve(buildDir, '..', 'daemon.ts');
}

export interface StartDaemonBackgroundOptions {
  socketPath: string;
  workspaceRoot?: string;
  env?: Record<string, string>;
}

/**
 * Start the daemon in the background (detached mode).
 * Does not wait for the daemon to be ready.
 */
export function startDaemonBackground(opts: StartDaemonBackgroundOptions): void {
  const daemonPath = getDaemonExecutablePath();

  const child = spawn(process.execPath, [daemonPath], {
    detached: true,
    stdio: 'ignore',
    cwd: opts.workspaceRoot,
    env: {
      ...process.env,
      ...opts.env,
      XCODEBUILDMCP_SOCKET: opts.socketPath,
      XCODEBUILDCLI_SOCKET: opts.socketPath,
    },
  });

  child.unref();
}

export interface WaitForDaemonReadyOptions {
  socketPath: string;
  timeoutMs: number;
  pollIntervalMs?: number;
}

/**
 * Wait for the daemon to be ready by polling status.
 * Throws if the daemon doesn't respond within the timeout.
 */
export async function waitForDaemonReady(opts: WaitForDaemonReadyOptions): Promise<void> {
  const client = new DaemonClient({
    socketPath: opts.socketPath,
    timeout: Math.min(opts.timeoutMs, 2000), // Short timeout for each status check
  });

  const pollInterval = opts.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const startTime = Date.now();

  while (Date.now() - startTime < opts.timeoutMs) {
    try {
      // Use status() to confirm protocol handler is ready (not just connect)
      await client.status();
      return; // Success
    } catch {
      // Not ready yet, wait and retry
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }

  throw new Error(
    `Daemon failed to start within ${opts.timeoutMs}ms. ` +
      `Check if another daemon is running or if there are permission issues.`,
  );
}

export interface EnsureDaemonRunningOptions {
  socketPath: string;
  workspaceRoot?: string;
  startupTimeoutMs?: number;
  env?: Record<string, string>;
}

/**
 * Ensure the daemon is running, starting it if necessary.
 * Returns when the daemon is ready to accept requests.
 *
 * This is the main entry point for auto-start behavior.
 */
export async function ensureDaemonRunning(opts: EnsureDaemonRunningOptions): Promise<void> {
  const client = new DaemonClient({ socketPath: opts.socketPath });
  const timeoutMs = opts.startupTimeoutMs ?? DEFAULT_DAEMON_STARTUP_TIMEOUT_MS;

  // Check if already running
  const isRunning = await client.isRunning();
  if (isRunning) {
    return;
  }

  // Start daemon in background
  const startOptions: StartDaemonBackgroundOptions = {
    socketPath: opts.socketPath,
    workspaceRoot: opts.workspaceRoot,
  };

  if (opts.env) {
    startOptions.env = { ...opts.env };
  }

  startDaemonBackground(startOptions);

  // Wait for it to be ready
  await waitForDaemonReady({
    socketPath: opts.socketPath,
    timeoutMs,
  });
}

export interface StartDaemonForegroundOptions {
  socketPath: string;
  workspaceRoot?: string;
  env?: Record<string, string>;
}

/**
 * Start the daemon in the foreground (blocking).
 * Used for debugging. The function returns when the daemon exits.
 */
export function startDaemonForeground(opts: StartDaemonForegroundOptions): Promise<number> {
  const daemonPath = getDaemonExecutablePath();

  return new Promise<number>((resolve) => {
    const child = spawn(process.execPath, [daemonPath], {
      stdio: 'inherit',
      cwd: opts.workspaceRoot,
      env: {
        ...process.env,
        ...opts.env,
        XCODEBUILDMCP_SOCKET: opts.socketPath,
        XCODEBUILDCLI_SOCKET: opts.socketPath,
      },
    });

    child.on('exit', (code) => {
      resolve(code ?? 0);
    });
  });
}
