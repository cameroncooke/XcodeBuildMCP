/**
 * Tests for sim_statusbar plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using dependency injection for deterministic testing
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor, type CommandExecutor } from '../../../../test-utils/mock-executors.js';
import simStatusbar, { sim_statusbarLogic } from '../sim_statusbar.ts';

describe('sim_statusbar tool', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(simStatusbar.name).toBe('sim_statusbar');
    });

    it('should have correct description', () => {
      expect(simStatusbar.description).toBe(
        'Sets the data network indicator in the iOS simulator status bar. Use "clear" to reset all overrides, or specify a network type (hide, wifi, 3g, 4g, lte, lte-a, lte+, 5g, 5g+, 5g-uwb, 5g-uc).',
      );
    });

    it('should have handler function', () => {
      expect(typeof simStatusbar.handler).toBe('function');
    });

    it('should have correct schema with simulatorUuid string field and dataNetwork enum field', () => {
      const schema = z.object(simStatusbar.schema);

      // Valid inputs
      expect(
        schema.safeParse({ simulatorUuid: 'test-uuid-123', dataNetwork: 'wifi' }).success,
      ).toBe(true);
      expect(schema.safeParse({ simulatorUuid: 'ABC123-DEF456', dataNetwork: '3g' }).success).toBe(
        true,
      );
      expect(schema.safeParse({ simulatorUuid: 'test-uuid', dataNetwork: '4g' }).success).toBe(
        true,
      );
      expect(schema.safeParse({ simulatorUuid: 'test-uuid', dataNetwork: 'lte' }).success).toBe(
        true,
      );
      expect(schema.safeParse({ simulatorUuid: 'test-uuid', dataNetwork: 'lte-a' }).success).toBe(
        true,
      );
      expect(schema.safeParse({ simulatorUuid: 'test-uuid', dataNetwork: 'lte+' }).success).toBe(
        true,
      );
      expect(schema.safeParse({ simulatorUuid: 'test-uuid', dataNetwork: '5g' }).success).toBe(
        true,
      );
      expect(schema.safeParse({ simulatorUuid: 'test-uuid', dataNetwork: '5g+' }).success).toBe(
        true,
      );
      expect(schema.safeParse({ simulatorUuid: 'test-uuid', dataNetwork: '5g-uwb' }).success).toBe(
        true,
      );
      expect(schema.safeParse({ simulatorUuid: 'test-uuid', dataNetwork: '5g-uc' }).success).toBe(
        true,
      );
      expect(schema.safeParse({ simulatorUuid: 'test-uuid', dataNetwork: 'hide' }).success).toBe(
        true,
      );
      expect(schema.safeParse({ simulatorUuid: 'test-uuid', dataNetwork: 'clear' }).success).toBe(
        true,
      );

      // Invalid inputs
      expect(schema.safeParse({ simulatorUuid: 123, dataNetwork: 'wifi' }).success).toBe(false);
      expect(schema.safeParse({ simulatorUuid: 'test-uuid', dataNetwork: 'invalid' }).success).toBe(
        false,
      );
      expect(schema.safeParse({ simulatorUuid: 'test-uuid', dataNetwork: 123 }).success).toBe(
        false,
      );
      expect(schema.safeParse({ simulatorUuid: null, dataNetwork: 'wifi' }).success).toBe(false);
      expect(schema.safeParse({ simulatorUuid: 'test-uuid' }).success).toBe(false);
      expect(schema.safeParse({ dataNetwork: 'wifi' }).success).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle successful status bar data network setting', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Status bar set successfully',
      });

      const result = await sim_statusbarLogic(
        {
          simulatorUuid: 'test-uuid-123',
          dataNetwork: 'wifi',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Successfully set simulator test-uuid-123 status bar data network to wifi',
          },
        ],
      });
    });

    it('should handle minimal valid parameters (Zod handles validation)', async () => {
      // Note: With createTypedTool, Zod validation happens before the logic function is called
      // So we test with a valid minimal parameter set since validation is handled upstream
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Status bar set successfully',
      });

      const result = await sim_statusbarLogic(
        {
          simulatorUuid: 'test-uuid-123',
          dataNetwork: 'wifi',
        },
        mockExecutor,
      );

      // The logic function should execute normally with valid parameters
      // Zod validation errors are handled by createTypedTool wrapper
      expect(result.isError).toBe(undefined);
      expect(result.content[0].text).toContain('Successfully set simulator');
    });

    it('should handle command failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Simulator not found',
      });

      const result = await sim_statusbarLogic(
        {
          simulatorUuid: 'invalid-uuid',
          dataNetwork: '3g',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to set status bar: Simulator not found',
          },
        ],
        isError: true,
      });
    });

    it('should handle exception with Error object', async () => {
      const mockExecutor: CommandExecutor = async () => {
        throw new Error('Connection failed');
      };

      const result = await sim_statusbarLogic(
        {
          simulatorUuid: 'test-uuid-123',
          dataNetwork: '4g',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to set status bar: Connection failed',
          },
        ],
        isError: true,
      });
    });

    it('should handle exception with string error', async () => {
      const mockExecutor: CommandExecutor = async () => {
        throw 'String error';
      };

      const result = await sim_statusbarLogic(
        {
          simulatorUuid: 'test-uuid-123',
          dataNetwork: 'lte',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to set status bar: String error',
          },
        ],
        isError: true,
      });
    });

    it('should verify command generation with mock executor for override', async () => {
      const calls: Array<{
        command: string[];
        operationDescription: string;
        keepAlive: boolean;
        timeout: number | undefined;
      }> = [];

      const mockExecutor: CommandExecutor = async (
        command,
        operationDescription,
        keepAlive,
        timeout,
      ) => {
        calls.push({ command, operationDescription, keepAlive, timeout });
        return {
          success: true,
          output: 'Status bar set successfully',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await sim_statusbarLogic(
        {
          simulatorUuid: 'test-uuid-123',
          dataNetwork: 'wifi',
        },
        mockExecutor,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({
        command: [
          'xcrun',
          'simctl',
          'status_bar',
          'test-uuid-123',
          'override',
          '--dataNetwork',
          'wifi',
        ],
        operationDescription: 'Set Status Bar',
        keepAlive: true,
        timeout: undefined,
      });
    });

    it('should verify command generation for clear operation', async () => {
      const calls: Array<{
        command: string[];
        operationDescription: string;
        keepAlive: boolean;
        timeout: number | undefined;
      }> = [];

      const mockExecutor: CommandExecutor = async (
        command,
        operationDescription,
        keepAlive,
        timeout,
      ) => {
        calls.push({ command, operationDescription, keepAlive, timeout });
        return {
          success: true,
          output: 'Status bar cleared successfully',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await sim_statusbarLogic(
        {
          simulatorUuid: 'test-uuid-123',
          dataNetwork: 'clear',
        },
        mockExecutor,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual({
        command: ['xcrun', 'simctl', 'status_bar', 'test-uuid-123', 'clear'],
        operationDescription: 'Set Status Bar',
        keepAlive: true,
        timeout: undefined,
      });
    });

    it('should handle successful clear operation', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Status bar cleared successfully',
      });

      const result = await sim_statusbarLogic(
        {
          simulatorUuid: 'test-uuid-123',
          dataNetwork: 'clear',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Successfully cleared status bar overrides for simulator test-uuid-123',
          },
        ],
      });
    });
  });
});
