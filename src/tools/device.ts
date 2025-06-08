/**
 * Device Tools - Functions for working with physical Apple devices
 *
 * This module provides tools for discovering and interacting with physical Apple devices
 * through xcrun devicectl and xcrun xctrace commands.
 *
 * Responsibilities:
 * - Listing connected Apple devices (iPhone, iPad, Apple Watch, Apple TV, Vision Pro) with their UUIDs, names, and properties
 * - Supporting both modern devicectl and legacy xctrace commands for compatibility
 * - Providing device information for testing and deployment workflows
 */

import { z } from 'zod';
import { log } from '../utils/logger.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { executeCommand } from '../utils/command.js';
import { ToolResponse } from '../types/common.js';
import { registerTool } from './common.js';

/**
 * Lists available Apple devices with their UUIDs and properties
 */
export function registerListDevicesTool(server: McpServer): void {
  registerTool(
    server,
    'list_devices',
    'Lists connected physical Apple devices (iPhone, iPad, Apple Watch, Apple TV, Vision Pro) with their UUIDs, names, and connection status. Use this to discover physical devices for testing.',
    {},
    async (): Promise<ToolResponse> => {
      log('info', 'Starting Apple device discovery');

      try {
        // Try modern devicectl first (iOS 17+, Xcode 15+)
        let result = await executeCommand(['xcrun', 'devicectl', 'list', 'devices'], 'List Apple Devices (devicectl)');
        let useDevicectl = result.success;

        if (!result.success) {
          log('info', 'devicectl failed, trying xctrace fallback');
          // Fallback to xctrace for older Xcode versions
          result = await executeCommand(['xcrun', 'xctrace', 'list', 'devices'], 'List Apple Devices (xctrace)');
          useDevicectl = false;
        }

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to list Apple devices: ${result.error}\n\nMake sure Xcode is installed and devices are connected and trusted.`,
              },
            ],
            isError: true,
          };
        }

        // Parse the output based on which command was used
        let responseText = 'Connected Apple Devices:\n\n';
        const devices: Array<{
          name: string;
          identifier: string;
          platform: string;
          version?: string;
          state?: string;
        }> = [];

        if (useDevicectl) {
          // Parse devicectl output - it's a tabular format with columns:
          // Name, Hostname, Identifier, State, Model
          const lines = result.output.split('\n');
          let headerFound = false;

          for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Skip empty lines
            if (!trimmedLine) continue;
            
            // Skip header lines and separator lines
            if (trimmedLine.includes('Name') && trimmedLine.includes('Identifier')) {
              headerFound = true;
              continue;
            }
            if (trimmedLine.match(/^-+\s+-+\s+-+/)) {
              continue;
            }
            
            // Only process device lines after we've seen the header
            if (!headerFound) continue;
            
            // Parse tabular format - split by multiple spaces to separate columns
            const columns = trimmedLine.split(/\s{2,}/);
            if (columns.length >= 4) {
              const [name, hostname, identifier, state, ...modelParts] = columns;
              const model = modelParts.join(' ');
              
              // Only include devices that are connected or available
              if (state && (state.includes('connected') || state.includes('available'))) {
                // Filter out non-development devices (HomePods, etc.)
                if (!model.toLowerCase().includes('homepod') && 
                    !model.toLowerCase().includes('homeaccessory') &&
                    !model.toLowerCase().includes('vmac')) {
                  
                  // Determine platform based on model
                  let platform = 'Unknown';
                  if (model.toLowerCase().includes('iphone')) {
                    platform = 'iOS';
                  } else if (model.toLowerCase().includes('ipad')) {
                    platform = 'iPadOS';
                  } else if (model.toLowerCase().includes('watch')) {
                    platform = 'watchOS';
                  } else if (model.toLowerCase().includes('appletv') || model.toLowerCase().includes('apple tv')) {
                    platform = 'tvOS';
                  } else if (model.toLowerCase().includes('vision')) {
                    platform = 'visionOS';
                  } else {
                    platform = 'Apple Device';
                  }
                  
                  devices.push({
                    name: name.trim(),
                    identifier: identifier.trim(),
                    platform: platform,
                    state: state.trim(),
                    version: model.trim()
                  });
                }
              }
            }
          }
        } else {
          // Parse xctrace output
          const lines = result.output.split('\n');
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Skip headers and empty lines
            if (!trimmedLine || trimmedLine.includes('== Devices ==') || trimmedLine.includes('== Simulators ==')) {
              continue;
            }
            
            // Skip simulators (this tool is for physical devices only)
            if (trimmedLine.toLowerCase().includes('simulator') || trimmedLine.includes('iOS Simulator')) {
              continue;
            }
            
            // Parse device line format from xctrace
            // Typical format: "Device Name (iOS Version) [Device ID]" or variations
            const deviceMatch = trimmedLine.match(/^(.+?)\s*\(([^)]+)\)\s*(?:\[([A-F0-9-]+)\])?/);
            if (deviceMatch) {
              const [, name, versionInfo, identifier] = deviceMatch;
              
              // Skip if it's clearly a simulator (this tool is for physical devices only)
              if (name.toLowerCase().includes('simulator')) {
                continue;
              }
              
              // Determine platform based on version info and name
              let platform = 'Unknown';
              if (versionInfo.includes('iOS') || name.toLowerCase().includes('iphone')) {
                platform = 'iOS';
              } else if (name.toLowerCase().includes('ipad')) {
                platform = 'iPadOS';
              } else if (versionInfo.includes('watchOS') || name.toLowerCase().includes('watch')) {
                platform = 'watchOS';
              } else if (versionInfo.includes('tvOS') || name.toLowerCase().includes('appletv')) {
                platform = 'tvOS';
              } else if (versionInfo.includes('visionOS') || name.toLowerCase().includes('vision')) {
                platform = 'visionOS';
              } else {
                platform = 'Apple Device';
              }
              
              devices.push({
                name: name.trim(),
                identifier: identifier || 'Unknown',
                platform: platform,
                version: versionInfo,
                state: 'Connected'
              });
            }
          }
        }

        // Filter out duplicates and format response
        const uniqueDevices = devices.filter((device, index, self) => 
          index === self.findIndex(d => d.identifier === device.identifier)
        );

        if (uniqueDevices.length === 0) {
          responseText += 'No physical Apple devices found.\n\n';
          responseText += 'Make sure:\n';
          responseText += '1. Apple devices are connected via USB\n';
          responseText += '2. Devices are unlocked and trusted\n';
          responseText += '3. "Trust this computer" has been accepted on the device\n';
          responseText += '4. Xcode is properly installed\n\n';
          responseText += 'For simulators, use the list_sims tool instead.\n';
        } else {
          // Group devices by availability status
          const availableDevices = uniqueDevices.filter(d => 
            d.state && (d.state.toLowerCase().includes('available') || d.state.toLowerCase().includes('paired'))
          );
          const unavailableDevices = uniqueDevices.filter(d => 
            !d.state || (!d.state.toLowerCase().includes('available') && !d.state.toLowerCase().includes('paired'))
          );

          if (availableDevices.length > 0) {
            responseText += 'Available Devices:\n';
            for (const device of availableDevices) {
              responseText += `- ${device.name} (${device.identifier}) - ${device.platform}\n`;
            }
            responseText += '\n';
          }

          if (unavailableDevices.length > 0) {
            responseText += 'Unavailable Devices:\n';
            for (const device of unavailableDevices) {
              responseText += `- ${device.name} (${device.identifier}) - ${device.platform}\n`;
            }
            responseText += '\n';
          }
        }

        // Add next steps
        const availableDevicesExist = uniqueDevices.some(d => 
          d.state && (d.state.toLowerCase().includes('available') || d.state.toLowerCase().includes('paired'))
        );
        
        if (availableDevicesExist) {
          responseText += 'Next Steps:\n';
          responseText += "1. Run tests on available iOS device: test_ios_dev_ws({ workspacePath: 'PATH', scheme: 'SCHEME', deviceId: 'DEVICE_ID_FROM_AVAILABLE_DEVICES' })\n";
          responseText += "2. Build for iOS device: build_ios_dev_ws({ workspacePath: 'PATH', scheme: 'SCHEME' })\n";
          responseText += "3. Get iOS app path: get_ios_dev_app_path_ws({ workspacePath: 'PATH', scheme: 'SCHEME' })\n";
          responseText += "Note: Testing tools are currently available for iOS devices. Support for other platforms may be added in the future.\n";
        } else if (uniqueDevices.length > 0) {
          responseText += 'Note: No devices are currently available for testing. Make sure devices are unlocked, trusted, and properly connected.\n';
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
        log('error', `Error listing Apple devices: ${errorMessage}`);
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list Apple devices: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
