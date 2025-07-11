import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';

// Import the plugin
import setSimulatorLocation from './set_simulator_location.ts';

// Mock external dependencies
vi.mock('../../utils/index.js', () => ({
  log: vi.fn(),
  executeCommand: vi.fn(),
  validateRequiredParam: vi.fn(),
}));

describe('set_simulator_location tool', () => {
  let mockExecuteCommand: MockedFunction<any>;
  let mockValidateRequiredParam: MockedFunction<any>;
  let mockLog: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../utils/index.js');
    mockExecuteCommand = utils.executeCommand as MockedFunction<any>;
    mockValidateRequiredParam = utils.validateRequiredParam as MockedFunction<any>;
    mockLog = utils.log as MockedFunction<any>;

    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(setSimulatorLocation.name).toBe('set_simulator_location');
    });

    it('should have correct description', () => {
      expect(setSimulatorLocation.description).toBe(
        'Sets a custom GPS location for the simulator.',
      );
    });

    it('should have handler function', () => {
      expect(typeof setSimulatorLocation.handler).toBe('function');
    });

    it('should have correct schema with simulatorUuid string field and latitude/longitude number fields', () => {
      const schema = z.object(setSimulatorLocation.schema);

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
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Location set successfully',
        error: '',
      });

      const result = await setSimulatorLocation.handler({
        simulatorUuid: 'test-uuid-123',
        latitude: 37.7749,
        longitude: -122.4194,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Successfully set simulator test-uuid-123 location to 37.7749,-122.4194',
          },
        ],
      });
    });

    it('should handle validation failure', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: false,
        errorResponse: {
          content: [
            {
              type: 'text',
              text: 'simulatorUuid is required',
            },
          ],
        },
      });

      const result = await setSimulatorLocation.handler({
        simulatorUuid: '',
        latitude: 37.7749,
        longitude: -122.4194,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'simulatorUuid is required',
          },
        ],
      });
    });

    it('should handle latitude validation failure', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      const result = await setSimulatorLocation.handler({
        simulatorUuid: 'test-uuid-123',
        latitude: 95,
        longitude: -122.4194,
      });

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
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      const result = await setSimulatorLocation.handler({
        simulatorUuid: 'test-uuid-123',
        latitude: 37.7749,
        longitude: -185,
      });

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
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Simulator not found',
      });

      const result = await setSimulatorLocation.handler({
        simulatorUuid: 'invalid-uuid',
        latitude: 37.7749,
        longitude: -122.4194,
      });

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
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockExecuteCommand.mockRejectedValue(new Error('Connection failed'));

      const result = await setSimulatorLocation.handler({
        simulatorUuid: 'test-uuid-123',
        latitude: 37.7749,
        longitude: -122.4194,
      });

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
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockExecuteCommand.mockRejectedValue('String error');

      const result = await setSimulatorLocation.handler({
        simulatorUuid: 'test-uuid-123',
        latitude: 37.7749,
        longitude: -122.4194,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to set simulator location: String error',
          },
        ],
      });
    });
  });
});
