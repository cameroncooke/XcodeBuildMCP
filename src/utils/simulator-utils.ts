/**
 * Simulator utility functions for name to UUID resolution
 */

import type { CommandExecutor } from './execution/index.ts';
import type { ToolResponse } from '../types/common.ts';
import { log } from './logging/index.ts';
import { createErrorResponse } from './responses/index.ts';

/**
 * UUID regex pattern to check if a string looks like a UUID
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Determines the simulator UUID from either a UUID or name.
 *
 * Behavior:
 * - If simulatorUuid provided: return it directly
 * - Else if simulatorName looks like a UUID (regex): treat it as UUID and return it
 * - Else: resolve name → UUID via simctl and return the match (isAvailable === true)
 *
 * @param params Object containing optional simulatorUuid or simulatorName
 * @param executor Command executor for running simctl commands
 * @returns Object with uuid, optional warning, or error
 */
export async function determineSimulatorUuid(
  params: { simulatorUuid?: string; simulatorId?: string; simulatorName?: string },
  executor: CommandExecutor,
): Promise<{ uuid?: string; warning?: string; error?: ToolResponse }> {
  const directUuid = params.simulatorUuid ?? params.simulatorId;

  // If UUID is provided directly, use it
  if (directUuid) {
    log('info', `Using provided simulator UUID: ${directUuid}`);
    return { uuid: directUuid };
  }

  // If name is provided, check if it's actually a UUID
  if (params.simulatorName) {
    // Check if the "name" is actually a UUID string
    if (UUID_REGEX.test(params.simulatorName)) {
      log(
        'info',
        `Simulator name '${params.simulatorName}' appears to be a UUID, using it directly`,
      );
      return {
        uuid: params.simulatorName,
        warning: `The simulatorName '${params.simulatorName}' appears to be a UUID. Consider using simulatorUuid parameter instead.`,
      };
    }

    // Resolve name to UUID via simctl
    log('info', `Looking up simulator UUID for name: ${params.simulatorName}`);

    const listResult = await executor(
      ['xcrun', 'simctl', 'list', 'devices', 'available', '-j'],
      'List available simulators',
    );

    if (!listResult.success) {
      return {
        error: createErrorResponse(
          'Failed to list simulators',
          listResult.error ?? 'Unknown error',
        ),
      };
    }

    try {
      interface SimulatorDevice {
        udid: string;
        name: string;
        isAvailable: boolean;
      }

      interface DevicesData {
        devices: Record<string, SimulatorDevice[]>;
      }

      const devicesData = JSON.parse(listResult.output ?? '{}') as DevicesData;

      // Search through all runtime sections for the named device
      for (const runtime of Object.keys(devicesData.devices)) {
        const devices = devicesData.devices[runtime];
        if (!Array.isArray(devices)) continue;

        // Look for exact name match with isAvailable === true
        const device = devices.find(
          (d) => d.name === params.simulatorName && d.isAvailable === true,
        );

        if (device) {
          log('info', `Found simulator '${params.simulatorName}' with UUID: ${device.udid}`);
          return { uuid: device.udid };
        }
      }

      // If no available device found, check if device exists but is unavailable
      for (const runtime of Object.keys(devicesData.devices)) {
        const devices = devicesData.devices[runtime];
        if (!Array.isArray(devices)) continue;

        const unavailableDevice = devices.find(
          (d) => d.name === params.simulatorName && d.isAvailable === false,
        );

        if (unavailableDevice) {
          return {
            error: createErrorResponse(
              `Simulator '${params.simulatorName}' exists but is not available`,
              'The simulator may need to be downloaded or is incompatible with the current Xcode version',
            ),
          };
        }
      }

      // Device not found at all
      return {
        error: createErrorResponse(
          `Simulator '${params.simulatorName}' not found`,
          'Please check the simulator name or use "xcrun simctl list devices" to see available simulators',
        ),
      };
    } catch (parseError) {
      return {
        error: createErrorResponse(
          'Failed to parse simulator list',
          parseError instanceof Error ? parseError.message : String(parseError),
        ),
      };
    }
  }

  // Neither UUID nor name provided
  return {
    error: createErrorResponse(
      'No simulator identifier provided',
      'Either simulatorUuid or simulatorName is required',
    ),
  };
}
