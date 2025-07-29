/**
 * Logging Plugin: Stop Device Log Capture
 *
 * Stops an active Apple device log capture session and returns the captured logs.
 */

import * as fs from 'fs';
import { z } from 'zod';
import { log } from '../../../utils/index.js';
import { activeDeviceLogSessions } from './start_device_log_cap.js';
import { ToolResponse } from '../../../types/common.js';
import { FileSystemExecutor, getDefaultFileSystemExecutor } from '../../../utils/command.js';

type StopDeviceLogCapParams = {
  logSessionId: string;
};

/**
 * Business logic for stopping device log capture session
 */
export async function stop_device_log_capLogic(
  params: StopDeviceLogCapParams,
  fileSystemExecutor: FileSystemExecutor,
): Promise<ToolResponse> {
  const { logSessionId } = params;

  const session = activeDeviceLogSessions.get(logSessionId);
  if (!session) {
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
 * Legacy support for backward compatibility
 */
export async function stopDeviceLogCapture(
  logSessionId: string,
  fileSystem?: unknown,
): Promise<{ logContent: string; error?: string }> {
  // For backward compatibility, create a mock FileSystemExecutor from the fileSystem parameter
  const fsToUse = (fileSystem as typeof fs) || fs;
  const mockFileSystemExecutor: FileSystemExecutor = {
    async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
      if (fsToUse.promises) {
        await fsToUse.promises.mkdir(path, options);
      } else {
        await fs.promises.mkdir(path, options);
      }
    },
    async readFile(path: string, encoding: string = 'utf8'): Promise<string> {
      if (fsToUse.promises) {
        return (await fsToUse.promises.readFile(path, encoding as BufferEncoding)) as string;
      } else {
        return (await fs.promises.readFile(path, encoding as BufferEncoding)) as string;
      }
    },
    async writeFile(path: string, content: string, encoding: string = 'utf8'): Promise<void> {
      if (fsToUse.promises) {
        await fsToUse.promises.writeFile(path, content, encoding as BufferEncoding);
      } else {
        await fs.promises.writeFile(path, content, encoding as BufferEncoding);
      }
    },
    async cp(
      source: string,
      destination: string,
      options?: { recursive?: boolean },
    ): Promise<void> {
      if (fsToUse.promises) {
        await fsToUse.promises.cp(source, destination, options);
      } else {
        await fs.promises.cp(source, destination, options);
      }
    },
    async readdir(path: string, options?: { withFileTypes?: boolean }): Promise<unknown[]> {
      if (fsToUse.promises) {
        return (await fsToUse.promises.readdir(
          path,
          options as { withFileTypes?: boolean },
        )) as unknown[];
      } else {
        return (await fs.promises.readdir(
          path,
          options as { withFileTypes?: boolean },
        )) as unknown[];
      }
    },
    async rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
      if (fsToUse.promises) {
        await fsToUse.promises.rm(path, options);
      } else {
        await fs.promises.rm(path, options);
      }
    },
    existsSync(path: string): boolean {
      return (fsToUse.existsSync || fs.existsSync)(path);
    },
    async stat(path: string): Promise<{ isDirectory(): boolean }> {
      if (fsToUse.promises) {
        return (await fsToUse.promises.stat(path)) as { isDirectory(): boolean };
      } else {
        return (await fs.promises.stat(path)) as { isDirectory(): boolean };
      }
    },
    async mkdtemp(prefix: string): Promise<string> {
      if (fsToUse.promises) {
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
    return {
      logContent: '',
      error: (result.content[0].text as string).replace(
        `Failed to stop device log capture session ${logSessionId}: `,
        '',
      ),
    };
  }

  // Extract log content from successful response
  const text = result.content[0].text as string;
  const logContentMatch = text.match(/--- Captured Logs ---\n([\s\S]*)$/);
  const logContent = logContentMatch ? logContentMatch[1] : '';

  return { logContent };
}

export default {
  name: 'stop_device_log_cap',
  description: 'Stops an active Apple device log capture session and returns the captured logs.',
  schema: {
    logSessionId: z.string().describe('The session ID returned by start_device_log_cap.'),
  },
  handler: async (params: Record<string, unknown>): Promise<ToolResponse> => {
    return stop_device_log_capLogic(
      params as StopDeviceLogCapParams,
      getDefaultFileSystemExecutor(),
    );
  },
};
