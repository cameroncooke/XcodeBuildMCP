#!/usr/bin/env node
import net from 'node:net';
import { dirname } from 'node:path';
import { existsSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { bootstrapRuntime } from './runtime/bootstrap-runtime.ts';
import { buildDaemonToolCatalogFromManifest } from './runtime/tool-catalog.ts';
import { loadManifest } from './core/manifest/load-manifest.ts';
import {
  ensureSocketDir,
  removeStaleSocket,
  getSocketPath,
  getWorkspaceKey,
  resolveWorkspaceRoot,
  logPathForWorkspaceKey,
} from './daemon/socket-path.ts';
import { startDaemonServer } from './daemon/daemon-server.ts';
import {
  writeDaemonRegistryEntry,
  removeDaemonRegistryEntry,
  cleanupWorkspaceDaemonFiles,
} from './daemon/daemon-registry.ts';
import { log, setLogFile, setLogLevel, type LogLevel } from './utils/logger.ts';
import { version } from './version.ts';
import {
  DAEMON_IDLE_TIMEOUT_ENV_KEY,
  DEFAULT_DAEMON_IDLE_CHECK_INTERVAL_MS,
  resolveDaemonIdleTimeoutMs,
  getDaemonRuntimeActivitySnapshot,
  hasActiveRuntimeSessions,
} from './daemon/idle-shutdown.ts';

async function checkExistingDaemon(socketPath: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection(socketPath);

    socket.on('connect', () => {
      socket.end();
      resolve(true);
    });

    socket.on('error', () => {
      resolve(false);
    });
  });
}

function writeLine(text: string): void {
  process.stdout.write(`${text}\n`);
}

const MAX_LOG_BYTES = 10 * 1024 * 1024;
const MAX_LOG_ROTATIONS = 3;

function rotateLogIfNeeded(logPath: string): void {
  if (!existsSync(logPath)) {
    return;
  }

  const size = statSync(logPath).size;
  if (size < MAX_LOG_BYTES) {
    return;
  }

  for (let index = MAX_LOG_ROTATIONS - 1; index >= 1; index -= 1) {
    const from = `${logPath}.${index}`;
    const to = `${logPath}.${index + 1}`;
    if (existsSync(from)) {
      renameSync(from, to);
    }
  }

  renameSync(logPath, `${logPath}.1`);
}

function resolveDaemonLogPath(workspaceKey: string): string | null {
  const override = process.env.XCODEBUILDMCP_DAEMON_LOG_PATH?.trim();
  if (override) {
    return override;
  }

  return logPathForWorkspaceKey(workspaceKey);
}

