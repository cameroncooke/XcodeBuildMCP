import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import resetSimulatorLocationPlugin from './reset_simulator_location.ts';

vi.mock('../../utils/index.js', () => ({
  executeCommand: vi.fn(),
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
  createTextResponse: vi.fn(),
  createErrorResponse: vi.fn(),
}));

describe('reset_simulator_location plugin', () => {
  let mockExecuteCommand: MockedFunction<any>;
  let mockValidateRequiredParam: MockedFunction<any>;

  beforeEach(async () => {
    const { executeCommand, validateRequiredParam } = await import('../../utils/index.js');
    mockExecuteCommand = executeCommand as MockedFunction<any>;
    mockValidateRequiredParam = validateRequiredParam as MockedFunction<any>;

    mockValidateRequiredParam.mockReturnValue({
      isValid: true,
      errorResponse: null,
    });

    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(resetSimulatorLocationPlugin.name).toBe('reset_simulator_location');
    });

    it('should have correct description field', () => {
      expect(resetSimulatorLocationPlugin.description).toBe(
        "Resets the simulator's location to default.",
      );
    });

    it('should have handler function', () => {
      expect(typeof resetSimulatorLocationPlugin.handler).toBe('function');
    });

    it('should have correct schema validation', () => {
      const schema = z.object(resetSimulatorLocationPlugin.schema);

      expect(
        schema.safeParse({
          simulatorUuid: 'abc123',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          simulatorUuid: 123,
        }).success,
      ).toBe(false);

      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should successfully reset simulator location', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Location reset successfully',
      });

      const result = await resetSimulatorLocationPlugin.handler({
        simulatorUuid: 'test-uuid-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Successfully reset simulator test-uuid-123 location.',
          },
        ],
      });
    });

    it('should handle command failure', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Command failed',
      });

      const result = await resetSimulatorLocationPlugin.handler({
        simulatorUuid: 'test-uuid-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to reset simulator location: Command failed',
          },
        ],
      });
    });

    it('should handle missing simulatorUuid', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'simulatorUuid is required' }],
          isError: true,
        },
      });

      const result = await resetSimulatorLocationPlugin.handler({});

      expect(result).toEqual({
        content: [{ type: 'text', text: 'simulatorUuid is required' }],
        isError: true,
      });
    });

    it('should handle exception during execution', async () => {
      mockExecuteCommand.mockRejectedValue(new Error('Network error'));

      const result = await resetSimulatorLocationPlugin.handler({
        simulatorUuid: 'test-uuid-123',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to reset simulator location: Network error',
          },
        ],
      });
    });

    it('should call correct command', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Location reset successfully',
      });

      await resetSimulatorLocationPlugin.handler({
        simulatorUuid: 'test-uuid-123',
      });

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        ['xcrun', 'simctl', 'location', 'test-uuid-123', 'clear'],
        'Reset Simulator Location',
      );
    });
  });
});
