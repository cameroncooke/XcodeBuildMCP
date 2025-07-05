import { z } from 'zod';
import { log } from '../../utils/index.js';
import { validateRequiredParam, validateFileExists } from '../../utils/index.js';
import { executeCommand } from '../../utils/index.js';
import { execSync } from 'child_process';

export default {
  name: 'install_app_sim',
  description:
    "Installs an app in an iOS simulator. IMPORTANT: You MUST provide both the simulatorUuid and appPath parameters. Example: install_app_sim({ simulatorUuid: 'YOUR_UUID_HERE', appPath: '/path/to/your/app.app' })",
  schema: {
    simulatorUuid: z
      .string()
      .describe('UUID of the simulator to use (obtained from list_simulators)'),
    appPath: z
      .string()
      .describe('Path to the .app bundle to install (full path to the .app directory)'),
  },
  async handler(
    args: any,
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    const params = args;
    const simulatorUuidValidation = validateRequiredParam('simulatorUuid', params.simulatorUuid);
    if (!simulatorUuidValidation.isValid) {
      return simulatorUuidValidation.errorResponse;
    }

    const appPathValidation = validateRequiredParam('appPath', params.appPath);
    if (!appPathValidation.isValid) {
      return appPathValidation.errorResponse;
    }

    const appPathExistsValidation = validateFileExists(params.appPath);
    if (!appPathExistsValidation.isValid) {
      return appPathExistsValidation.errorResponse;
    }

    log('info', `Starting xcrun simctl install request for simulator ${params.simulatorUuid}`);

    try {
      const command = ['xcrun', 'simctl', 'install', params.simulatorUuid, params.appPath];
      const result = await executeCommand(command, 'Install App in Simulator');

      if (!result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Install app in simulator operation failed: ${result.error}`,
            },
          ],
        };
      }

      let bundleId = '';
      try {
        bundleId = execSync(`defaults read "${params.appPath}/Info" CFBundleIdentifier`)
          .toString()
          .trim();
      } catch (error) {
        log('warning', `Could not extract bundle ID from app: ${error}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: `App installed successfully in simulator ${params.simulatorUuid}`,
          },
          {
            type: 'text',
            text: `Next Steps:
1. Open the Simulator app: open_sim({ enabled: true })
2. Launch the app: launch_app_sim({ simulatorUuid: "${params.simulatorUuid}"${bundleId ? `, bundleId: "${bundleId}"` : ', bundleId: "YOUR_APP_BUNDLE_ID"'} })`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('error', `Error during install app in simulator operation: ${errorMessage}`);
      return {
        content: [
          {
            type: 'text',
            text: `Install app in simulator operation failed: ${errorMessage}`,
          },
        ],
      };
    }
  },
};
