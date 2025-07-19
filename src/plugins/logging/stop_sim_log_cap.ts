/**
 * Logging Plugin: Stop Simulator Log Capture
 *
 * Stops an active simulator log capture session and returns the captured logs.
 */

import { z } from 'zod';
import { stopLogCapture as _stopLogCapture } from '../../utils/index.js';
import { validateRequiredParam } from '../../utils/index.js';
import { ToolResponse, createTextContent } from '../../types/common.js';

async function stopSimLogCapToolHandler(
  params: { logSessionId: string },
  stopLogCapture?: (logSessionId: string) => Promise<{ logContent: string; error?: string }>,
): Promise<ToolResponse> {
  const validationResult = validateRequiredParam('logSessionId', params.logSessionId);
  if (!validationResult.isValid) {
    return validationResult.errorResponse!;
  }

  // Use injected dependency or default import
  const stopLogCaptureFunc = stopLogCapture || _stopLogCapture;

  const { logContent, error } = await stopLogCaptureFunc(params.logSessionId);
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
  description: 'Stops an active simulator log capture session and returns the captured logs.',
  schema: {
    logSessionId: z.string().describe('The session ID returned by start_sim_log_cap.'),
  },
  handler: stopSimLogCapToolHandler,
};
