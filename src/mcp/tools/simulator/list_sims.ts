import * as z from 'zod';
import type { ToolResponse } from '../../../types/common.ts';
import { log } from '../../../utils/logging/index.ts';
import type { CommandExecutor } from '../../../utils/execution/index.ts';
import { getDefaultCommandExecutor } from '../../../utils/execution/index.ts';
import { createTypedTool } from '../../../utils/typed-tool-factory.ts';

// Define schema as ZodObject
const listSimsSchema = z.object({
  enabled: z.boolean().optional(),
});

// Use z.infer for type safety
type ListSimsParams = z.infer<typeof listSimsSchema>;

interface SimulatorDevice {
  name: string;
  udid: string;
  state: string;
  isAvailable: boolean;
  runtime?: string;
}

interface SimulatorData {
  devices: Record<string, SimulatorDevice[]>;
}

// Parse text output as fallback for Apple simctl JSON bugs (e.g., duplicate runtime IDs)
function parseTextOutput(textOutput: string): SimulatorDevice[] {
  const devices: SimulatorDevice[] = [];
  const lines = textOutput.split('\n');
  let currentRuntime = '';

  for (const line of lines) {
    // Match runtime headers like "-- iOS 26.0 --" or "-- iOS 18.6 --"
    const runtimeMatch = line.match(/^-- ([\w\s.]+) --$/);
    if (runtimeMatch) {
      currentRuntime = runtimeMatch[1];
      continue;
    }

    // Match device lines like "    iPhone 17 Pro (UUID) (Booted)"
    // UUID pattern is flexible to handle test UUIDs like "test-uuid-123"
    const deviceMatch = line.match(
      /^\s+(.+?)\s+\(([^)]+)\)\s+\((Booted|Shutdown|Booting|Shutting Down)\)(\s+\(unavailable.*\))?$/i,
    );
    if (deviceMatch && currentRuntime) {
      const [, name, udid, state, unavailableSuffix] = deviceMatch;
      const isUnavailable = Boolean(unavailableSuffix);
      if (!isUnavailable) {
        devices.push({
          name: name.trim(),
          udid,
          state,
          isAvailable: true,
          runtime: currentRuntime,
        });
      }
    }
  }

  return devices;
}

function isSimulatorData(value: unknown): value is SimulatorData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;
  if (!obj.devices || typeof obj.devices !== 'object') {
    return false;
  }

  const devices = obj.devices as Record<string, unknown>;
  for (const runtime in devices) {
    const deviceList = devices[runtime];
    if (!Array.isArray(deviceList)) {
      return false;
    }

    for (const device of deviceList) {
      if (!device || typeof device !== 'object') {
        return false;
      }

      const deviceObj = device as Record<string, unknown>;
      if (
        typeof deviceObj.name !== 'string' ||
        typeof deviceObj.udid !== 'string' ||
        typeof deviceObj.state !== 'string' ||
        typeof deviceObj.isAvailable !== 'boolean'
      ) {
        return false;
      }
    }
  }

  return true;
}

export async function list_simsLogic(
  params: ListSimsParams,
  executor: CommandExecutor,
): Promise<ToolResponse> {
  log('info', 'Starting xcrun simctl list devices request');

  try {
    // Try JSON first for structured data
    const jsonCommand = ['xcrun', 'simctl', 'list', 'devices', '--json'];
    const jsonResult = await executor(jsonCommand, 'List Simulators (JSON)', false);

    if (!jsonResult.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to list simulators: ${jsonResult.error}`,
          },
        ],
      };
    }

    // Parse JSON output
    let jsonDevices: Record<string, SimulatorDevice[]> = {};
    try {
      const parsedData: unknown = JSON.parse(jsonResult.output);
      if (isSimulatorData(parsedData)) {
        jsonDevices = parsedData.devices;
      }
    } catch {
      log('warn', 'Failed to parse JSON output, falling back to text parsing');
    }

    // Fallback to text parsing for Apple simctl bugs (duplicate runtime IDs in iOS 26.0 beta)
    const textCommand = ['xcrun', 'simctl', 'list', 'devices'];
    const textResult = await executor(textCommand, 'List Simulators (Text)', false);

    const textDevices = textResult.success ? parseTextOutput(textResult.output) : [];

    // Merge JSON and text devices, preferring JSON but adding any missing from text
    const allDevices: Record<string, SimulatorDevice[]> = { ...jsonDevices };
    const jsonUUIDs = new Set<string>();

    // Collect all UUIDs from JSON
    for (const runtime in jsonDevices) {
      for (const device of jsonDevices[runtime]) {
        if (device.isAvailable) {
          jsonUUIDs.add(device.udid);
        }
      }
    }

    // Add devices from text that aren't in JSON (handles Apple's duplicate runtime ID bug)
    for (const textDevice of textDevices) {
      if (!jsonUUIDs.has(textDevice.udid)) {
        const runtime = textDevice.runtime ?? 'Unknown Runtime';
        if (!allDevices[runtime]) {
          allDevices[runtime] = [];
        }
        allDevices[runtime].push(textDevice);
        log(
          'info',
          `Added missing device from text parsing: ${textDevice.name} (${textDevice.udid})`,
        );
      }
    }

    // Format output
    let responseText = 'Available iOS Simulators:\n\n';

    for (const runtime in allDevices) {
      const devices = allDevices[runtime].filter((d) => d.isAvailable);

      if (devices.length === 0) continue;

      responseText += `${runtime}:\n`;

      for (const device of devices) {
        responseText += `- ${device.name} (${device.udid})${device.state === 'Booted' ? ' [Booted]' : ''}\n`;
      }

      responseText += '\n';
    }

    responseText +=
      "Hint: Save a default simulator with session-set-defaults { simulatorId: 'UUID_FROM_ABOVE' } (or simulatorName).";

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
      nextStepParams: {
        boot_sim: { simulatorId: 'UUID_FROM_ABOVE' },
        open_sim: {},
        build_sim: { scheme: 'YOUR_SCHEME', simulatorId: 'UUID_FROM_ABOVE' },
        get_sim_app_path: {
          scheme: 'YOUR_SCHEME',
          platform: 'iOS Simulator',
          simulatorId: 'UUID_FROM_ABOVE',
        },
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Error listing simulators: ${errorMessage}`);
    return {
      content: [
        {
          type: 'text',
          text: `Failed to list simulators: ${errorMessage}`,
        },
      ],
    };
  }
}

export const schema = listSimsSchema.shape;

export const handler = createTypedTool(listSimsSchema, list_simsLogic, getDefaultCommandExecutor);
