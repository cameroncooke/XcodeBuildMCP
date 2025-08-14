import { z } from 'zod';
import { ToolResponse } from '../../../types/common.js';
import { log } from '../../../utils/index.js';
import { CommandExecutor, getDefaultCommandExecutor } from '../../../utils/command.js';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.js';

// Unified schema: XOR between simulatorUuid and simulatorName
const baseOptions = {
  simulatorUuid: z
    .string()
    .optional()
    .describe(
      'UUID of the simulator to use (obtained from list_simulators). Provide EITHER this OR simulatorName, not both',
    ),
  simulatorName: z
    .string()
    .optional()
    .describe(
      "Name of the simulator (e.g., 'iPhone 16'). Provide EITHER this OR simulatorUuid, not both",
    ),
  bundleId: z
    .string()
    .describe("Bundle identifier of the app to launch (e.g., 'com.example.MyApp')"),
  args: z.array(z.string()).optional().describe('Additional arguments to pass to the app'),
};

const baseSchemaObject = z.object(baseOptions);

const launchAppSimSchema = baseSchemaObject
  .transform(nullifyEmptyStrings)
  .refine(
    (val) =>
      (val as LaunchAppSimParams).simulatorUuid !== undefined ||
      (val as LaunchAppSimParams).simulatorName !== undefined,
    {
      message: 'Either simulatorUuid or simulatorName is required.',
    },
  )
  .refine(
    (val) =>
      !(
        (val as LaunchAppSimParams).simulatorUuid !== undefined &&
        (val as LaunchAppSimParams).simulatorName !== undefined
      ),
    {
      message: 'simulatorUuid and simulatorName are mutually exclusive. Provide only one.',
    },
  );

export type LaunchAppSimParams = {
  simulatorUuid?: string;
  simulatorName?: string;
  bundleId: string;
  args?: string[];
};

export async function launch_app_simLogic(
  params: LaunchAppSimParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  let simulatorUuid = params.simulatorUuid;
  let simulatorDisplayName = simulatorUuid ?? '';

  // If simulatorName is provided, look it up
  if (params.simulatorName && !simulatorUuid) {
    log('info', `Looking up simulator by name: ${params.simulatorName}`);

    const simulatorListResult = await executor(
      ['xcrun', 'simctl', 'list', 'devices', 'available', '--json'],
      'List Simulators',
      true,
    );
    if (!simulatorListResult.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to list simulators: ${simulatorListResult.error}`,
          },
        ],
        isError: true,
      };
    }
    const simulatorsData = JSON.parse(simulatorListResult.output) as {
      devices: Record<string, unknown[]>;
    };

    let foundSimulator: { udid: string; name: string } | null = null;

    // Find the target simulator by name
    for (const runtime in simulatorsData.devices) {
      const devices = simulatorsData.devices[runtime] as Array<{ udid: string; name: string }>;
      const simulator = devices.find((device) => device.name === params.simulatorName);
      if (simulator) {
        foundSimulator = simulator;
        break;
      }
    }

    if (!foundSimulator) {
      return {
        content: [
          {
            type: 'text',
            text: `Simulator named "${params.simulatorName}" not found. Use list_sims to see available simulators.`,
          },
        ],
        isError: true,
      };
    }

    simulatorUuid = foundSimulator.udid;
    simulatorDisplayName = `"${params.simulatorName}" (${foundSimulator.udid})`;
  }

  if (!simulatorUuid) {
    return {
      content: [
        {
          type: 'text',
          text: 'No simulator UUID or name provided',
        },
      ],
      isError: true,
    };
  }

  log('info', `Starting xcrun simctl launch request for simulator ${simulatorUuid}`);

  // Check if the app is installed in the simulator
  try {
    const getAppContainerCmd = [
      'xcrun',
      'simctl',
      'get_app_container',
      simulatorUuid,
      params.bundleId,
      'app',
    ];
    const getAppContainerResult = await executor(
      getAppContainerCmd,
      'Check App Installed',
      true,
      undefined,
    );
    if (!getAppContainerResult.success) {
      return {
        content: [
          {
            type: 'text',
            text: `App is not installed on the simulator. Please use install_app_in_simulator before launching.\n\nWorkflow: build → install → launch.`,
          },
        ],
        isError: true,
      };
    }
  } catch {
    return {
      content: [
        {
          type: 'text',
          text: `App is not installed on the simulator (check failed). Please use install_app_in_simulator before launching.\n\nWorkflow: build → install → launch.`,
        },
      ],
      isError: true,
    };
  }

  try {
    const command = ['xcrun', 'simctl', 'launch', simulatorUuid, params.bundleId];

    if (params.args && params.args.length > 0) {
      command.push(...params.args);
    }

    const result = await executor(command, 'Launch App in Simulator', true, undefined);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Launch app in simulator operation failed: ${result.error}`,
          },
        ],
      };
    }

    // Use the same parameter style that the user provided for consistency
    const userParamName = params.simulatorUuid ? 'simulatorUuid' : 'simulatorName';
    const userParamValue = params.simulatorUuid ?? params.simulatorName;

    return {
      content: [
        {
          type: 'text',
          text: `✅ App launched successfully in simulator ${simulatorDisplayName ?? simulatorUuid}.

Next Steps:
1. To see simulator: open_sim()
2. Log capture: start_sim_log_cap({ ${userParamName}: "${userParamValue}", bundleId: "${params.bundleId}" })
   With console: start_sim_log_cap({ ${userParamName}: "${userParamValue}", bundleId: "${params.bundleId}", captureConsole: true })
3. Stop logs: stop_sim_log_cap({ logSessionId: 'SESSION_ID' })`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error during launch app in simulator operation: ${errorMessage}`);
    return {
      content: [
        {
          type: 'text',
          text: `Launch app in simulator operation failed: ${errorMessage}`,
        },
      ],
    };
  }
}

export default {
  name: 'launch_app_sim',
  description:
    "Launches an app in an iOS simulator by UUID or name. If simulator window isn't visible, use open_sim() first. IMPORTANT: Provide either simulatorUuid OR simulatorName, plus bundleId. Note: You must install the app in the simulator before launching. The typical workflow is: build → install → launch. Example: launch_app_sim({ simulatorUuid: 'YOUR_UUID_HERE', bundleId: 'com.example.MyApp' }) or launch_app_sim({ simulatorName: 'iPhone 16', bundleId: 'com.example.MyApp' })",
  schema: baseSchemaObject.shape, // MCP SDK compatibility
  handler: async (args: Record<string, unknown>): Promise<ToolResponse> => {
    try {
      // Runtime validation with XOR constraints
      const validatedParams = launchAppSimSchema.parse(args);
      return await launch_app_simLogic(
        validatedParams as LaunchAppSimParams,
        getDefaultCommandExecutor(),
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format validation errors in a user-friendly way
        const errorMessages = error.errors.map((e) => {
          return `${e.path.join('.')}: ${e.message}`;
        });
        return {
          content: [
            {
              type: 'text',
              text: `Parameter validation failed:\n${errorMessages.join('\n')}`,
            },
          ],
          isError: true,
        };
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      log('error', `Error in launch_app_sim handler: ${errorMessage}`);
      return {
        content: [
          {
            type: 'text',
            text: `Launch app operation failed: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  },
};
