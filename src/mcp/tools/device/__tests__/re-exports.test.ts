/**
 * Tests for device-project re-export files
 * These files re-export tools from device-workspace to avoid duplication
 */
import { describe, it, expect } from 'vitest';

// Import all re-export tools
import launchAppDevice from '../launch_app_device.ts';
import stopAppDevice from '../stop_app_device.ts';
import listDevices from '../list_devices.ts';
import installAppDevice from '../install_app_device.ts';

describe('device-project re-exports', () => {
  describe('launch_app_device re-export', () => {
    it('should re-export launch_app_device tool correctly', () => {
      expect(launchAppDevice.name).toBe('launch_app_device');
      expect(typeof launchAppDevice.handler).toBe('function');
      expect(launchAppDevice.schema).toBeDefined();
      expect(typeof launchAppDevice.description).toBe('string');
    });
  });

  describe('stop_app_device re-export', () => {
    it('should re-export stop_app_device tool correctly', () => {
      expect(stopAppDevice.name).toBe('stop_app_device');
      expect(typeof stopAppDevice.handler).toBe('function');
      expect(stopAppDevice.schema).toBeDefined();
      expect(typeof stopAppDevice.description).toBe('string');
    });
  });

  describe('list_devices re-export', () => {
    it('should re-export list_devices tool correctly', () => {
      expect(listDevices.name).toBe('list_devices');
      expect(typeof listDevices.handler).toBe('function');
      expect(listDevices.schema).toBeDefined();
      expect(typeof listDevices.description).toBe('string');
    });
  });

  describe('install_app_device re-export', () => {
    it('should re-export install_app_device tool correctly', () => {
      expect(installAppDevice.name).toBe('install_app_device');
      expect(typeof installAppDevice.handler).toBe('function');
      expect(installAppDevice.schema).toBeDefined();
      expect(typeof installAppDevice.description).toBe('string');
    });
  });

  describe('All re-exports validation', () => {
    const reExports = [
      { tool: launchAppDevice, name: 'launch_app_device' },
      { tool: stopAppDevice, name: 'stop_app_device' },
      { tool: listDevices, name: 'list_devices' },
      { tool: installAppDevice, name: 'install_app_device' },
    ];

    it('should have all required tool properties', () => {
      reExports.forEach(({ tool, name }) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('schema');
        expect(tool).toHaveProperty('handler');
        expect(tool.name).toBe(name);
      });
    });

    it('should have callable handlers', () => {
      reExports.forEach(({ tool, name }) => {
        expect(typeof tool.handler).toBe('function');
        expect(tool.handler.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have valid schemas', () => {
      reExports.forEach(({ tool, name }) => {
        expect(tool.schema).toBeDefined();
        expect(typeof tool.schema).toBe('object');
      });
    });

    it('should have non-empty descriptions', () => {
      reExports.forEach(({ tool, name }) => {
        expect(typeof tool.description).toBe('string');
        expect(tool.description.length).toBeGreaterThan(0);
      });
    });
  });
});
