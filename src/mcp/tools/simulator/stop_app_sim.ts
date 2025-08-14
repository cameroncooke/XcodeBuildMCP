import { z } from 'zod';
import { ToolResponse } from '../../../types/common.js';
import { log, CommandExecutor, getDefaultCommandExecutor } from '../../../utils/index.js';
import { nullifyEmptyStrings } from '../../../utils/schema-helpers.js';

// Unified schema: XOR between simulatorUuid and simulatorName
const baseOptions = {
  simulatorUuid: z
    .string()
    .optional()
    .describe(
      'UUID of the simulator (obtained from list_simulators). Provide EITHER this OR simulatorName, not both',
    ),
  simulatorName: z
    .string()
    .optional()
    .describe(
      "Name of the simulator (e.g., 'iPhone 16'). Provide EITHER this OR simulatorUuid, not both",
    ),
  bundleId: z.string().describe("Bundle identifier of the app to stop (e.g., 'com.example.MyApp')"),
};

const baseSchemaObject = z.object(baseOptions);

const stopAppSimSchema = baseSchemaObject
  .transform(nullifyEmptyStrings)
  .refine(
    (val) =>
      (val as StopAppSimParams).simulatorUuid !== undefined ||
      (val as StopAppSimParams).simulatorName !== undefined,
    {
      message: 'Either simulatorUuid or simulatorName is required.',
    },
  )
  .refine(
    (val) =>
      !(
        (val as StopAppSimParams).simulatorUuid !== undefined &&
        (val as StopAppSimParams).simulatorName !== undefined
      ),
    {
      message: 'simulatorUuid and simulatorName are mutually exclusive. Provide only one.',
    },
  );

export type StopAppSimParams = {
  simulatorUuid?: string;
  simulatorName?: string;
  bundleId: string;
};

export async function stop_app_simLogic(
  params: StopAppSimParams,
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

  log('info', `Stopping app ${params.bundleId} in simulator ${simulatorUuid}`);

  try {
    const command = ['xcrun', 'simctl', 'terminate', simulatorUuid, params.bundleId];
    const result = await executor(command, 'Stop App in Simulator', true, undefined);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Stop app in simulator operation failed: ${result.error}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ App ${params.bundleId} stopped successfully in simulator ${simulatorDisplayName || simulatorUuid}`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error stopping app in simulator: ${errorMessage}`);
    return {
      content: [
        {
          type: 'text',
          text: `Stop app in simulator operation failed: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

export default {
  name: 'stop_app_sim',
  description:
    'Stops an app running in an iOS simulator by UUID or name. IMPORTANT: Provide either simulatorUuid OR simulatorName, plus bundleId. Example: stop_app_sim({ simulatorUuid: "UUID", bundleId: "com.example.MyApp" }) or stop_app_sim({ simulatorName: "iPhone 16", bundleId: "com.example.MyApp" })',
  schema: baseSchemaObject.shape, // MCP SDK compatibility
  handler: async (args: Record<string, unknown>): Promise<ToolResponse> => {
    try {
      // Runtime validation with XOR constraints
      const validatedParams = stopAppSimSchema.parse(args);
      return await stop_app_simLogic(
        validatedParams as StopAppSimParams,
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
      log('error', `Error in stop_app_sim handler: ${errorMessage}`);
      return {
        content: [
          {
            type: 'text',
            text: `Stop app operation failed: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  },
};
