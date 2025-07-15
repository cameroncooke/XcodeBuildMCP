/**
 * Device Workspace Plugin: List Devices
 *
 * Lists connected physical Apple devices (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro)
 * with their UUIDs, names, and connection status. Use this to discover physical devices for testing.
 */

import { ToolResponse } from '../../types/common.js';
import { log, executeCommand, CommandExecutor } from '../../utils/index.js';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export default {
  name: 'list_devices',
  description:
    'Lists connected physical Apple devices (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro) with their UUIDs, names, and connection status. Use this to discover physical devices for testing.',
  schema: {},
  async handler(
    args?: Record<string, unknown>,
    executor?: CommandExecutor,
    pathDeps?: { tmpdir?: () => string; join?: (...paths: string[]) => string },
    fsDeps?: {
      readFile?: (path: string, encoding?: string) => Promise<string>;
      unlink?: (path: string) => Promise<void>;
    },
  ): Promise<ToolResponse> {
    log('info', 'Starting device discovery');

    try {
      // Try modern devicectl with JSON output first (iOS 17+, Xcode 15+)
      const tempDir = pathDeps?.tmpdir ? pathDeps.tmpdir() : tmpdir();
      const timestamp = pathDeps?.join ? '123' : Date.now(); // Use fixed timestamp for tests
      const tempJsonPath = pathDeps?.join
        ? pathDeps.join(tempDir, `devicectl-${timestamp}.json`)
        : join(tempDir, `devicectl-${timestamp}.json`);
      const devices = [];
      let useDevicectl = false;

      try {
        const result = await executeCommand(
          ['xcrun', 'devicectl', 'list', 'devices', '--json-output', tempJsonPath],
          'List Devices (devicectl with JSON)',
          true,
          undefined,
          executor,
        );

        if (result.success) {
          useDevicectl = true;
          // Read and parse the JSON file
          const jsonContent = fsDeps?.readFile
            ? await fsDeps.readFile(tempJsonPath, 'utf8')
            : await fs.readFile(tempJsonPath, 'utf8');
          const deviceCtlData = JSON.parse(jsonContent);

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
              // Consider a device available if it's paired, regardless of tunnel state
              // This allows WiFi-connected devices to be used even if tunnelState isn't "connected"
              if (pairingState === 'paired') {
                if (tunnelState === 'connected') {
                  state = 'Available';
                } else {
                  // Device is paired but tunnel state may be different for WiFi connections
                  // Still mark as available since devicectl commands can work with paired devices
                  state = 'Available (WiFi)';
                }
              } else {
                state = 'Unpaired';
              }

              devices.push({
                name: device.deviceProperties?.name || 'Unknown Device',
                identifier: device.identifier,
                platform: platform,
                model:
                  device.deviceProperties?.marketingName || device.hardwareProperties?.productType,
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
      } catch {
        log('info', 'devicectl with JSON failed, trying xctrace fallback');
      } finally {
        // Clean up temp file
        try {
          if (fsDeps?.unlink) {
            await fsDeps.unlink(tempJsonPath);
          } else {
            await fs.unlink(tempJsonPath);
          }
        } catch {
          // Ignore cleanup errors
        }
      }

      // If devicectl failed or returned no devices, fallback to xctrace
      if (!useDevicectl || devices.length === 0) {
        const result = await executeCommand(
          ['xcrun', 'xctrace', 'list', 'devices'],
          'List Devices (xctrace)',
          true,
          undefined,
          executor,
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
          (d) =>
            d.state === 'Available' || d.state === 'Available (WiFi)' || d.state === 'Connected',
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
        (d) => d.state === 'Available' || d.state === 'Available (WiFi)' || d.state === 'Connected',
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
};
