import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import setSimulatorLocationPlugin from '../set_simulator_location.ts';
import { createMockExecutor } from '../../../utils/command.js';

describe('set_simulator_location tool', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(setSimulatorLocationPlugin.name).toBe('set_simulator_location');
    });

    it('should have correct description', () => {
      expect(setSimulatorLocationPlugin.description).toBe(
        'Sets a custom GPS location for the simulator.',
      );
    });

    it('should have handler function', () => {
      expect(typeof setSimulatorLocationPlugin.handler).toBe('function');
    });

    it('should have correct schema with simulatorUuid string field and latitude/longitude number fields', () => {
      const schema = z.object(setSimulatorLocationPlugin.schema);

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

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle successful location setting', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Location set successfully',
        error: '',
      });

      const result = await setSimulatorLocationPlugin.handler(
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

    it('should handle missing simulatorUuid', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Location set successfully',
      });

      const result = await setSimulatorLocationPlugin.handler(
        {
          latitude: 37.7749,
          longitude: -122.4194,
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'simulatorUuid' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should handle latitude validation failure', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Location set successfully',
      });

      const result = await setSimulatorLocationPlugin.handler(
        {
          simulatorUuid: 'test-uuid-123',
          latitude: 95,
          longitude: -122.4194,
        },
        mockExecutor,
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
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Location set successfully',
      });

      const result = await setSimulatorLocationPlugin.handler(
        {
          simulatorUuid: 'test-uuid-123',
          latitude: 37.7749,
          longitude: -185,
        },
        mockExecutor,
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

      const result = await setSimulatorLocationPlugin.handler(
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

      const result = await setSimulatorLocationPlugin.handler(
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

      const result = await setSimulatorLocationPlugin.handler(
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

    it('should call correct command', async () => {
      let capturedCommand: string[] = [];
      let capturedLogPrefix: string | undefined;

      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Location set successfully',
      });

      // Create a wrapper to capture the command arguments
      const capturingExecutor = async (command: string[], logPrefix?: string) => {
        capturedCommand = command;
        capturedLogPrefix = logPrefix;
        return mockExecutor(command, logPrefix);
      };

      await setSimulatorLocationPlugin.handler(
        {
          simulatorUuid: 'test-uuid-123',
          latitude: 37.7749,
          longitude: -122.4194,
        },
        capturingExecutor,
      );

      expect(capturedCommand).toEqual([
        'xcrun',
        'simctl',
        'location',
        'test-uuid-123',
        'set',
        '37.7749,-122.4194',
      ]);
      expect(capturedLogPrefix).toBe('Set Simulator Location');
    });
  });
});
