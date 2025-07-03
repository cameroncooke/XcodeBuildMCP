/**
 * Logging Plugin: Stop Device Log Capture
 * 
 * Stops an active Apple device log capture session and returns the captured logs.
 */

import * as fs from 'fs';
import { z } from 'zod';
import { log } from '../../src/utils/logger.js';
import { activeDeviceLogSessions } from './start_device_log_cap.js';

/**
 * Stop a device log capture session and retrieve the log content.
 */
export async function stopDeviceLogCapture(logSessionId) {
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

const stopDeviceLogCapToolHandler = async (args) => {
  const { logSessionId } = args;

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

export default {
  name: 'stop_device_log_cap',
  description: 'Stops an active Apple device log capture session and returns the captured logs.',
  schema: z.object({
    logSessionId: z.string().describe('The session ID returned by start_device_log_cap.'),
  }),
  handler: stopDeviceLogCapToolHandler,
};