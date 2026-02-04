/**
 * Doctor Resource Plugin
 *
 * Provides access to development environment doctor information through MCP resource system.
 * This resource reuses the existing doctor tool logic to maintain consistency.
 */

import { log } from '../../utils/logging/index.ts';
import type { CommandExecutor } from '../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../utils/execution/index.ts';
import { doctorLogic } from '../tools/doctor/doctor.ts';

// Testable resource logic separated from MCP handler
export async function doctorResourceLogic(
  executor: CommandExecutor = getDefaultCommandExecutor(),
): Promise<{ contents: Array<{ text: string }> }> {
  try {
    log('info', 'Processing doctor resource request');
    const result = await doctorLogic({}, executor);

    if (result.isError) {
      const textItem = result.content.find((i) => i.type === 'text') as
        | { type: 'text'; text: string }
        | undefined;
      const errorText = textItem?.text;
      const errorMessage =
        typeof errorText === 'string' ? errorText : 'Failed to retrieve doctor data';
      log('error', `Error in doctor resource handler: ${errorMessage}`);
      return {
        contents: [
          {
            text: `Error retrieving doctor data: ${errorMessage}`,
          },
        ],
      };
    }

    const okTextItem = result.content.find((i) => i.type === 'text') as
      | { type: 'text'; text: string }
      | undefined;
    return {
      contents: [
        {
          text: okTextItem?.text ?? 'No doctor data available',
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error in doctor resource handler: ${errorMessage}`);

    return {
      contents: [
        {
          text: `Error retrieving doctor data: ${errorMessage}`,
        },
      ],
    };
  }
}

export default {
  uri: 'xcodebuildmcp://doctor',
  name: 'doctor',
  description:
    'Comprehensive development environment diagnostic information and configuration status',
  mimeType: 'text/plain',
  async handler(): Promise<{ contents: Array<{ text: string }> }> {
    return doctorResourceLogic();
  },
};
