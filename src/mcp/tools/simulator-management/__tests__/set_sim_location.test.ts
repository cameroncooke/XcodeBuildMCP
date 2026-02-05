/**
 * Tests for set_sim_location tool
 * Following CLAUDE.md testing standards with literal validation
 * Using pure dependency injection for deterministic testing
 */

import { describe, it, expect } from 'vitest';
import * as z from 'zod';
import {
  createMockCommandResponse,
  createMockExecutor,
  createNoopExecutor,
} from '../../../../test-utils/mock-executors.ts';
import { schema, handler, set_sim_locationLogic } from '../set_sim_location.ts';

describe('set_sim_location tool', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have handler function', () => {
      expect(typeof handler).toBe('function');
    });

    it('should expose public schema without simulatorId field', () => {
      const schemaObj = z.object(schema);

      expect(schemaObj.safeParse({ latitude: 37.7749, longitude: -122.4194 }).success).toBe(true);
      expect(schemaObj.safeParse({ latitude: 0, longitude: 0 }).success).toBe(true);
      expect(schemaObj.safeParse({ latitude: 37.7749 }).success).toBe(false);
      expect(schemaObj.safeParse({ longitude: -122.4194 }).success).toBe(false);
      const withSimId = schemaObj.safeParse({
        simulatorId: 'test-uuid-123',
        latitude: 37.7749,
        longitude: -122.4194,
      });
      expect(withSimId.success).toBe(true);
      expect('simulatorId' in (withSimId.data as Record<string, unknown>)).toBe(false);
    });
  });

  describe('Command Generation', () => {
    it('should generate correct simctl command', async () => {
      let capturedCommand: string[] = [];

      const mockExecutor = async (command: string[]) => {
        capturedCommand = command;
        return createMockCommandResponse({
          success: true,
          output: 'Location set successfully',
          error: undefined,
        });
      };

      await set_sim_locationLogic(
        {
          simulatorId: 'test-uuid-123',
          latitude: 37.7749,
          longitude: -122.4194,
        },
        mockExecutor,
      );

      expect(capturedCommand).toEqual([
        'xcrun',
        'simctl',
        'location',
        'test-uuid-123',
        'set',
        '37.7749,-122.4194',
      ]);
    });

    it('should generate command with different coordinates', async () => {
      let capturedCommand: string[] = [];

      const mockExecutor = async (command: string[]) => {
        capturedCommand = command;
        return createMockCommandResponse({
          success: true,
          output: 'Location set successfully',
          error: undefined,
        });
      };

      await set_sim_locationLogic(
        {
          simulatorId: 'different-uuid',
          latitude: 45.5,
          longitude: -73.6,
        },
        mockExecutor,
      );

      expect(capturedCommand).toEqual([
        'xcrun',
        'simctl',
        'location',
        'different-uuid',
        'set',
        '45.5,-73.6',
      ]);
    });

    it('should generate command with negative coordinates', async () => {
      let capturedCommand: string[] = [];

      const mockExecutor = async (command: string[]) => {
        capturedCommand = command;
        return createMockCommandResponse({
          success: true,
          output: 'Location set successfully',
          error: undefined,
        });
      };

      await set_sim_locationLogic(
        {
          simulatorId: 'test-uuid',
          latitude: -90,
          longitude: -180,
        },
        mockExecutor,
      );

      expect(capturedCommand).toEqual([
        'xcrun',
        'simctl',
        'location',
        'test-uuid',
        'set',
        '-90,-180',
      ]);
    });
  });

  describe('Response Processing', () => {
    it('should handle successful location setting', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Location set successfully',
        error: undefined,
      });

      const result = await set_sim_locationLogic(
        {
          simulatorId: 'test-uuid-123',
          latitude: 37.7749,
          longitude: -122.4194,
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Successfully set simulator test-uuid-123 location to 37.7749,-122.4194',
          },
        ],
      });
    });

    it('should handle latitude validation failure', async () => {
      const result = await set_sim_locationLogic(
        {
          simulatorId: 'test-uuid-123',
          latitude: 95,
          longitude: -122.4194,
        },
        createNoopExecutor(),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Latitude must be between -90 and 90 degrees',
          },
        ],
      });
    });

    it('should handle longitude validation failure', async () => {
      const result = await set_sim_locationLogic(
        {
          simulatorId: 'test-uuid-123',
          latitude: 37.7749,
          longitude: -185,
        },
        createNoopExecutor(),
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Longitude must be between -180 and 180 degrees',
          },
        ],
      });
    });

    it('should handle command failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'Simulator not found',
      });

      const result = await set_sim_locationLogic(
        {
          simulatorId: 'invalid-uuid',
          latitude: 37.7749,
          longitude: -122.4194,
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to set simulator location: Simulator not found',
          },
        ],
      });
    });

    it('should handle exception with Error object', async () => {
      const mockExecutor = createMockExecutor(new Error('Connection failed'));

      const result = await set_sim_locationLogic(
        {
          simulatorId: 'test-uuid-123',
          latitude: 37.7749,
          longitude: -122.4194,
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to set simulator location: Connection failed',
          },
        ],
      });
    });

    it('should handle exception with string error', async () => {
      const mockExecutor = createMockExecutor('String error');

      const result = await set_sim_locationLogic(
        {
          simulatorId: 'test-uuid-123',
          latitude: 37.7749,
          longitude: -122.4194,
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to set simulator location: String error',
          },
        ],
      });
    });

    it('should handle boundary values for coordinates', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Location set successfully',
        error: undefined,
      });

      const result = await set_sim_locationLogic(
        {
          simulatorId: 'test-uuid-123',
          latitude: 90,
          longitude: 180,
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Successfully set simulator test-uuid-123 location to 90,180',
          },
        ],
      });
    });

    it('should handle boundary values for negative coordinates', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Location set successfully',
        error: undefined,
      });

      const result = await set_sim_locationLogic(
        {
          simulatorId: 'test-uuid-123',
          latitude: -90,
          longitude: -180,
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Successfully set simulator test-uuid-123 location to -90,-180',
          },
        ],
      });
    });

    it('should handle zero coordinates', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Location set successfully',
        error: undefined,
      });

      const result = await set_sim_locationLogic(
        {
          simulatorId: 'test-uuid-123',
          latitude: 0,
          longitude: 0,
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Successfully set simulator test-uuid-123 location to 0,0',
          },
        ],
      });
    });

    it('should verify correct executor arguments', async () => {
      let capturedArgs: any[] = [];

      const mockExecutor = async (...args: any[]) => {
        capturedArgs = args;
        return createMockCommandResponse({
          success: true,
          output: 'Location set successfully',
          error: undefined,
        });
      };

      await set_sim_locationLogic(
        {
          simulatorId: 'test-uuid-123',
          latitude: 37.7749,
          longitude: -122.4194,
        },
        mockExecutor,
      );

      expect(capturedArgs).toEqual([
        ['xcrun', 'simctl', 'location', 'test-uuid-123', 'set', '37.7749,-122.4194'],
        'Set Simulator Location',
        false,
        {},
      ]);
    });
  });
});