function ensureLogDir(logPath: string): void {
  const dir = dirname(logPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

function resolveLogLevel(): LogLevel | null {
  const raw = process.env.XCODEBUILDMCP_DAEMON_LOG_LEVEL?.trim().toLowerCase();
  if (!raw) {
    return null;
  }

  const knownLevels: LogLevel[] = [
    'none',
    'emergency',
    'alert',
    'critical',
    'error',
    'warning',
    'notice',
    'info',
    'debug',
  ];

  if (knownLevels.includes(raw as LogLevel)) {
    return raw as LogLevel;
  }

  return null;
}

async function main(): Promise<void> {
  // Bootstrap runtime first to get config and workspace info
  const result = await bootstrapRuntime({
    runtime: 'daemon',
    configOverrides: {
      disableSessionDefaults: true,
    },
  });

  // Compute workspace context
  const workspaceRoot = resolveWorkspaceRoot({
    cwd: result.runtime.cwd,
    projectConfigPath: result.configPath,
  });

  const workspaceKey = getWorkspaceKey({
    cwd: result.runtime.cwd,
    projectConfigPath: result.configPath,
  });

  const logPath = resolveDaemonLogPath(workspaceKey);
  if (logPath) {
    ensureLogDir(logPath);
    rotateLogIfNeeded(logPath);
    setLogFile(logPath);

    const requestedLogLevel = resolveLogLevel();
    if (requestedLogLevel) {
      setLogLevel(requestedLogLevel);
    } else {
      setLogLevel('info');
    }
  }

  log('info', `[Daemon] xcodebuildmcp daemon ${version} starting...`);

  // Get socket path (env override or workspace-derived)
  const socketPath = getSocketPath({
    cwd: result.runtime.cwd,
    projectConfigPath: result.configPath,
  });

  log('info', `[Daemon] Workspace: ${workspaceRoot}`);
  log('info', `[Daemon] Socket: ${socketPath}`);
  if (logPath) {
    log('info', `[Daemon] Logs: ${logPath}`);
  }

  ensureSocketDir(socketPath);

  // Check if daemon is already running
  const isRunning = await checkExistingDaemon(socketPath);
  if (isRunning) {
    log('error', '[Daemon] Another daemon is already running for this workspace');
    console.error('Error: Daemon is already running for this workspace');
    process.exit(1);
  }

  // Remove stale socket file
  removeStaleSocket(socketPath);

  const excludedWorkflows = ['session-management', 'workflow-discovery'];

  // Daemon runtime serves CLI routing and should not be filtered by enabledWorkflows.
  // CLI exposure is controlled at CLI catalog/command registration time.
  // Get all workflows from manifest (for reporting purposes and filtering).
  const manifest = loadManifest();
  const allWorkflowIds = Array.from(manifest.workflows.keys());
  const daemonWorkflows = allWorkflowIds.filter((workflowId) => {
    if (excludedWorkflows.includes(workflowId)) {
      return false;
    }
    return true;
  });
  const xcodeIdeWorkflowEnabled = daemonWorkflows.includes('xcode-ide');

  // Build tool catalog using manifest system
  const catalog = await buildDaemonToolCatalogFromManifest({
    excludeWorkflows: excludedWorkflows,
  });

  log('info', `[Daemon] Loaded ${catalog.tools.length} tools`);

  const startedAt = new Date().toISOString();
  const idleTimeoutMs = resolveDaemonIdleTimeoutMs();
  const configuredIdleTimeout = process.env[DAEMON_IDLE_TIMEOUT_ENV_KEY]?.trim();
  if (configuredIdleTimeout) {
    const parsedIdleTimeout = Number(configuredIdleTimeout);
    if (!Number.isFinite(parsedIdleTimeout) || parsedIdleTimeout < 0) {
      log(
        'warn',
        `[Daemon] Invalid ${DAEMON_IDLE_TIMEOUT_ENV_KEY}=${configuredIdleTimeout}; using default ${idleTimeoutMs}ms`,
      );
    }
  }

  if (idleTimeoutMs === 0) {
    log('info', '[Daemon] Idle shutdown disabled');
  } else {
    log(
      'info',
      `[Daemon] Idle shutdown enabled: timeout=${idleTimeoutMs}ms interval=${DEFAULT_DAEMON_IDLE_CHECK_INTERVAL_MS}ms`,
    );
  }

  let isShuttingDown = false;
  let inFlightRequests = 0;
  let lastActivityAt = Date.now();
  let idleCheckTimer: NodeJS.Timeout | null = null;

  const markActivity = (): void => {
    lastActivityAt = Date.now();
  };

  // Unified shutdown handler
  const shutdown = (): void => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;

    if (idleCheckTimer) {
      clearInterval(idleCheckTimer);
      idleCheckTimer = null;
    }

    log('info', '[Daemon] Shutting down...');

    // Close the server
    server.close(() => {
      log('info', '[Daemon] Server closed');

      // Remove registry entry and socket
      removeDaemonRegistryEntry(workspaceKey);
      removeStaleSocket(socketPath);

      log('info', '[Daemon] Cleanup complete');
      process.exit(0);
    });

    // Force exit if server doesn't close in time
    setTimeout(() => {
      log('warn', '[Daemon] Forced shutdown after timeout');
      cleanupWorkspaceDaemonFiles(workspaceKey);
      process.exit(1);
    }, 5000);
  };

  // Start server
  const server = startDaemonServer({
    socketPath,
    logPath: logPath ?? undefined,
    startedAt,
    enabledWorkflows: daemonWorkflows,
    catalog,
    workspaceRoot,
    workspaceKey,
    xcodeIdeWorkflowEnabled,
    requestShutdown: shutdown,
    onRequestStarted: () => {
      inFlightRequests += 1;
      markActivity();
    },
    onRequestFinished: () => {
      inFlightRequests = Math.max(0, inFlightRequests - 1);
      markActivity();
    },
  });

  if (idleTimeoutMs > 0) {
    idleCheckTimer = setInterval(() => {
      if (isShuttingDown) {
        return;
      }

      const idleForMs = Date.now() - lastActivityAt;
      if (idleForMs < idleTimeoutMs) {
        return;
      }

      if (inFlightRequests > 0) {
        return;
      }

      const sessionSnapshot = getDaemonRuntimeActivitySnapshot();
      if (hasActiveRuntimeSessions(sessionSnapshot)) {
        return;
      }

      log(
        'info',
        `[Daemon] Idle timeout reached (${idleForMs}ms >= ${idleTimeoutMs}ms); shutting down`,
      );
      shutdown();
    }, DEFAULT_DAEMON_IDLE_CHECK_INTERVAL_MS);
    idleCheckTimer.unref?.();
  }

  server.listen(socketPath, () => {
    log('info', `[Daemon] Listening on ${socketPath}`);

    // Write registry entry after successful listen
    writeDaemonRegistryEntry({
      workspaceKey,
      workspaceRoot,
      socketPath,
      logPath: logPath ?? undefined,
      pid: process.pid,
      startedAt,
      enabledWorkflows: daemonWorkflows,
      version,
    });

    writeLine(`Daemon started (PID: ${process.pid})`);
    writeLine(`Workspace: ${workspaceRoot}`);
    writeLine(`Socket: ${socketPath}`);
    writeLine(`Tools: ${catalog.tools.length}`);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  log('error', `Daemon error: ${message}`);
  console.error('Daemon error:', message);
  process.exit(1);
});
