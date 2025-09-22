/**
 * Video capture utility for simulator recordings using AXe.
 *
 * Manages long-running AXe "record-video" processes keyed by simulator UUID.
 * It aggregates stdout/stderr to parse the generated MP4 path on stop.
 */

import type { ChildProcess } from 'child_process';
import { log } from './logging/index.ts';
import { getAxePath, getBundledAxeEnvironment } from './axe-helpers.ts';
import type { CommandExecutor } from './execution/index.ts';

type Session = {
  process: unknown;
  sessionId: string;
  startedAt: number;
  buffer: string;
  ended: boolean;
};

const sessions = new Map<string, Session>();
let signalHandlersAttached = false;

export interface AxeHelpers {
  getAxePath: () => string | null;
  getBundledAxeEnvironment: () => Record<string, string>;
}

function ensureSignalHandlersAttached(): void {
  if (signalHandlersAttached) return;
  signalHandlersAttached = true;

  const stopAll = (): void => {
    for (const [simulatorUuid, sess] of sessions) {
      try {
        const child = sess.process as ChildProcess | undefined;
        child?.kill?.('SIGINT');
      } catch {
        // ignore
      } finally {
        sessions.delete(simulatorUuid);
      }
    }
  };

  try {
    process.on('SIGINT', stopAll);
    process.on('SIGTERM', stopAll);
    process.on('exit', stopAll);
  } catch {
    // Non-Node environments may not support process signals; ignore
  }
}

function parseLastAbsoluteMp4Path(buffer: string | undefined): string | null {
  if (!buffer) return null;
  const matches = [...buffer.matchAll(/(\s|^)(\/[^\s'"]+\.mp4)\b/gi)];
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1];
  return last?.[2] ?? null;
}

function createSessionId(simulatorUuid: string): string {
  return `${simulatorUuid}:${Date.now()}`;
}

/**
 * Start recording video for a simulator using AXe.
 */
export async function startSimulatorVideoCapture(
  params: { simulatorUuid: string; fps?: number },
  executor: CommandExecutor,
  axeHelpers?: AxeHelpers,
): Promise<{ started: boolean; sessionId?: string; warning?: string; error?: string }> {
  const simulatorUuid = params.simulatorUuid;
  if (!simulatorUuid) {
    return { started: false, error: 'simulatorUuid is required' };
  }

  if (sessions.has(simulatorUuid)) {
    return {
      started: false,
      error: 'A video recording session is already active for this simulator. Stop it first.',
    };
  }

  const helpers = axeHelpers ?? {
    getAxePath,
    getBundledAxeEnvironment,
  };

  const axeBinary = helpers.getAxePath();
  if (!axeBinary) {
    return { started: false, error: 'Bundled AXe binary not found' };
  }

  const fps = Number.isFinite(params.fps as number) ? Number(params.fps) : 30;
  const command = [axeBinary, 'record-video', '--udid', simulatorUuid, '--fps', String(fps)];
  const env = helpers.getBundledAxeEnvironment?.() ?? {};

  log('info', `Starting AXe video recording for simulator ${simulatorUuid} at ${fps} fps`);

  const result = await executor(command, 'Start Simulator Video Capture', true, { env }, true);

  if (!result.success || !result.process) {
    return {
      started: false,
      error: result.error ?? 'Failed to start video capture process',
    };
  }

  const child = result.process as ChildProcess;
  const session: Session = {
    process: child,
    sessionId: createSessionId(simulatorUuid),
    startedAt: Date.now(),
    buffer: '',
    ended: false,
  };

  try {
    child.stdout?.on('data', (d: unknown) => {
      try {
        session.buffer += String(d ?? '');
      } catch {
        // ignore
      }
    });
    child.stderr?.on('data', (d: unknown) => {
      try {
        session.buffer += String(d ?? '');
      } catch {
        // ignore
      }
    });
  } catch {
    // ignore stream listener setup failures
  }

  // Track when the child process naturally ends, so stop can short-circuit
  try {
    child.once?.('exit', () => {
      session.ended = true;
    });
    child.once?.('close', () => {
      session.ended = true;
    });
  } catch {
    // ignore
  }

  sessions.set(simulatorUuid, session);
  ensureSignalHandlersAttached();

  return {
    started: true,
    sessionId: session.sessionId,
    warning: fps !== (params.fps ?? 30) ? `FPS coerced to ${fps}` : undefined,
  };
}

/**
 * Stop recording video for a simulator. Returns aggregated output and parsed MP4 path if found.
 */
export async function stopSimulatorVideoCapture(
  params: { simulatorUuid: string },
  executor: CommandExecutor,
): Promise<{
  stopped: boolean;
  sessionId?: string;
  stdout?: string;
  parsedPath?: string;
  error?: string;
}> {
  // Mark executor as used to satisfy lint rule
  void executor;

  const simulatorUuid = params.simulatorUuid;
  if (!simulatorUuid) {
    return { stopped: false, error: 'simulatorUuid is required' };
  }

  const session = sessions.get(simulatorUuid);
  if (!session) {
    return { stopped: false, error: 'No active video recording session for this simulator' };
  }

  const child = session.process as ChildProcess | undefined;

  // Attempt graceful shutdown
  try {
    child?.kill?.('SIGINT');
  } catch {
    try {
      child?.kill?.();
    } catch {
      // ignore
    }
  }

  // Wait for process to close (avoid hanging if it already exited)
  await new Promise<void>((resolve): void => {
    if (!child) return resolve();

    // If process has already ended, resolve immediately
    const alreadyEnded = (session as Session).ended === true;
    const hasExitCode = (child as ChildProcess).exitCode !== null;
    const hasSignal = (child as unknown as { signalCode?: string | null }).signalCode != null;
    if (alreadyEnded || hasExitCode || hasSignal) {
      return resolve();
    }

    let resolved = false;
    const finish = (): void => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };
    try {
      child.once('close', finish);
      child.once('exit', finish);
    } catch {
      return finish();
    }
    // Safety timeout to prevent indefinite hangs
    setTimeout(finish, 5000);
  });

  const combinedOutput = session.buffer;
  const parsedPath = parseLastAbsoluteMp4Path(combinedOutput) ?? undefined;

  sessions.delete(simulatorUuid);

  log(
    'info',
    `Stopped AXe video recording for simulator ${simulatorUuid}. ${parsedPath ? `Detected file: ${parsedPath}` : 'No file detected in output.'}`,
  );

  return {
    stopped: true,
    sessionId: session.sessionId,
    stdout: combinedOutput,
    parsedPath,
  };
}
