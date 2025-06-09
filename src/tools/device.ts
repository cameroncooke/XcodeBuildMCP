/**
 * Device Tools - Functions for working with physical Apple devices
 *
 * This module provides tools for discovering and interacting with physical Apple devices
 * through xcrun devicectl and xcrun xctrace commands.
 *
 * Responsibilities:
 * - Listing connected Apple devices (iOS, iPadOS, watchOS, tvOS, visionOS) with their UUIDs, names, and properties
 * - Supporting both modern devicectl and legacy xctrace commands for compatibility
 * - Providing device information for testing and deployment workflows
 */

import { z } from 'zod';
import { log } from '../utils/logger.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { executeCommand } from '../utils/command.js';
import { ToolResponse } from '../types/common.js';
import { registerTool } from './common.js';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

interface Device {
  name: string;
  identifier: string;
  platform: string;
  version?: string;
  state?: string;
  model?: string;
  osVersion?: string;
  connectionType?: string;
  trustState?: string;
  developerModeStatus?: string;
  productType?: string;
  cpuArchitecture?: string;
}

interface DeviceCtlDevice {
  identifier: string;
  capabilities?: Array<{ featureIdentifier: string }>;
  connectionProperties?: {
    localHostname?: string;
    pairingState?: string;
    transportType?: string;
    tunnelState?: string;
  };
  deviceProperties?: {
    marketingName?: string;
    name?: string;
    osVersionNumber?: string;
    platformIdentifier?: string;
  };
  hardwareProperties?: {
    cpuArchitecture?: string;
    platform?: string;
    productType?: string;
  };
  visibilityClass?: string;
}

interface DeviceCtlResult {
  info?: {
    arguments?: string[];
  };
  result?: {
    devices?: DeviceCtlDevice[];
    outcome?: string;
  };
}

/**
 * Lists available Apple devices with their UUIDs and properties
 */
