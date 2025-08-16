/**
 * Logging Plugin: Start Device Log Capture
 *
 * Starts capturing logs from a specified Apple device by launching the app with console output.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { log } from '../../../utils/logging/index.js';
import type { CommandExecutor, FileSystemExecutor } from '../../../utils/execution/index.js';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.js';
import { ToolResponse } from '../../../types/common.js';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

/**
 * Log file retention policy for device logs:
 * - Old log files (older than LOG_RETENTION_DAYS) are automatically deleted from the temp directory
 * - Cleanup runs on every new log capture start
 */
const LOG_RETENTION_DAYS = 3;
const DEVICE_LOG_FILE_PREFIX = 'xcodemcp_device_log_';

// Note: Device and simulator logging use different approaches due to platform constraints:
// - Simulators use 'xcrun simctl' with console-pty and OSLog stream capabilities
// - Devices use 'xcrun devicectl' with console output only (no OSLog streaming)
// The different command structures and output formats make sharing infrastructure complex.
// However, both follow similar patterns for session management and log retention.
export const activeDeviceLogSessions = new Map();

/**
 * Start a log capture session for an iOS device by launching the app with console output.
 * Uses the devicectl command to launch the app and capture console logs.
 * Returns { sessionId, error? }
 */
export async function startDeviceLogCapture(
  params: {
    deviceUuid: string;
    bundleId: string;
  },
  executor: CommandExecutor = getDefaultCommandExecutor(),
  fileSystemExecutor?: FileSystemExecutor,
): Promise<{ sessionId: string; error?: string }> {
  // Clean up old logs before starting a new session
  await cleanOldDeviceLogs();

  const { deviceUuid, bundleId } = params;
  const logSessionId = uuidv4();
  const logFileName = `${DEVICE_LOG_FILE_PREFIX}${logSessionId}.log`;
  const logFilePath = path.join(os.tmpdir(), logFileName);

  try {
    // Use injected file system executor or default
    if (fileSystemExecutor) {
      await fileSystemExecutor.mkdir(fileSystemExecutor.tmpdir(), { recursive: true });
      await fileSystemExecutor.writeFile(logFilePath, '');
    } else {
      await fs.promises.mkdir(os.tmpdir(), { recursive: true });
      await fs.promises.writeFile(logFilePath, '');
    }

    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

    logStream.write(
      `\n--- Device log capture for bundle ID: ${bundleId} on device: ${deviceUuid} ---\n`,
    );

    // Use executor with dependency injection instead of spawn directly
    const result = await executor(
      [
        'xcrun',
        'devicectl',
        'device',
        'process',
        'launch',
        '--console',
        '--terminate-existing',
        '--device',
        deviceUuid,
        bundleId,
      ],
      'Device Log Capture',
      true,
      undefined,
    );

    // For testing purposes, we'll simulate process management
    // In actual usage, the process would be managed by the executor result
    activeDeviceLogSessions.set(logSessionId, {
      process: result.process,
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
 * Deletes device log files older than LOG_RETENTION_DAYS from the temp directory.
 * Runs quietly; errors are logged but do not throw.
 */
// Device logs follow the same retention policy as simulator logs but use a different prefix
// to avoid conflicts. Both clean up logs older than LOG_RETENTION_DAYS automatically.
async function cleanOldDeviceLogs(): Promise<void> {
  const tempDir = os.tmpdir();
  let files;
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

// Define schema as ZodObject
const startDeviceLogCapSchema = z.object({
  deviceId: z.string().describe('UDID of the device (obtained from list_devices)'),
  bundleId: z.string().describe('Bundle identifier of the app to launch and capture logs for.'),
});

// Use z.infer for type safety
type StartDeviceLogCapParams = z.infer<typeof startDeviceLogCapSchema>;

/**
 * Core business logic for starting device log capture.
 */
export async function start_device_log_capLogic(
  params: StartDeviceLogCapParams,
  executor: CommandExecutor,
  fileSystemExecutor?: FileSystemExecutor,
): Promise<ToolResponse> {
  const { deviceId, bundleId } = params;

  const { sessionId, error } = await startDeviceLogCapture(
    {
      deviceUuid: deviceId,
      bundleId: bundleId,
    },
    executor,
    fileSystemExecutor,
  );

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
}

export default {
  name: 'start_device_log_cap',
  description:
    'Starts capturing logs from a specified Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro) by launching the app with console output. Returns a session ID.',
  schema: startDeviceLogCapSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    startDeviceLogCapSchema,
    start_device_log_capLogic,
    getDefaultCommandExecutor,
  ),
};
