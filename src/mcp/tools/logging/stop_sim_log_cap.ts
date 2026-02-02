/**
 * Logging Plugin: Stop Simulator Log Capture
 *
 * Stops an active simulator log capture session and returns the captured logs.
 */

import * as z from 'zod';
import { stopLogCapture as _stopLogCapture } from '../../../utils/log-capture/index.ts';
import { ToolResponse, createTextContent } from '../../../types/common.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';
import type { CommandExecutor } from '../../../utils/command.ts';
import { getDefaultCommandExecutor, getDefaultFileSystemExecutor } from '../../../utils/command.ts';
import type { FileSystemExecutor } from '../../../utils/FileSystemExecutor.ts';

// Define schema as ZodObject
const stopSimLogCapSchema = z.object({
  logSessionId: z.string(),
});

// Use z.infer for type safety
type StopSimLogCapParams = z.infer<typeof stopSimLogCapSchema>;

/**
 * Business logic for stopping simulator log capture session
 */
export type StopLogCaptureFunction = (
  logSessionId: string,
  fileSystem?: FileSystemExecutor,
) => Promise<{ logContent: string; error?: string }>;

export async function stop_sim_log_capLogic(
  params: StopSimLogCapParams,
  neverExecutor: CommandExecutor = getDefaultCommandExecutor(),
  stopLogCaptureFunction: StopLogCaptureFunction = _stopLogCapture,
  fileSystem: FileSystemExecutor = getDefaultFileSystemExecutor(),
): Promise<ToolResponse> {
  const { logContent, error } = await stopLogCaptureFunction(params.logSessionId, fileSystem);
  if (error) {
    return {
      content: [
        createTextContent(`Error stopping log capture session ${params.logSessionId}: ${error}`),
      ],
      isError: true,
    };
  }
  return {
    content: [
      createTextContent(
        `Log capture session ${params.logSessionId} stopped successfully. Log content follows:\n\n${logContent}`,
      ),
    ],
  };
}

export default {
  name: 'stop_sim_log_cap',
  description: 'Stop sim app and return logs.',
  cli: {
    stateful: true,
  },
  schema: stopSimLogCapSchema.shape, // MCP SDK compatibility
  annotations: {
    title: 'Stop Simulator and Return Logs',
    destructiveHint: true,
  },
  handler: createTypedTool(
    stopSimLogCapSchema,
    (params: StopSimLogCapParams, executor: CommandExecutor) =>
      stop_sim_log_capLogic(params, executor),
    getDefaultCommandExecutor,
  ),
};
