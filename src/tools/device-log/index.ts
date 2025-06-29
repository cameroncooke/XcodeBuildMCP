/**
 * Device Log Tools - Functions for capturing and managing iOS device logs
 *
 * This module provides tools for capturing and managing logs from physical iOS devices
 * connected via USB. It supports launching apps with console output capture and
 * retrieving captured logs.
 *
 * Responsibilities:
 * - Starting and stopping log capture sessions for physical devices
 * - Managing in-memory device log sessions
 * - Launching apps on devices with console output capture
 * - Retrieving captured logs from devices
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ToolResponse } from '../../types/common.js';
import { registerTool } from '../common/index.js';
import { log } from '../../utils/logger.js';

/**
 * Log file retention policy for device logs:
 * - Old log files (older than LOG_RETENTION_DAYS) are automatically deleted from the temp directory
 * - Cleanup runs on every new log capture start
 */
const LOG_RETENTION_DAYS = 3;
const DEVICE_LOG_FILE_PREFIX = 'xcodemcp_device_log_';

export interface DeviceLogSession {
  process: ChildProcess;
  logFilePath: string;
  deviceUuid: string;
  bundleId: string;
}

// Note: Device and simulator logging use different approaches due to platform constraints:
// - Simulators use 'xcrun simctl' with console-pty and OSLog stream capabilities
// - Devices use 'xcrun devicectl' with console output only (no OSLog streaming)
// The different command structures and output formats make sharing infrastructure complex.
// However, both follow similar patterns for session management and log retention.
export const activeDeviceLogSessions: Map<string, DeviceLogSession> = new Map();

/**
 * Start a log capture session for an iOS device by launching the app with console output.
 * Uses the devicectl command to launch the app and capture console logs.
 * Returns { sessionId, error? }
 */
