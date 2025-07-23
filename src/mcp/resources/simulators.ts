/**
 * Simulator Resource Plugin
 *
 * Provides access to available iOS simulators through MCP resource system.
 * This resource reuses the existing list_sims tool logic to maintain consistency.
 */

import { log, getDefaultCommandExecutor, CommandExecutor } from '../../utils/index.js';
import { list_simsLogic } from '../tools/simulator-shared/list_sims.js';

export default {
  uri: 'mcp://xcodebuild/simulators',
  description: 'Available iOS simulators with their UUIDs and states',
  mimeType: 'text/plain',
  async handler(
    executor: CommandExecutor = getDefaultCommandExecutor(),
  ): Promise<{ contents: Array<{ type: 'text'; text: string }> }> {
    try {
      log('info', 'Processing simulators resource request');

      const result = await list_simsLogic({}, executor);

      if (result.isError) {
        throw new Error(result.content[0]?.text || 'Failed to retrieve simulator data');
      }

      return {
        contents: [
          {
            type: 'text' as const,
            text: result.content[0]?.text || 'No simulator data available',
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('error', `Error in simulators resource handler: ${errorMessage}`);

      return {
        contents: [
          {
            type: 'text' as const,
            text: `Error retrieving simulator data: ${errorMessage}`,
          },
        ],
      };
    }
  },
};
