/**
 * Logging Plugin: Stop Simulator Log Capture
 *
 * Stops an active simulator log capture session and returns the captured logs.
 */

import { z } from 'zod';
import { stopLogCapture } from '../../utils/index.js';
import { validateRequiredParam } from '../../utils/index.js';

// Helper to create a standard text response content.
function createTextContent(text: string): { type: string; text: string } {
  return { type: 'text', text };
}

async function stopSimLogCapToolHandler(params: {
  logSessionId: string;
}): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  const validationResult = validateRequiredParam('logSessionId', params.logSessionId);
  if (!validationResult.isValid) {
    return validationResult.errorResponse;
  }
  const { logContent, error } = await stopLogCapture(params.logSessionId);
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
