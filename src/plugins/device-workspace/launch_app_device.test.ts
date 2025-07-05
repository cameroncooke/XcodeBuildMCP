/**
 * Tests for launch_app_device plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import launchAppDevice from './launch_app_device.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  executeCommand: vi.fn(),
}));

vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    unlink: vi.fn(),
  },
}));

vi.mock('os', () => ({
  tmpdir: vi.fn().mockReturnValue('/tmp'),
}));

vi.mock('path', () => ({
  join: vi.fn().mockReturnValue('/tmp/launch-123.json'),
}));

describe('launch_app_device plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(launchAppDevice.name).toBe('launch_app_device');
    });

    it('should have correct description', () => {
      expect(launchAppDevice.description).toBe(
        'Launches an app on a physical Apple device (iPhone, iPad, Apple Watch, Apple TV, Apple Vision Pro). Requires deviceId and bundleId.',
      );
    });

    it('should have handler function', () => {
      expect(typeof launchAppDevice.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(launchAppDevice.schema.deviceId.safeParse('test-device-123').success).toBe(true);
      expect(launchAppDevice.schema.bundleId.safeParse('com.example.MyApp').success).toBe(true);

      // Test invalid inputs
      expect(launchAppDevice.schema.deviceId.safeParse(123).success).toBe(false);
      expect(launchAppDevice.schema.bundleId.safeParse(null).success).toBe(false);
    });
  });

  let mockExecuteCommand: MockedFunction<any>;
  let mockReadFile: MockedFunction<any>;
  let mockUnlink: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');
    const fs = await import('fs');

    mockExecuteCommand = utils.executeCommand as MockedFunction<any>;
    mockReadFile = fs.promises.readFile as MockedFunction<any>;
    mockUnlink = fs.promises.unlink as MockedFunction<any>;

    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact successful launch response with process ID', async () => {
      const launchJson = {
        result: {
          process: {
            processIdentifier: 12345,
          },
        },
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'App launched successfully',
        error: '',
      });
      mockReadFile.mockResolvedValue(JSON.stringify(launchJson));
      mockUnlink.mockResolvedValue(undefined);

      const result = await launchAppDevice.handler({
        deviceId: 'test-device-123',
        bundleId: 'com.example.MyApp',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App launched successfully\n\nApp launched successfully\n\nProcess ID: 12345\n\nNext Steps:\n1. Interact with your app on the device\n2. Stop the app: stop_app_device({ deviceId: "test-device-123", processId: 12345 })',
          },
        ],
      });
    });

    it('should return exact successful launch response without process ID', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'App launched successfully',
        error: '',
      });
      mockReadFile.mockRejectedValue(new Error('File read error'));
      mockUnlink.mockResolvedValue(undefined);

      const result = await launchAppDevice.handler({
        deviceId: 'test-device-123',
        bundleId: 'com.example.MyApp',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App launched successfully\n\nApp launched successfully',
          },
        ],
      });
    });

    it('should return exact launch failure response', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Failed to launch app: App not installed',
      });

      const result = await launchAppDevice.handler({
        deviceId: 'test-device-123',
        bundleId: 'com.example.MyApp',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to launch app: Failed to launch app: App not installed',
          },
        ],
        isError: true,
      });
    });

    it('should return exact exception handling response', async () => {
      mockExecuteCommand.mockRejectedValue(new Error('Unexpected error'));

      const result = await launchAppDevice.handler({
        deviceId: 'test-device-123',
        bundleId: 'com.example.MyApp',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to launch app on device: Unexpected error',
          },
        ],
        isError: true,
      });
    });
  });
});
