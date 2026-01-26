/**
 * Pure dependency injection test for stop_mac_app plugin
 *
 * Tests plugin structure and macOS app stopping functionality including parameter validation,
 * command generation, and response formatting.
 *
 * Uses manual call tracking instead of vitest mocking.
 * NO VITEST MOCKING ALLOWED - Only manual stubs
 */

import { describe, it, expect } from 'vitest';
import * as z from 'zod';

import stopMacApp, { stop_mac_appLogic } from '../stop_mac_app.ts';

describe('stop_mac_app plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(stopMacApp.name).toBe('stop_mac_app');
    });

    it('should have correct description', () => {
      expect(stopMacApp.description).toBe('Stop macOS app.');
    });

    it('should have handler function', () => {
      expect(typeof stopMacApp.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test optional fields
      expect(stopMacApp.schema.appName.safeParse('Calculator').success).toBe(true);
      expect(stopMacApp.schema.appName.safeParse(undefined).success).toBe(true);
      expect(stopMacApp.schema.processId.safeParse(1234).success).toBe(true);
      expect(stopMacApp.schema.processId.safeParse(undefined).success).toBe(true);

      // Test invalid inputs
      expect(stopMacApp.schema.appName.safeParse(null).success).toBe(false);
      expect(stopMacApp.schema.processId.safeParse('not-number').success).toBe(false);
      expect(stopMacApp.schema.processId.safeParse(null).success).toBe(false);
    });
  });

  describe('Input Validation', () => {
    it('should return exact validation error for missing parameters', async () => {
      const mockExecutor = async () => ({ success: true, output: '', process: {} as any });
      const result = await stop_mac_appLogic({}, mockExecutor);

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Either appName or processId must be provided.',
          },
        ],
        isError: true,
      });
    });
  });

  describe('Command Generation', () => {
    it('should generate correct command for process ID', async () => {
      const calls: any[] = [];
      const mockExecutor = async (command: string[]) => {
        calls.push({ command });
        return { success: true, output: '', process: {} as any };
      };

      await stop_mac_appLogic(
        {
          processId: 1234,
        },
        mockExecutor,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0].command).toEqual(['kill', '1234']);
    });

    it('should generate correct command for app name', async () => {
      const calls: any[] = [];
      const mockExecutor = async (command: string[]) => {
        calls.push({ command });
        return { success: true, output: '', process: {} as any };
      };

      await stop_mac_appLogic(
        {
          appName: 'Calculator',
        },
        mockExecutor,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0].command).toEqual([
        'sh',
        '-c',
        'pkill -f "Calculator" || osascript -e \'tell application "Calculator" to quit\'',
      ]);
    });

    it('should prioritize processId over appName', async () => {
      const calls: any[] = [];
      const mockExecutor = async (command: string[]) => {
        calls.push({ command });
        return { success: true, output: '', process: {} as any };
      };

      await stop_mac_appLogic(
        {
          appName: 'Calculator',
          processId: 1234,
        },
        mockExecutor,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0].command).toEqual(['kill', '1234']);
    });
  });

  describe('Response Processing', () => {
    it('should return exact successful stop response by app name', async () => {
      const mockExecutor = async () => ({ success: true, output: '', process: {} as any });

      const result = await stop_mac_appLogic(
        {
          appName: 'Calculator',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS app stopped successfully: Calculator',
          },
        ],
      });
    });

    it('should return exact successful stop response by process ID', async () => {
      const mockExecutor = async () => ({ success: true, output: '', process: {} as any });

      const result = await stop_mac_appLogic(
        {
          processId: 1234,
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS app stopped successfully: PID 1234',
          },
        ],
      });
    });

    it('should return exact successful stop response with both parameters (processId takes precedence)', async () => {
      const mockExecutor = async () => ({ success: true, output: '', process: {} as any });

      const result = await stop_mac_appLogic(
        {
          appName: 'Calculator',
          processId: 1234,
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS app stopped successfully: PID 1234',
          },
        ],
      });
    });

    it('should handle execution errors', async () => {
      const mockExecutor = async () => {
        throw new Error('Process not found');
      };

      const result = await stop_mac_appLogic(
        {
          processId: 9999,
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '❌ Stop macOS app operation failed: Process not found',
          },
        ],
        isError: true,
      });
    });
  });
});
