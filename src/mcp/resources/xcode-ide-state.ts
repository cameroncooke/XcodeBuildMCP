/**
 * Xcode IDE State Resource
 *
 * Provides read-only access to Xcode's current IDE selection (scheme and simulator).
 * Reads from UserInterfaceState.xcuserstate without modifying session defaults.
 *
 * Only available when running under Xcode's coding agent.
 */

import { log } from '../../utils/logging/index.ts';
import { getDefaultCommandExecutor } from '../../utils/execution/index.ts';
import { readXcodeIdeState } from '../../utils/xcode-state-reader.ts';

export interface XcodeIdeStateResponse {
  detected: boolean;
  scheme?: string;
  simulatorId?: string;
  simulatorName?: string;
  error?: string;
}

export async function xcodeIdeStateResourceLogic(): Promise<{
  contents: Array<{ text: string }>;
}> {
  try {
    log('info', 'Processing Xcode IDE state resource request');

    const executor = getDefaultCommandExecutor();
    const cwd = process.cwd();

    const state = await readXcodeIdeState({ executor, cwd });

    const response: XcodeIdeStateResponse = {
      detected: !state.error && (!!state.scheme || !!state.simulatorId),
      scheme: state.scheme,
      simulatorId: state.simulatorId,
      simulatorName: state.simulatorName,
      error: state.error,
    };

    return {
      contents: [
        {
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error in Xcode IDE state resource handler: ${errorMessage}`);

    const response: XcodeIdeStateResponse = {
      detected: false,
      error: errorMessage,
    };

    return {
      contents: [
        {
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }
}

export default {
  uri: 'xcodebuildmcp://xcode-ide-state',
  name: 'xcode-ide-state',
  description: "Current Xcode IDE selection (scheme and simulator) from Xcode's UI state",
  mimeType: 'application/json',
  async handler(): Promise<{ contents: Array<{ text: string }> }> {
    return xcodeIdeStateResourceLogic();
  },
};
