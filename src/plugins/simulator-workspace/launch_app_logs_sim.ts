import { z } from 'zod';
import { log } from '../../utils/index.js';
import { validateRequiredParam } from '../../utils/index.js';
import { startLogCapture } from '../../utils/index.js';

function createTextContent(text: string): { type: string; text: string } {
  return {
    type: 'text',
    text,
  };
}

export default {
  name: 'launch_app_logs_sim',
  description: 'Launches an app in an iOS simulator and captures its logs.',
  schema: {
    simulatorUuid: z
      .string()
      .describe('UUID of the simulator to use (obtained from list_simulators)'),
    bundleId: z
      .string()
      .describe("Bundle identifier of the app to launch (e.g., 'com.example.MyApp')"),
    args: z.array(z.string()).optional().describe('Additional arguments to pass to the app'),
  },
  async handler(
    args: any,
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    const params = args;
    const simulatorUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
    if (!simulatorUuidValidation.isValid) {
      return simulatorUuidValidation.errorResponse;
    }

    const bundleIdValidation = validateRequiredParam('bundleId', params.bundleId);
    if (!bundleIdValidation.isValid) {
      return bundleIdValidation.errorResponse;
    }

    log('info', `Starting app launch with logs for simulator ${params.simulatorUuid}`);

    // Start log capture session
    const { sessionId, error } = await startLogCapture({
      simulatorUuid: params.simulatorUuid,
      bundleId: params.bundleId,
      captureConsole: true,
    });
    if (error) {
      return {
        content: [createTextContent(`App was launched but log capture failed: ${error}`)],
        isError: true,
      };
    }

    return {
      content: [
        createTextContent(
          `App launched successfully in simulator ${params.simulatorUuid} with log capture enabled.\n\nLog capture session ID: ${sessionId}\n\nNext Steps:\n1. Interact with your app in the simulator.\n2. Use 'stop_and_get_simulator_log({ logSessionId: "${sessionId}" })' to stop capture and retrieve logs.`,
        ),
      ],
    };
  },
};
