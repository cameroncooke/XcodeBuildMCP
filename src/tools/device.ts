/**
 * iOS Device Tools - Functions for working with physical iOS devices
 *
 * This module provides tools for discovering and interacting with physical iOS devices
 * through xcrun devicectl and xcrun xctrace commands.
 *
 * Responsibilities:
 * - Listing connected iOS devices with their UUIDs, names, and properties
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
 * Lists available iOS devices with their UUIDs and properties
 */
export function registerListIOSDevicesTool(server: McpServer): void {
  registerTool(
    server,
    'list_ios_devices',
    'Lists connected iOS devices with their UUIDs, names, and connection status. Use this to discover devices for testing.',
    {
      includeSimulators: z.boolean().optional().describe('Include simulators in the list (default: false)'),
    },
    async (params: { includeSimulators?: boolean }): Promise<ToolResponse> => {
      log('info', 'Starting iOS device discovery');

      try {
        // Try modern devicectl first (iOS 17+, Xcode 15+)
        let result = await executeCommand(['xcrun', 'devicectl', 'list', 'devices'], 'List iOS Devices (devicectl)');
        let useDevicectl = result.success;

        if (!result.success) {
          log('info', 'devicectl failed, trying xctrace fallback');
          // Fallback to xctrace for older Xcode versions
          result = await executeCommand(['xcrun', 'xctrace', 'list', 'devices'], 'List iOS Devices (xctrace)');
          useDevicectl = false;
        }

        if (!result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Failed to list iOS devices: ${result.error}\n\nMake sure Xcode is installed and devices are connected and trusted.`,
              },
            ],
            isError: true,
          };
        }

        // Parse the output based on which command was used
        let responseText = 'Connected iOS Devices:\n\n';
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
                // Filter out non-iOS devices (HomePods, etc.)
                if (!model.toLowerCase().includes('homepod') && 
                    !model.toLowerCase().includes('homeaccessory') &&
                    !model.toLowerCase().includes('vmac')) {
                  
                  devices.push({
                    name: name.trim(),
                    identifier: identifier.trim(),
                    platform: 'iOS',
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
            
            // Skip simulators unless requested
            if (!params.includeSimulators && (trimmedLine.toLowerCase().includes('simulator') || trimmedLine.includes('iOS Simulator'))) {
              continue;
            }
            
            // Parse device line format from xctrace
            // Typical format: "Device Name (iOS Version) [Device ID]" or variations
            const deviceMatch = trimmedLine.match(/^(.+?)\s*\(([^)]+)\)\s*(?:\[([A-F0-9-]+)\])?/);
            if (deviceMatch) {
              const [, name, versionInfo, identifier] = deviceMatch;
              
              // Skip if it's clearly a simulator and we don't want simulators
              if (!params.includeSimulators && name.toLowerCase().includes('simulator')) {
                continue;
              }
              
              devices.push({
                name: name.trim(),
                identifier: identifier || 'Unknown',
                platform: versionInfo.includes('iOS') ? 'iOS' : 'Unknown',
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
          responseText += 'No iOS devices found.\n\n';
          responseText += 'Make sure:\n';
          responseText += '1. iOS devices are connected via USB\n';
          responseText += '2. Devices are unlocked and trusted\n';
          responseText += '3. "Trust this computer" has been accepted on the device\n';
          responseText += '4. Xcode is properly installed\n';
        } else {
          // Group devices by platform
          const iosDevices = uniqueDevices.filter(d => d.platform === 'iOS' && !d.name.toLowerCase().includes('simulator'));
          
          if (iosDevices.length > 0) {
            responseText += 'Physical iOS Devices:\n';
            for (const device of iosDevices) {
              responseText += `- ${device.name}`;
              if (device.version) {
                responseText += ` (${device.version})`;
              }
              responseText += ` [${device.identifier}]`;
              if (device.state) {
                responseText += ` - ${device.state}`;
              }
              responseText += '\n';
            }
            responseText += '\n';
          }
          
          // Include simulators if requested
          if (params.includeSimulators) {
            const simulators = uniqueDevices.filter(d => d.name.toLowerCase().includes('simulator'));
            if (simulators.length > 0) {
              responseText += 'Simulators:\n';
              for (const device of simulators) {
                responseText += `- ${device.name} [${device.identifier}]\n`;
              }
              responseText += '\n';
            }
          }
        }

        // Add next steps
        if (uniqueDevices.filter(d => d.platform === 'iOS' && !d.name.toLowerCase().includes('simulator')).length > 0) {
          responseText += 'Next Steps:\n';
          responseText += "1. Run tests on device: test_ios_dev_ws({ workspacePath: 'PATH', scheme: 'SCHEME', deviceId: 'DEVICE_ID_FROM_ABOVE' })\n";
          responseText += "2. Build for device: build_ios_dev_ws({ workspacePath: 'PATH', scheme: 'SCHEME' })\n";
          responseText += "3. Get app path: get_ios_dev_app_path_ws({ workspacePath: 'PATH', scheme: 'SCHEME' })\n";
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
        log('error', `Error listing iOS devices: ${errorMessage}`);
        return {
          content: [
            {
              type: 'text',
              text: `Failed to list iOS devices: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}