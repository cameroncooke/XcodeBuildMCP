/**
 * Tests for set_sim_location plugin
 * Following CLAUDE.md testing standards with literal validation
 * Using pure dependency injection for deterministic testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor, createNoopExecutor } from '../../../../test-utils/mock-executors.js';
import setSimLocation, { set_sim_locationLogic } from '../set_sim_location.ts';

describe('set_sim_location tool', () => {
  // No mocks to clear since we use pure dependency injection

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(setSimLocation.name).toBe('set_sim_location');
    });

    it('should have correct description', () => {
      expect(setSimLocation.description).toBe('Sets a custom GPS location for the simulator.');
    });

    it('should have handler function', () => {
      expect(typeof setSimLocation.handler).toBe('function');
    });

    it('should have correct schema with simulatorUuid string field and latitude/longitude number fields', () => {
      const schema = z.object(setSimLocation.schema);

      // Valid inputs
      expect(
        schema.safeParse({
          simulatorUuid: 'test-uuid-123',
          latitude: 37.7749,
          longitude: -122.4194,
        }).success,
      ).toBe(true);
      expect(
        schema.safeParse({ simulatorUuid: 'ABC123-DEF456', latitude: 0, longitude: 0 }).success,
      ).toBe(true);
      expect(
        schema.safeParse({ simulatorUuid: 'test-uuid', latitude: 90, longitude: 180 }).success,
      ).toBe(true);
      expect(
        schema.safeParse({ simulatorUuid: 'test-uuid', latitude: -90, longitude: -180 }).success,
      ).toBe(true);
      expect(
        schema.safeParse({ simulatorUuid: 'test-uuid', latitude: 45.5, longitude: -73.6 }).success,
      ).toBe(true);

      // Invalid inputs
      expect(
        schema.safeParse({ simulatorUuid: 123, latitude: 37.7749, longitude: -122.4194 }).success,
      ).toBe(false);
      expect(
        schema.safeParse({ simulatorUuid: 'test-uuid', latitude: 'invalid', longitude: -122.4194 })
          .success,
      ).toBe(false);
      expect(
        schema.safeParse({ simulatorUuid: 'test-uuid', latitude: 37.7749, longitude: 'invalid' })
          .success,
      ).toBe(false);
      expect(
        schema.safeParse({ simulatorUuid: null, latitude: 37.7749, longitude: -122.4194 }).success,
      ).toBe(false);
      expect(schema.safeParse({ simulatorUuid: 'test-uuid', longitude: -122.4194 }).success).toBe(
        false,
      );
      expect(schema.safeParse({ simulatorUuid: 'test-uuid', latitude: 37.7749 }).success).toBe(
        false,
      );
      expect(schema.safeParse({ latitude: 37.7749, longitude: -122.4194 }).success).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  describe('Command Generation', () => {
    it('should generate correct simctl command', async () => {
      let capturedCommand: string[] = [];

      const mockExecutor = async (command: string[]) => {
        capturedCommand = command;
        return {
          success: true,
          output: 'Location set successfully',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await set_sim_locationLogic(
        {
          simulatorUuid: 'test-uuid-123',
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
        return {
          success: true,
          output: 'Location set successfully',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await set_sim_locationLogic(
        {
          simulatorUuid: 'different-uuid',
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
        return {
          success: true,
          output: 'Location set successfully',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await set_sim_locationLogic(
        {
          simulatorUuid: 'test-uuid',
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
          simulatorUuid: 'test-uuid-123',
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
          simulatorUuid: 'test-uuid-123',
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
          simulatorUuid: 'test-uuid-123',
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
          simulatorUuid: 'invalid-uuid',
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
          simulatorUuid: 'test-uuid-123',
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
          simulatorUuid: 'test-uuid-123',
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
          simulatorUuid: 'test-uuid-123',
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
          simulatorUuid: 'test-uuid-123',
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
          simulatorUuid: 'test-uuid-123',
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
        return {
          success: true,
          output: 'Location set successfully',
          error: undefined,
          process: { pid: 12345 },
        };
      };

      await set_sim_locationLogic(
        {
          simulatorUuid: 'test-uuid-123',
          latitude: 37.7749,
          longitude: -122.4194,
        },
        mockExecutor,
      );

      expect(capturedArgs).toEqual([
        ['xcrun', 'simctl', 'location', 'test-uuid-123', 'set', '37.7749,-122.4194'],
        'Set Simulator Location',
        true,
        {},
      ]);
    });
  });
});