export async function startDeviceLogCapture(params: {
  deviceUuid: string;
  bundleId: string;
}): Promise<{ sessionId: string; error?: string }> {
  // Clean up old logs before starting a new session
  await cleanOldDeviceLogs();

  const { deviceUuid, bundleId } = params;
  const logSessionId = uuidv4();
  const logFileName = `${DEVICE_LOG_FILE_PREFIX}${logSessionId}.log`;
  const logFilePath = path.join(os.tmpdir(), logFileName);

  try {
    await fs.promises.mkdir(os.tmpdir(), { recursive: true });
    await fs.promises.writeFile(logFilePath, '');
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    logStream.write(
      `\n--- Device log capture for bundle ID: ${bundleId} on device: ${deviceUuid} ---\n`,
    );

    // Use devicectl to launch the app with console output capture
    const deviceLogProcess = spawn('xcrun', [
      'devicectl',
      'device',
      'process',
      'launch',
      '--console',
      '--terminate-existing',
      '--device',
      deviceUuid,
      bundleId,
    ]);

    deviceLogProcess.stdout.pipe(logStream);
    deviceLogProcess.stderr.pipe(logStream);

    deviceLogProcess.on('close', (code) => {
      log(
        'info',
        `Device log capture process for session ${logSessionId} exited with code ${code}.`,
      );
    });

    deviceLogProcess.on('error', (error) => {
      log(
        'error',
        `Device log capture process error for session ${logSessionId}: ${error.message}`,
      );
    });

    activeDeviceLogSessions.set(logSessionId, {
      process: deviceLogProcess,
      logFilePath,
      deviceUuid,
      bundleId,
    });

    log('info', `Device log capture started with session ID: ${logSessionId}`);
    return { sessionId: logSessionId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('error', `Failed to start device log capture: ${message}`);
    return { sessionId: '', error: message };
  }
}

/**
 * Stop a device log capture session and retrieve the log content.
 */
export async function stopDeviceLogCapture(
  logSessionId: string,
): Promise<{ logContent: string; error?: string }> {
  const session = activeDeviceLogSessions.get(logSessionId);
  if (!session) {
    log('warning', `Device log session not found: ${logSessionId}`);
    return { logContent: '', error: `Device log capture session not found: ${logSessionId}` };
  }

  try {
    log('info', `Attempting to stop device log capture session: ${logSessionId}`);
    const logFilePath = session.logFilePath;

    if (!session.process.killed && session.process.exitCode === null) {
      session.process.kill('SIGTERM');
    }

    activeDeviceLogSessions.delete(logSessionId);
    log(
      'info',
      `Device log capture session ${logSessionId} stopped. Log file retained at: ${logFilePath}`,
    );

    await fs.promises.access(logFilePath, fs.constants.R_OK);
    const fileContent = await fs.promises.readFile(logFilePath, 'utf-8');
    log('info', `Successfully read device log content from ${logFilePath}`);
    return { logContent: fileContent };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('error', `Failed to stop device log capture session ${logSessionId}: ${message}`);
    return { logContent: '', error: message };
  }
}

/**
 * Deletes device log files older than LOG_RETENTION_DAYS from the temp directory.
 * Runs quietly; errors are logged but do not throw.
 */
// Device logs follow the same retention policy as simulator logs but use a different prefix
// to avoid conflicts. Both clean up logs older than LOG_RETENTION_DAYS automatically.
async function cleanOldDeviceLogs(): Promise<void> {
  const tempDir = os.tmpdir();
  let files: string[];
  try {
    files = await fs.promises.readdir(tempDir);
  } catch (err) {
    log(
      'warn',
      `Could not read temp dir for device log cleanup: ${err instanceof Error ? err.message : String(err)}`,
    );
    return;
  }
  const now = Date.now();
  const retentionMs = LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  await Promise.all(
    files
      .filter((f) => f.startsWith(DEVICE_LOG_FILE_PREFIX) && f.endsWith('.log'))
      .map(async (f) => {
        const filePath = path.join(tempDir, f);
        try {
          const stat = await fs.promises.stat(filePath);
          if (now - stat.mtimeMs > retentionMs) {
            await fs.promises.unlink(filePath);
            log('info', `Deleted old device log file: ${filePath}`);
          }
        } catch (err) {
          log(
            'warn',
            `Error during device log cleanup for ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }),
  );
}

// Device log schemas matching existing patterns
const deviceIdSchema = z.string().describe('UDID of the device (obtained from list_devices)');
const bundleIdSchema = z
  .string()
  .describe('Bundle identifier of the app to launch and capture logs for.');

// Exported tool components for start_device_log_cap
export const startDeviceLogCapToolName = 'start_device_log_cap';

export const startDeviceLogCapToolDescription =
  'Starts capturing logs from a specified Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro) by launching the app with console output. Returns a session ID.';

export const startDeviceLogCapToolSchema = z.object({
  deviceId: deviceIdSchema,
  bundleId: bundleIdSchema,
});

export const startDeviceLogCapToolHandler = async (args: unknown): Promise<ToolResponse> => {
  const { deviceId, bundleId } = args as { deviceId: string; bundleId: string };

  const { sessionId, error } = await startDeviceLogCapture({
    deviceUuid: deviceId,
    bundleId: bundleId,
  });

  if (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to start device log capture: ${error}`,
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: `✅ Device log capture started successfully\n\nSession ID: ${sessionId}\n\nNote: The app has been launched on the device with console output capture enabled.\n\nNext Steps:\n1. Interact with your app on the device\n2. Use stop_device_log_cap({ logSessionId: '${sessionId}' }) to stop capture and retrieve logs`,
      },
    ],
  };
};

/**
 * Registers the tool to start capturing logs from an iOS device.
 *
 * @param server The MCP Server instance.
 */
export function registerStartDeviceLogCaptureTool(server: McpServer): void {
  registerTool(
    server,
    startDeviceLogCapToolName,
    startDeviceLogCapToolDescription,
    startDeviceLogCapToolSchema.shape,
    startDeviceLogCapToolHandler,
  );
}

const logSessionIdSchema = z.string().describe('The session ID returned by start_device_log_cap.');

// Exported tool components for stop_device_log_cap
export const stopDeviceLogCapToolName = 'stop_device_log_cap';

export const stopDeviceLogCapToolDescription =
  'Stops an active Apple device log capture session and returns the captured logs.';

export const stopDeviceLogCapToolSchema = z.object({
  logSessionId: logSessionIdSchema,
});

export const stopDeviceLogCapToolHandler = async (args: unknown): Promise<ToolResponse> => {
  const { logSessionId } = args as { logSessionId: string };

  const { logContent, error } = await stopDeviceLogCapture(logSessionId);

  if (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Failed to stop device log capture session ${logSessionId}: ${error}`,
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: `✅ Device log capture session stopped successfully\n\nSession ID: ${logSessionId}\n\n--- Captured Logs ---\n${logContent}`,
      },
    ],
  };
};

/**
 * Registers the tool to stop device log capture and retrieve the content in one operation.
 *
 * @param server The MCP Server instance.
 */
export function registerStopDeviceLogCaptureTool(server: McpServer): void {
  registerTool(
    server,
    stopDeviceLogCapToolName,
    stopDeviceLogCapToolDescription,
    stopDeviceLogCapToolSchema.shape,
    stopDeviceLogCapToolHandler,
  );
}
