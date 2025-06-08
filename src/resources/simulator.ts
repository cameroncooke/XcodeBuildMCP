/**
 * Simulator Resources - iOS Simulator Context and Information
 *
 * This module provides resources for accessing iOS Simulator information,
 * including available devices, runtime versions, and device states.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { execSync } from 'child_process';
import { log } from '../utils/logger.js';

/**
 * Get available simulator devices
 */
function getSimulatorDevices(): any {
  try {
    const output = execSync('xcrun simctl list devices --json', {
      encoding: 'utf8',
      timeout: 10000
    });
    
    return JSON.parse(output);
  } catch (error) {
    log('warn', `Failed to get simulator devices: ${error}`);
    return { devices: {}, error: `${error}` };
  }
}

/**
 * Get available simulator runtimes
 */
function getSimulatorRuntimes(): any {
  try {
    const output = execSync('xcrun simctl list runtimes --json', {
      encoding: 'utf8',
      timeout: 10000
    });
    
    return JSON.parse(output);
  } catch (error) {
    log('warn', `Failed to get simulator runtimes: ${error}`);
    return { runtimes: [], error: `${error}` };
  }
}

/**
 * Get simulator device types
 */
function getSimulatorDeviceTypes(): any {
  try {
    const output = execSync('xcrun simctl list devicetypes --json', {
      encoding: 'utf8',
      timeout: 10000
    });
    
    return JSON.parse(output);
  } catch (error) {
    log('warn', `Failed to get simulator device types: ${error}`);
    return { devicetypes: [], error: `${error}` };
  }
}

/**
 * Register simulator-related resources
 */
export function registerSimulatorResources(server: McpServer): void {
  // Simulator devices resource
  server.resource(
    'simulator-devices',
    'xcode://simulator/devices',
    'Available iOS Simulator devices and their states',
    async (uri) => {
      const devicesData = getSimulatorDevices();
      
      // Transform the data to be more useful
      const transformedDevices: any = {};
      const summary = {
        totalDevices: 0,
        bootedDevices: 0,
        availableRuntimes: []
      };
      
      if (devicesData.devices) {
        for (const [runtime, devices] of Object.entries(devicesData.devices)) {
          if (Array.isArray(devices)) {
            transformedDevices[runtime] = devices.map((device: any) => ({
              udid: device.udid,
              name: device.name,
              state: device.state,
              isAvailable: device.isAvailable,
              deviceTypeIdentifier: device.deviceTypeIdentifier
            }));
            
            summary.totalDevices += devices.length;
            summary.bootedDevices += devices.filter((d: any) => d.state === 'Booted').length;
            summary.availableRuntimes.push(runtime);
          }
        }
      }
      
      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({
            summary,
            devices: transformedDevices,
            timestamp: new Date().toISOString(),
            error: devicesData.error
          }, null, 2)
        }]
      };
    }
  );

  // Simulator runtimes resource
  server.resource(
    'simulator-runtimes',
    'xcode://simulator/runtimes',
    'Available iOS Simulator runtimes and versions',
    async (uri) => {
      const runtimesData = getSimulatorRuntimes();
      
      const transformedRuntimes = runtimesData.runtimes?.map((runtime: any) => ({
        identifier: runtime.identifier,
        name: runtime.name,
        version: runtime.version,
        buildversion: runtime.buildversion,
        isAvailable: runtime.isAvailable,
        supportedDeviceTypes: runtime.supportedDeviceTypes?.length || 0
      })) || [];
      
      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({
            runtimes: transformedRuntimes,
            totalRuntimes: transformedRuntimes.length,
            availableRuntimes: transformedRuntimes.filter((r: any) => r.isAvailable).length,
            timestamp: new Date().toISOString(),
            error: runtimesData.error
          }, null, 2)
        }]
      };
    }
  );

  // Simulator device types resource
  server.resource(
    'simulator-device-types',
    'xcode://simulator/device-types',
    'Available iOS Simulator device types',
    async (uri) => {
      const deviceTypesData = getSimulatorDeviceTypes();
      
      const transformedDeviceTypes = deviceTypesData.devicetypes?.map((deviceType: any) => ({
        identifier: deviceType.identifier,
        name: deviceType.name,
        productFamily: deviceType.productFamily,
        modelIdentifier: deviceType.modelIdentifier
      })) || [];
      
      // Group by product family for easier navigation
      const groupedByFamily: any = {};
      transformedDeviceTypes.forEach((deviceType: any) => {
        const family = deviceType.productFamily || 'Unknown';
        if (!groupedByFamily[family]) {
          groupedByFamily[family] = [];
        }
        groupedByFamily[family].push(deviceType);
      });
      
      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({
            deviceTypes: transformedDeviceTypes,
            groupedByFamily,
            totalDeviceTypes: transformedDeviceTypes.length,
            families: Object.keys(groupedByFamily),
            timestamp: new Date().toISOString(),
            error: deviceTypesData.error
          }, null, 2)
        }]
      };
    }
  );

  // Booted simulators resource (quick access to currently running simulators)
  server.resource(
    'simulator-booted',
    'xcode://simulator/booted',
    'Currently booted iOS Simulator devices',
    async (uri) => {
      const devicesData = getSimulatorDevices();
      const bootedDevices: any[] = [];
      
      if (devicesData.devices) {
        for (const [runtime, devices] of Object.entries(devicesData.devices)) {
          if (Array.isArray(devices)) {
            const booted = devices.filter((device: any) => device.state === 'Booted');
            booted.forEach((device: any) => {
              bootedDevices.push({
                udid: device.udid,
                name: device.name,
                runtime,
                deviceTypeIdentifier: device.deviceTypeIdentifier
              });
            });
          }
        }
      }
      
      return {
        contents: [{
          uri: uri.toString(),
          mimeType: 'application/json',
          text: JSON.stringify({
            bootedDevices,
            count: bootedDevices.length,
            timestamp: new Date().toISOString(),
            error: devicesData.error
          }, null, 2)
        }]
      };
    }
  );

  log('info', 'Registered simulator resources: simulator-devices, simulator-runtimes, simulator-device-types, simulator-booted');
}

