/**
 * Tests for stop_mac_app plugin (re-exported from macos-shared)
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import stopMacApp, { stop_mac_appLogic } from '../../macos-shared/stop_mac_app.js';

describe('stop_mac_app plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(stopMacApp.name).toBe('stop_mac_app');
    });

    it('should have correct description', () => {
      expect(stopMacApp.description).toBe(
        'Stops a running macOS application. Can stop by app name or process ID.',
      );
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
      const result = await stop_mac_appLogic({});

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
      const mockExecutor = async (command: string[], description?: string) => {
        calls.push({ command, description });
        return {
          success: true,
          output: '',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await stop_mac_appLogic(
        {
          processId: 1234,
        },
        mockExecutor,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0].command).toEqual(['kill', '1234']);
      expect(calls[0].description).toBe('Stop macOS App');
    });

    it('should generate correct command for app name', async () => {
      const calls: any[] = [];
      const mockExecutor = async (command: string[], description?: string) => {
        calls.push({ command, description });
        return {
          success: true,
          output: '',
          error: undefined,
          process: { pid: 12345 },
        };
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
      expect(calls[0].description).toBe('Stop macOS App');
    });

    it('should prioritize processId over appName', async () => {
      const calls: any[] = [];
      const mockExecutor = async (command: string[], description?: string) => {
        calls.push({ command, description });
        return {
          success: true,
          output: '',
          error: undefined,
          process: { pid: 12345 },
        };
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
      expect(calls[0].description).toBe('Stop macOS App');
    });
  });

  describe('Response Processing', () => {
    it('should return exact successful stop response by app name', async () => {
      const mockExecutor = async () => ({
        success: true,
        output: '',
        error: undefined,
        process: { pid: 12345 },
      });

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
      const mockExecutor = async () => ({
        success: true,
        output: '',
        error: undefined,
        process: { pid: 12345 },
      });

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
      const mockExecutor = async () => ({
        success: true,
        output: '',
        error: undefined,
        process: { pid: 12345 },
      });

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
