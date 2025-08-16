/**
 * Simulator Resource Plugin
 *
 * Provides access to available iOS simulators through MCP resource system.
 * This resource reuses the existing list_sims tool logic to maintain consistency.
 */

import { log } from '../../utils/logging/index.js';
import { getDefaultCommandExecutor } from '../../utils/execution/index.js';
import type { CommandExecutor } from '../../utils/execution/index.js';
import { list_simsLogic } from '../tools/simulator/list_sims.js';

// Testable resource logic separated from MCP handler
export async function simulatorsResourceLogic(
  executor: CommandExecutor = getDefaultCommandExecutor(),
): Promise<{ contents: Array<{ text: string }> }> {
  try {
    log('info', 'Processing simulators resource request');
    const result = await list_simsLogic({}, executor);

    if (result.isError) {
      const errorText = result.content[0]?.text;
      throw new Error(
        typeof errorText === 'string' ? errorText : 'Failed to retrieve simulator data',
      );
    }

    return {
      contents: [
        {
          text:
            typeof result.content[0]?.text === 'string'
              ? result.content[0].text
              : 'No simulator data available',
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error in simulators resource handler: ${errorMessage}`);

    return {
      contents: [
        {
          text: `Error retrieving simulator data: ${errorMessage}`,
        },
      ],
    };
  }
}

export default {
  uri: 'xcodebuildmcp://simulators',
  name: 'simulators',
  description: 'Available iOS simulators with their UUIDs and states',
  mimeType: 'text/plain',
  async handler(): Promise<{ contents: Array<{ text: string }> }> {
    return simulatorsResourceLogic();
  },
};
