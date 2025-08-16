/**
 * Devices Resource Plugin
 *
 * Provides access to connected Apple devices through MCP resource system.
 * This resource reuses the existing list_devices tool logic to maintain consistency.
 */

import { log } from '../../utils/logging/index.js';
import type { CommandExecutor } from '../../utils/execution/index.js';
import { getDefaultCommandExecutor } from '../../utils/execution/index.js';
import { list_devicesLogic } from '../tools/device/list_devices.js';

// Testable resource logic separated from MCP handler
export async function devicesResourceLogic(
  executor: CommandExecutor = getDefaultCommandExecutor(),
): Promise<{ contents: Array<{ text: string }> }> {
  try {
    log('info', 'Processing devices resource request');
    const result = await list_devicesLogic({}, executor);

    if (result.isError) {
      const errorText = result.content[0]?.text;
      throw new Error(typeof errorText === 'string' ? errorText : 'Failed to retrieve device data');
    }

    return {
      contents: [
        {
          text:
            typeof result.content[0]?.text === 'string'
              ? result.content[0].text
              : 'No device data available',
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error in devices resource handler: ${errorMessage}`);

    return {
      contents: [
        {
          text: `Error retrieving device data: ${errorMessage}`,
        },
      ],
    };
  }
}

export default {
  uri: 'xcodebuildmcp://devices',
  name: 'devices',
  description: 'Connected physical Apple devices with their UUIDs, names, and connection status',
  mimeType: 'text/plain',
  async handler(): Promise<{ contents: Array<{ text: string }> }> {
    return devicesResourceLogic();
  },
};
