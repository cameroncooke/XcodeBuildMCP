import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../utils/logger.ts';
import { CommandExecutor, getDefaultCommandExecutor } from './command.ts';

/**
 * Log file retention policy:
 * - Old log files (older than LOG_RETENTION_DAYS) are automatically deleted from the temp directory
 * - Cleanup runs on every new log capture start
 */
const LOG_RETENTION_DAYS = 3;
const LOG_FILE_PREFIX = 'xcodemcp_sim_log_';

export interface LogSession {
  processes: ChildProcess[];
  logFilePath: string;
  simulatorUuid: string;
  bundleId: string;
}

export const activeLogSessions: Map<string, LogSession> = new Map();

/**
 * Start a log capture session for an iOS simulator.
 * Returns { sessionId, logFilePath, processes, error? }
 */
export async function startLogCapture(
  params: {
    simulatorUuid: string;
    bundleId: string;
    captureConsole?: boolean;
    args?: string[];
  },
  executor: CommandExecutor = getDefaultCommandExecutor(),
): Promise<{ sessionId: string; logFilePath: string; processes: ChildProcess[]; error?: string }> {
  // Clean up old logs before starting a new session
  await cleanOldLogs();

  const { simulatorUuid, bundleId, captureConsole = false, args = [] } = params;
  const logSessionId = uuidv4();
  const logFileName = `${LOG_FILE_PREFIX}${logSessionId}.log`;
  const logFilePath = path.join(os.tmpdir(), logFileName);

  try {
    await fs.promises.mkdir(os.tmpdir(), { recursive: true });
    await fs.promises.writeFile(logFilePath, '');
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    const processes: ChildProcess[] = [];
    logStream.write('\n--- Log capture for bundle ID: ' + bundleId + ' ---\n');

    if (captureConsole) {
      const launchCommand = [
        'xcrun',
        'simctl',
        'launch',
        '--console-pty',
        '--terminate-running-process',
        simulatorUuid,
        bundleId,
      ];
      if (args.length > 0) {
        launchCommand.push(...args);
      }

      const stdoutLogResult = await executor(
        launchCommand,
        'Console Log Capture',
        true, // useShell
        undefined, // env
        true, // detached - don't wait for this streaming process to complete
      );

      if (!stdoutLogResult.success) {
        return {
          sessionId: '',
          logFilePath: '',
          processes: [],
          error: stdoutLogResult.error ?? 'Failed to start console log capture',
        };
      }

      stdoutLogResult.process.stdout?.pipe(logStream);
      stdoutLogResult.process.stderr?.pipe(logStream);
      processes.push(stdoutLogResult.process);
    }

    const osLogResult = await executor(
      [
        'xcrun',
        'simctl',
        'spawn',
        simulatorUuid,
        'log',
        'stream',
        '--level=debug',
        '--predicate',
        `subsystem == "${bundleId}"`,
      ],
      'OS Log Capture',
      true, // useShell
      undefined, // env
      true, // detached - don't wait for this streaming process to complete
    );

    if (!osLogResult.success) {
      return {
        sessionId: '',
        logFilePath: '',
        processes: [],
        error: osLogResult.error ?? 'Failed to start OS log capture',
      };
    }

    osLogResult.process.stdout?.pipe(logStream);
    osLogResult.process.stderr?.pipe(logStream);
    processes.push(osLogResult.process);

    for (const process of processes) {
      process.on('close', (code) => {
        log('info', `A log capture process for session ${logSessionId} exited with code ${code}.`);
      });
    }

    activeLogSessions.set(logSessionId, {
      processes,
      logFilePath,
      simulatorUuid,
      bundleId,
    });

    log('info', `Log capture started with session ID: ${logSessionId}`);
    return { sessionId: logSessionId, logFilePath, processes };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('error', `Failed to start log capture: ${message}`);
    return { sessionId: '', logFilePath: '', processes: [], error: message };
  }
}

/**
 * Stop a log capture session and retrieve the log content.
 */
export async function stopLogCapture(
  logSessionId: string,
): Promise<{ logContent: string; error?: string }> {
  const session = activeLogSessions.get(logSessionId);
  if (!session) {
    log('warning', `Log session not found: ${logSessionId}`);
    return { logContent: '', error: `Log capture session not found: ${logSessionId}` };
  }

  try {
    log('info', `Attempting to stop log capture session: ${logSessionId}`);
    const logFilePath = session.logFilePath;
    for (const process of session.processes) {
      if (!process.killed && process.exitCode === null) {
        process.kill('SIGTERM');
      }
    }
    activeLogSessions.delete(logSessionId);
    log(
      'info',
      `Log capture session ${logSessionId} stopped. Log file retained at: ${logFilePath}`,
    );
    await fs.promises.access(logFilePath, fs.constants.R_OK);
    const fileContent = await fs.promises.readFile(logFilePath, 'utf-8');
    log('info', `Successfully read log content from ${logFilePath}`);
    return { logContent: fileContent };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('error', `Failed to stop log capture session ${logSessionId}: ${message}`);
    return { logContent: '', error: message };
  }
}

/**
 * Deletes log files older than LOG_RETENTION_DAYS from the temp directory.
 * Runs quietly; errors are logged but do not throw.
 */
async function cleanOldLogs(): Promise<void> {
  const tempDir = os.tmpdir();
  let files: string[];
  try {
    files = await fs.promises.readdir(tempDir);
  } catch (err) {
    log(
      'warn',
      `Could not read temp dir for log cleanup: ${err instanceof Error ? err.message : String(err)}`,
    );
    return;
  }
  const now = Date.now();
  const retentionMs = LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  await Promise.all(
    files
      .filter((f) => f.startsWith(LOG_FILE_PREFIX) && f.endsWith('.log'))
      .map(async (f) => {
        const filePath = path.join(tempDir, f);
        try {
          const stat = await fs.promises.stat(filePath);
          if (now - stat.mtimeMs > retentionMs) {
            await fs.promises.unlink(filePath);
            log('info', `Deleted old log file: ${filePath}`);
          }
        } catch (err) {
          log(
            'warn',
            `Error during log cleanup for ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }),
  );
}
