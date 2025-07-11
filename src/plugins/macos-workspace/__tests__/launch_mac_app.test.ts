/**
 * Tests for launch_mac_app plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { z } from 'zod';
import launchMacApp from '../launch_mac_app.ts';

// Mock only child_process.exec at the lowest level
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

// Mock util.promisify
vi.mock('util', () => ({
  promisify: vi.fn(),
}));

describe('launch_mac_app plugin', () => {
  let mockExec: any;
  let mockPromisify: any;

  beforeEach(async () => {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');

    mockExec = vi.mocked(exec);
    mockPromisify = vi.mocked(promisify);

    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(launchMacApp.name).toBe('launch_mac_app');
    });

    it('should have correct description', () => {
      expect(launchMacApp.description).toBe(
        "Launches a macOS application. IMPORTANT: You MUST provide the appPath parameter. Example: launch_mac_app({ appPath: '/path/to/your/app.app' }) Note: In some environments, this tool may be prefixed as mcp0_launch_macos_app.",
      );
    });

    it('should have handler function', () => {
      expect(typeof launchMacApp.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(launchMacApp.schema.appPath.safeParse('/path/to/MyApp.app').success).toBe(true);

      // Test optional fields
      expect(launchMacApp.schema.args.safeParse(['--debug']).success).toBe(true);
      expect(launchMacApp.schema.args.safeParse(undefined).success).toBe(true);

      // Test invalid inputs
      expect(launchMacApp.schema.appPath.safeParse(null).success).toBe(false);
      expect(launchMacApp.schema.args.safeParse('not-array').success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact successful launch response', async () => {
      // Mock promisify(exec) to return successful launch
      const mockExecPromise = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
      mockPromisify.mockReturnValue(mockExecPromise);

      const result = await launchMacApp.handler({
        appPath: '/path/to/MyApp.app',
      });

      expect(mockPromisify).toHaveBeenCalledWith(mockExec);
      expect(mockExecPromise).toHaveBeenCalledWith('open "/path/to/MyApp.app"');

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS app launched successfully: /path/to/MyApp.app',
          },
        ],
      });
    });

    it('should return exact successful launch response with args', async () => {
      // Mock promisify(exec) to return successful launch
      const mockExecPromise = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
      mockPromisify.mockReturnValue(mockExecPromise);

      const result = await launchMacApp.handler({
        appPath: '/path/to/MyApp.app',
        args: ['--debug', '--verbose'],
      });

      expect(mockExecPromise).toHaveBeenCalledWith(
        'open "/path/to/MyApp.app" --args --debug --verbose',
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS app launched successfully: /path/to/MyApp.app',
          },
        ],
      });
    });

    it('should return exact launch failure response', async () => {
      // Mock promisify(exec) to return launch error
      const mockExecPromise = vi.fn().mockRejectedValue(new Error('App not found'));
      mockPromisify.mockReturnValue(mockExecPromise);

      const result = await launchMacApp.handler({
        appPath: '/path/to/MyApp.app',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error launching macOS app: App not found',
          },
        ],
        isError: true,
      });
    });

    it('should return exact missing appPath validation response', async () => {
      const result = await launchMacApp.handler({});

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'appPath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });
  });
});
