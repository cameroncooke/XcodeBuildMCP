/**
 * Environment Resource Plugin
 *
 * Provides access to development environment diagnostic information through MCP resource system.
 * This resource reuses the existing diagnostic tool logic to maintain consistency.
 */

import { log, getDefaultCommandExecutor, CommandExecutor } from '../../utils/index.js';
import { diagnosticLogic } from '../tools/diagnostics/diagnostic.js';

export default {
  uri: 'xcodebuildmcp://environment',
  name: 'environment',
  description:
    'Comprehensive development environment diagnostic information and configuration status',
  mimeType: 'text/plain',
  async handler(
    uri: URL,
    executor: CommandExecutor = getDefaultCommandExecutor(),
  ): Promise<{ contents: Array<{ text: string }> }> {
    try {
      log('info', 'Processing environment resource request');

      const result = await diagnosticLogic({}, executor);

      if (result.isError) {
        const errorText = result.content[0]?.text;
        throw new Error(
          typeof errorText === 'string' ? errorText : 'Failed to retrieve environment data',
        );
      }

      return {
        contents: [
          {
            text:
              typeof result.content[0]?.text === 'string'
                ? result.content[0].text
                : 'No environment data available',
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('error', `Error in environment resource handler: ${errorMessage}`);

      return {
        contents: [
          {
            text: `Error retrieving environment data: ${errorMessage}`,
          },
        ],
      };
    }
  },
};
