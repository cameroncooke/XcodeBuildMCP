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
import { ToolResponse } from '../types/common.js';
import { validateRequiredParam } from '../utils/validation.js';
import { registerTool, createTextContent } from './common.js';
import { log } from '../utils/logger.js';
import { executeCommand } from '../utils/command.js';

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

    logStream.write(`\n--- Device log capture for bundle ID: ${bundleId} on device: ${deviceUuid} ---\n`);

    // Use devicectl to launch the app with console output capture
    const deviceLogProcess = spawn('xcrun', [
      'devicectl',
      'device',
      'process',
      'launch',
      '--console',
      '--device',
      deviceUuid,
      bundleId,
    ]);

    deviceLogProcess.stdout.pipe(logStream);
    deviceLogProcess.stderr.pipe(logStream);

    deviceLogProcess.on('close', (code) => {
      log('info', `Device log capture process for session ${logSessionId} exited with code ${code}.`);
    });

    deviceLogProcess.on('error', (error) => {
      log('error', `Device log capture process error for session ${logSessionId}: ${error.message}`);
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

/**
 * Registers the tool to list available iOS devices.
 *
 * @param server The MCP Server instance.
 */
export function registerListDevicesTool(server: McpServer): void {
  async function handler(): Promise<ToolResponse> {
    log('info', 'Starting xcrun devicectl list devices request');

    try {
      const command = ['xcrun', 'devicectl', 'list', 'devices', '--json'];
      const result = await executeCommand(command, 'List Devices');

      if (!result.success) {
        return {
          content: [
            createTextContent(`Failed to list devices: ${result.error}`),
          ],
          isError: true,
        };
      }

      try {
        const devicesData = JSON.parse(result.output);
        let responseText = 'Available iOS Devices:\n\n';

        if (devicesData.result && devicesData.result.devices && devicesData.result.devices.length > 0) {
          for (const device of devicesData.result.devices) {
            responseText += `📱 ${device.deviceProperties?.name || 'Unknown Device'}\n`;
            responseText += `   UUID: ${device.identifier}\n`;
            responseText += `   Model: ${device.deviceProperties?.deviceType || 'Unknown'}\n`;
            responseText += `   OS Version: ${device.deviceProperties?.osVersionNumber || 'Unknown'}\n`;
            responseText += `   Connection: ${device.connectionProperties?.transportType || 'Unknown'}\n`;
            responseText += `   State: ${device.deviceProperties?.deviceState || 'Unknown'}\n\n`;
          }
        } else {
          responseText += 'No devices found. Make sure your iOS device is:\n';
          responseText += '• Connected via USB\n';
          responseText += '• Trusted (check for "Trust This Computer" dialog)\n';
          responseText += '• Has Developer Mode enabled (iOS 16+)\n';
          responseText += '• Is unlocked\n';
        }

        return {
          content: [createTextContent(responseText)],
        };
      } catch (parseError) {
        log('error', `Failed to parse device list JSON: ${parseError}`);
        return {
          content: [
            createTextContent(`Failed to parse device list: ${parseError instanceof Error ? parseError.message : String(parseError)}`),
          ],
          isError: true,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('error', `Error during list devices operation: ${errorMessage}`);
      return {
        content: [
          createTextContent(`❌ List devices operation failed: ${errorMessage}`),
        ],
        isError: true,
      };
    }
  }

  registerTool(
    server,
    'list_devices',
    'Lists available iOS devices connected via USB with their UUIDs and connection information.',
    {},
    handler,
  );
}

/**
 * Registers the tool to start capturing logs from an iOS device.
 *
 * @param server The MCP Server instance.
 */
export function registerStartDeviceLogCaptureTool(server: McpServer): void {
  const schema = {
    deviceUuid: z
      .string()
      .describe('UUID of the iOS device to capture logs from (obtained from list_devices or Xcode).'),
    bundleId: z.string().describe('Bundle identifier of the app to launch and capture logs for.'),
  };

  async function handler(params: {
    deviceUuid: string;
    bundleId: string;
  }): Promise<ToolResponse> {
    const deviceValidation = validateRequiredParam('deviceUuid', params.deviceUuid);
    if (!deviceValidation.isValid) {
      return deviceValidation.errorResponse!;
    }

    const bundleValidation = validateRequiredParam('bundleId', params.bundleId);
    if (!bundleValidation.isValid) {
      return bundleValidation.errorResponse!;
    }

    const { sessionId, error } = await startDeviceLogCapture(params);
    if (error) {
      return {
        content: [createTextContent(`Error starting device log capture: ${error}`)],
        isError: true,
      };
    }
    return {
      content: [
        createTextContent(
          `Device log capture started successfully. Session ID: ${sessionId}.\n\nNote: The app has been launched on the device with console output capture enabled.\n\nNext Steps:\n1. Interact with your app on the device.\n2. Use 'stop_device_log_cap' with session ID '${sessionId}' to stop capture and retrieve logs.`,
        ),
      ],
    };
  }

  registerTool(
    server,
    'start_device_log_cap',
    'Starts capturing logs from a specified iOS device by launching the app with console output. Returns a session ID.',
    schema,
    handler,
  );
}

/**
 * Registers the tool to stop device log capture and retrieve the content in one operation.
 *
 * @param server The MCP Server instance.
 */
export function registerStopAndGetDeviceLogTool(server: McpServer): void {
  const schema = {
    logSessionId: z.string().describe('The session ID returned by start_device_log_cap.'),
  };

  async function handler(params: { logSessionId: string }): Promise<ToolResponse> {
    const validationResult = validateRequiredParam('logSessionId', params.logSessionId);
    if (!validationResult.isValid) {
      return validationResult.errorResponse!;
    }
    const { logContent, error } = await stopDeviceLogCapture(params.logSessionId);
    if (error) {
      return {
        content: [
          createTextContent(`Error stopping device log capture session ${params.logSessionId}: ${error}`),
        ],
        isError: true,
      };
    }
    return {
      content: [
        createTextContent(
          `Device log capture session ${params.logSessionId} stopped successfully. Log content follows:\n\n${logContent}`,
        ),
      ],
    };
  }

  registerTool(
    server,
    'stop_device_log_cap',
    'Stops an active device log capture session and returns the captured logs.',
    schema,
    handler,
  );
}

/**
 * Registers all device log capture tools.
 *
 * @param server The MCP Server instance.
 */
export function registerDeviceLogTools(server: McpServer): void {
  registerListDevicesTool(server);
  registerStartDeviceLogCaptureTool(server);
  registerStopAndGetDeviceLogTool(server);
}