export function registerListDevicesTool(server: McpServer): void {
  registerTool(
    server,
    'list_devices',
    'Lists connected physical Apple devices (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro) with their UUIDs, names, and connection status. Use this to discover physical devices for testing.',
    {},
    async (): Promise<ToolResponse> => {
      log('info', 'Starting device discovery');

      try {
        // Try modern devicectl with JSON output first (iOS 17+, Xcode 15+)
        const tempJsonPath = join(tmpdir(), `devicectl-${Date.now()}.json`);
        const devices: Device[] = [];
        let useDevicectl = false;

        try {
          const result = await executeCommand(
            ['xcrun', 'devicectl', 'list', 'devices', '--json-output', tempJsonPath],
            'List Devices (devicectl with JSON)',
          );

          if (result.success) {
            useDevicectl = true;
            // Read and parse the JSON file
            const jsonContent = await fs.readFile(tempJsonPath, 'utf8');
            const deviceCtlData: DeviceCtlResult = JSON.parse(jsonContent);

            if (deviceCtlData.result?.devices) {
              for (const device of deviceCtlData.result.devices) {
                // Skip simulators or unavailable devices
                if (
                  device.visibilityClass === 'Simulator' ||
                  !device.connectionProperties?.pairingState
                ) {
                  continue;
                }

                // Determine platform from platformIdentifier
                let platform = 'Unknown';
                const platformId = device.deviceProperties?.platformIdentifier?.toLowerCase() || '';
                if (platformId.includes('ios') || platformId.includes('iphone')) {
                  platform = 'iOS';
                } else if (platformId.includes('ipad')) {
                  platform = 'iPadOS';
                } else if (platformId.includes('watch')) {
                  platform = 'watchOS';
                } else if (platformId.includes('tv') || platformId.includes('apple tv')) {
                  platform = 'tvOS';
                } else if (platformId.includes('vision')) {
                  platform = 'visionOS';
                }

                // Determine connection state
                const pairingState = device.connectionProperties?.pairingState || '';
                const tunnelState = device.connectionProperties?.tunnelState || '';
                const transportType = device.connectionProperties?.transportType || '';

                let state = 'Unknown';
                if (pairingState === 'paired' && tunnelState === 'connected') {
                  state = 'Available';
                } else if (pairingState === 'paired') {
                  state = 'Paired (not connected)';
                } else {
                  state = 'Unpaired';
                }

                devices.push({
                  name: device.deviceProperties?.name || 'Unknown Device',
                  identifier: device.hardwareProperties?.udid || device.identifier,
                  platform: platform,
                  model:
                    device.deviceProperties?.marketingName ||
                    device.hardwareProperties?.productType,
                  osVersion: device.deviceProperties?.osVersionNumber,
                  state: state,
                  connectionType: transportType,
                  trustState: pairingState,
                  developerModeStatus: device.deviceProperties?.developerModeStatus,
                  productType: device.hardwareProperties?.productType,
                  cpuArchitecture: device.hardwareProperties?.cpuType?.name,
                });
              }
            }
          }
        } catch (error) {
          log('info', 'devicectl with JSON failed, trying xctrace fallback', error);
        } finally {
          // Clean up temp file
          try {
            await fs.unlink(tempJsonPath);
          } catch {
            // Ignore cleanup errors
          }
        }

        // If devicectl failed or returned no devices, fallback to xctrace
        if (!useDevicectl || devices.length === 0) {
          const result = await executeCommand(
            ['xcrun', 'xctrace', 'list', 'devices'],
            'List Devices (xctrace)',
          );

          if (!result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Failed to list devices: ${result.error}\n\nMake sure Xcode is installed and devices are connected and trusted.`,
                },
              ],
              isError: true,
            };
          }

          // Return raw xctrace output without parsing
          return {
            content: [
              {
                type: 'text',
                text: `Device listing (xctrace output):\n\n${result.output}\n\nNote: For better device information, please upgrade to Xcode 15 or later which supports the modern devicectl command.`,
              },
            ],
          };
        }

        // Format the response
        let responseText = 'Connected Devices:\n\n';

        // Filter out duplicates
        const uniqueDevices = devices.filter(
          (device, index, self) =>
            index === self.findIndex((d) => d.identifier === device.identifier),
        );

        if (uniqueDevices.length === 0) {
          responseText += 'No physical Apple devices found.\n\n';
          responseText += 'Make sure:\n';
          responseText += '1. Devices are connected via USB or WiFi\n';
          responseText += '2. Devices are unlocked and trusted\n';
          responseText += '3. "Trust this computer" has been accepted on the device\n';
          responseText += '4. Developer mode is enabled on the device (iOS 16+)\n';
          responseText += '5. Xcode is properly installed\n\n';
          responseText += 'For simulators, use the list_sims tool instead.\n';
        } else {
          // Group devices by availability status
          const availableDevices = uniqueDevices.filter(
            (d) => d.state === 'Available' || d.state === 'Connected',
          );
          const pairedDevices = uniqueDevices.filter((d) => d.state === 'Paired (not connected)');
          const unpairedDevices = uniqueDevices.filter((d) => d.state === 'Unpaired');

          if (availableDevices.length > 0) {
            responseText += '✅ Available Devices:\n';
            for (const device of availableDevices) {
              responseText += `\n📱 ${device.name}\n`;
              responseText += `   UDID: ${device.identifier}\n`;
              responseText += `   Model: ${device.model || 'Unknown'}\n`;
              if (device.productType) {
                responseText += `   Product Type: ${device.productType}\n`;
              }
              responseText += `   Platform: ${device.platform} ${device.osVersion || ''}\n`;
              if (device.cpuArchitecture) {
                responseText += `   CPU Architecture: ${device.cpuArchitecture}\n`;
              }
              responseText += `   Connection: ${device.connectionType || 'Unknown'}\n`;
              if (device.developerModeStatus) {
                responseText += `   Developer Mode: ${device.developerModeStatus}\n`;
              }
            }
            responseText += '\n';
          }

          if (pairedDevices.length > 0) {
            responseText += '🔗 Paired but Not Connected:\n';
            for (const device of pairedDevices) {
              responseText += `\n📱 ${device.name}\n`;
              responseText += `   UDID: ${device.identifier}\n`;
              responseText += `   Model: ${device.model || 'Unknown'}\n`;
              responseText += `   Platform: ${device.platform} ${device.osVersion || ''}\n`;
            }
            responseText += '\n';
          }

          if (unpairedDevices.length > 0) {
            responseText += '❌ Unpaired Devices:\n';
            for (const device of unpairedDevices) {
              responseText += `- ${device.name} (${device.identifier})\n`;
            }
            responseText += '\n';
          }
        }

        // Add next steps
        const availableDevicesExist = uniqueDevices.some(
          (d) => d.state === 'Available' || d.state === 'Connected',
        );

        if (availableDevicesExist) {
          responseText += 'Next Steps:\n';
          responseText +=
            "1. Build for device: build_ios_dev_ws({ workspacePath: 'PATH', scheme: 'SCHEME' })\n";
          responseText +=
            "2. Run tests: test_ios_dev_ws({ workspacePath: 'PATH', scheme: 'SCHEME' })\n";
          responseText +=
            "3. Get app path: get_ios_dev_app_path_ws({ workspacePath: 'PATH', scheme: 'SCHEME' })\n\n";
          responseText += 'Note: Use the device ID/UDID from above when required by other tools.\n';
        } else if (uniqueDevices.length > 0) {
          responseText +=
            'Note: No devices are currently available for testing. Make sure devices are:\n';
          responseText += '- Connected via USB\n';
          responseText += '- Unlocked and trusted\n';
          responseText += '- Have developer mode enabled (iOS 16+)\n';
        }

        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log('error', `Error listing devices: ${errorMessage}`);
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list devices: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

/**
 * Installs an app on a physical Apple device
 */
// Device-specific schemas
const deviceIdSchema = z.string().describe('UDID of the device (obtained from list_devices)');
const appPathSchema = z
  .string()
  .describe('Path to the .app bundle to install (full path to the .app directory)');

export function registerInstallAppDeviceTool(server: McpServer): void {
  registerTool(
    server,
    'install_app_device',
    'Installs an app on a physical Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). Requires deviceId and appPath.',
    {
      deviceId: deviceIdSchema,
      appPath: appPathSchema,
    },
    async (args): Promise<ToolResponse> => {
      const { deviceId, appPath } = args;

      log('info', `Installing app on device ${deviceId}`);

      try {
        const result = await executeCommand(
          ['xcrun', 'devicectl', 'device', 'install', 'app', '--device', deviceId, appPath],
          'Install app on device',
        );

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to install app: ${result.error}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `✅ App installed successfully on device ${deviceId}\n\n${result.output}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log('error', `Error installing app on device: ${errorMessage}`);
        return {
          content: [
            {
              type: 'text',
              text: `Failed to install app on device: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

/**
 * Launches an app on a physical Apple device
 */
const bundleIdSchema = z
  .string()
  .describe('Bundle identifier of the app to launch (e.g., "com.example.MyApp")');

export function registerLaunchAppDeviceTool(server: McpServer): void {
  registerTool(
    server,
    'launch_app_device',
    'Launches an app on a physical Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). Requires deviceId and bundleId.',
    {
      deviceId: deviceIdSchema,
      bundleId: bundleIdSchema,
    },
    async (args): Promise<ToolResponse> => {
      const { deviceId, bundleId } = args;

      log('info', `Launching app ${bundleId} on device ${deviceId}`);

      try {
        const result = await executeCommand(
          ['xcrun', 'devicectl', 'device', 'process', 'launch', '--device', deviceId, bundleId],
          'Launch app on device',
        );

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to launch app: ${result.error}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `✅ App launched successfully\n\n${result.output}`,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log('error', `Error launching app on device: ${errorMessage}`);
        return {
          content: [
            {
              type: 'text',
              text: `Failed to launch app on device: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
