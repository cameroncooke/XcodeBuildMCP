/**
 * Logging Plugin: Stop Device Log Capture
 *
 * Stops an active Apple device log capture session and returns the captured logs.
 */

import * as fs from 'fs';
import type { ChildProcess } from 'child_process';
import { z } from 'zod';
import { log } from '../../../utils/logging/index.js';
import { activeDeviceLogSessions } from './start_device_log_cap.js';
import { ToolResponse } from '../../../types/common.js';
import { getDefaultFileSystemExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';
import { FileSystemExecutor } from '../../../utils/FileSystemExecutor.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.js';

interface DeviceLogSession {
  process:
    | ChildProcess
    | { killed?: boolean; exitCode?: number | null; kill?: (signal?: string) => boolean };
  logFilePath: string;
  deviceUuid: string;
  bundleId: string;
}

// Define schema as ZodObject
const stopDeviceLogCapSchema = z.object({
  logSessionId: z.string().describe('The session ID returned by start_device_log_cap.'),
});

// Use z.infer for type safety
type StopDeviceLogCapParams = z.infer<typeof stopDeviceLogCapSchema>;

/**
 * Type guard to validate device log session structure
 */
function isValidDeviceLogSession(session: unknown): session is DeviceLogSession {
  return (
    typeof session === 'object' &&
    session !== null &&
    'process' in session &&
    'logFilePath' in session &&
    'deviceUuid' in session &&
    'bundleId' in session &&
    typeof (session as DeviceLogSession).logFilePath === 'string' &&
    typeof (session as DeviceLogSession).deviceUuid === 'string' &&
    typeof (session as DeviceLogSession).bundleId === 'string'
  );
}

/**
 * Business logic for stopping device log capture session
 */
export async function stop_device_log_capLogic(
  params: StopDeviceLogCapParams,
  fileSystemExecutor: FileSystemExecutor,
): Promise<ToolResponse> {
  const { logSessionId } = params;

  const sessionData: unknown = activeDeviceLogSessions.get(logSessionId);
  if (!sessionData) {
    log('warning', `Device log session not found: ${logSessionId}`);
    return {
      content: [
        {
          type: 'text',
          text: `Failed to stop device log capture session ${logSessionId}: Device log capture session not found: ${logSessionId}`,
        },
      ],
      isError: true,
    };
  }

  // Validate session structure
  if (!isValidDeviceLogSession(sessionData)) {
    log('error', `Invalid device log session structure for session ${logSessionId}`);
    return {
      content: [
        {
          type: 'text',
          text: `Failed to stop device log capture session ${logSessionId}: Invalid session structure`,
        },
      ],
      isError: true,
    };
  }

  const session = sessionData as DeviceLogSession;

  try {
    log('info', `Attempting to stop device log capture session: ${logSessionId}`);
    const logFilePath = session.logFilePath;

    if (!session.process.killed && session.process.exitCode === null) {
      session.process.kill?.('SIGTERM');
    }

    activeDeviceLogSessions.delete(logSessionId);
    log(
      'info',
      `Device log capture session ${logSessionId} stopped. Log file retained at: ${logFilePath}`,
    );

    // Check file access
    if (!fileSystemExecutor.existsSync(logFilePath)) {
      throw new Error(`Log file not found: ${logFilePath}`);
    }

    const fileContent = await fileSystemExecutor.readFile(logFilePath, 'utf-8');
    log('info', `Successfully read device log content from ${logFilePath}`);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Device log capture session stopped successfully\n\nSession ID: ${logSessionId}\n\n--- Captured Logs ---\n${fileContent}`,
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('error', `Failed to stop device log capture session ${logSessionId}: ${message}`);
    return {
      content: [
        {
          type: 'text',
          text: `Failed to stop device log capture session ${logSessionId}: ${message}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Type guard to check if an object has fs-like promises interface
 */
function hasPromisesInterface(obj: unknown): obj is { promises: typeof fs.promises } {
  return typeof obj === 'object' && obj !== null && 'promises' in obj;
}

/**
 * Type guard to check if an object has existsSync method
 */
function hasExistsSyncMethod(obj: unknown): obj is { existsSync: typeof fs.existsSync } {
  return typeof obj === 'object' && obj !== null && 'existsSync' in obj;
}

/**
 * Legacy support for backward compatibility
 */
export async function stopDeviceLogCapture(
  logSessionId: string,
  fileSystem?: unknown,
): Promise<{ logContent: string; error?: string }> {
  // For backward compatibility, create a mock FileSystemExecutor from the fileSystem parameter
  const fsToUse = fileSystem ?? fs;
  const mockFileSystemExecutor: FileSystemExecutor = {
    async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
      if (hasPromisesInterface(fsToUse)) {
        await fsToUse.promises.mkdir(path, options);
      } else {
        await fs.promises.mkdir(path, options);
      }
    },
    async readFile(path: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
      if (hasPromisesInterface(fsToUse)) {
        const result = await fsToUse.promises.readFile(path, encoding);
        return typeof result === 'string' ? result : (result as Buffer).toString();
      } else {
        const result = await fs.promises.readFile(path, encoding);
        return typeof result === 'string' ? result : (result as Buffer).toString();
      }
    },
    async writeFile(
      path: string,
      content: string,
      encoding: BufferEncoding = 'utf8',
    ): Promise<void> {
      if (hasPromisesInterface(fsToUse)) {
        await fsToUse.promises.writeFile(path, content, encoding);
      } else {
        await fs.promises.writeFile(path, content, encoding);
      }
    },
    async cp(
      source: string,
      destination: string,
      options?: { recursive?: boolean },
    ): Promise<void> {
      if (hasPromisesInterface(fsToUse)) {
        await fsToUse.promises.cp(source, destination, options);
      } else {
        await fs.promises.cp(source, destination, options);
      }
    },
    async readdir(path: string, options?: { withFileTypes?: boolean }): Promise<unknown[]> {
      if (hasPromisesInterface(fsToUse)) {
        if (options?.withFileTypes === true) {
          const result = await fsToUse.promises.readdir(path, { withFileTypes: true });
          return Array.isArray(result) ? result : [];
        } else {
          const result = await fsToUse.promises.readdir(path);
          return Array.isArray(result) ? result : [];
        }
      } else {
        if (options?.withFileTypes === true) {
          const result = await fs.promises.readdir(path, { withFileTypes: true });
          return Array.isArray(result) ? result : [];
        } else {
          const result = await fs.promises.readdir(path);
          return Array.isArray(result) ? result : [];
        }
      }
    },
    async rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
      if (hasPromisesInterface(fsToUse)) {
        await fsToUse.promises.rm(path, options);
      } else {
        await fs.promises.rm(path, options);
      }
    },
    existsSync(path: string): boolean {
      if (hasExistsSyncMethod(fsToUse)) {
        return fsToUse.existsSync(path);
      } else {
        return fs.existsSync(path);
      }
    },
    async stat(path: string): Promise<{ isDirectory(): boolean }> {
      if (hasPromisesInterface(fsToUse)) {
        const result = await fsToUse.promises.stat(path);
        return result as { isDirectory(): boolean };
      } else {
        const result = await fs.promises.stat(path);
        return result as { isDirectory(): boolean };
      }
    },
    async mkdtemp(prefix: string): Promise<string> {
      if (hasPromisesInterface(fsToUse)) {
        return await fsToUse.promises.mkdtemp(prefix);
      } else {
        return await fs.promises.mkdtemp(prefix);
      }
    },
    tmpdir(): string {
      return '/tmp';
    },
  };

  const result = await stop_device_log_capLogic({ logSessionId }, mockFileSystemExecutor);

  if (result.isError) {
    const errorText = result.content[0]?.text;
    const errorMessage =
      typeof errorText === 'string'
        ? errorText.replace(`Failed to stop device log capture session ${logSessionId}: `, '')
        : 'Unknown error occurred';

    return {
      logContent: '',
      error: errorMessage,
    };
  }

  // Extract log content from successful response
  const successText = result.content[0]?.text;
  if (typeof successText !== 'string') {
    return {
      logContent: '',
      error: 'Invalid response format: expected text content',
    };
  }

  const logContentMatch = successText.match(/--- Captured Logs ---\n([\s\S]*)$/);
  const logContent = logContentMatch?.[1] ?? '';

  return { logContent };
}

export default {
  name: 'stop_device_log_cap',
  description: 'Stops an active Apple device log capture session and returns the captured logs.',
  schema: stopDeviceLogCapSchema.shape, // MCP SDK compatibility
  handler: createTypedTool(
    stopDeviceLogCapSchema,
    (params: StopDeviceLogCapParams) => {
      return stop_device_log_capLogic(params, getDefaultFileSystemExecutor());
    },
    getDefaultCommandExecutor,
  ),
};
