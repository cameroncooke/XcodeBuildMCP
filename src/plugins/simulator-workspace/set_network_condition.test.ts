import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';

// Import the plugin
import setNetworkCondition from './set_network_condition.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  executeCommand: vi.fn(),
  validateRequiredParam: vi.fn(),
}));

describe('set_network_condition tool', () => {
  let mockExecuteCommand: MockedFunction<any>;
  let mockValidateRequiredParam: MockedFunction<any>;
  let mockLog: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');
    mockExecuteCommand = utils.executeCommand as MockedFunction<any>;
    mockValidateRequiredParam = utils.validateRequiredParam as MockedFunction<any>;
    mockLog = utils.log as MockedFunction<any>;

    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(setNetworkCondition.name).toBe('set_network_condition');
    });

    it('should have correct description', () => {
      expect(setNetworkCondition.description).toBe(
        'Simulates different network conditions (e.g., wifi, 3g, edge, high-latency, dsl, 100%loss, 3g-lossy, very-lossy) in the simulator.',
      );
    });

    it('should have handler function', () => {
      expect(typeof setNetworkCondition.handler).toBe('function');
    });

    it('should have correct schema with simulatorUuid string field and profile enum field', () => {
      const schema = z.object(setNetworkCondition.schema);

      // Valid inputs
      expect(schema.safeParse({ simulatorUuid: 'test-uuid-123', profile: 'wifi' }).success).toBe(
        true,
      );
      expect(schema.safeParse({ simulatorUuid: 'ABC123-DEF456', profile: '3g' }).success).toBe(
        true,
      );
      expect(schema.safeParse({ simulatorUuid: 'test-uuid', profile: 'edge' }).success).toBe(true);
      expect(
        schema.safeParse({ simulatorUuid: 'test-uuid', profile: 'high-latency' }).success,
      ).toBe(true);
      expect(schema.safeParse({ simulatorUuid: 'test-uuid', profile: 'dsl' }).success).toBe(true);
      expect(schema.safeParse({ simulatorUuid: 'test-uuid', profile: '100%loss' }).success).toBe(
        true,
      );
      expect(schema.safeParse({ simulatorUuid: 'test-uuid', profile: '3g-lossy' }).success).toBe(
        true,
      );
      expect(schema.safeParse({ simulatorUuid: 'test-uuid', profile: 'very-lossy' }).success).toBe(
        true,
      );

      // Invalid inputs
      expect(schema.safeParse({ simulatorUuid: 123, profile: 'wifi' }).success).toBe(false);
      expect(schema.safeParse({ simulatorUuid: 'test-uuid', profile: 'invalid' }).success).toBe(
        false,
      );
      expect(schema.safeParse({ simulatorUuid: 'test-uuid', profile: 123 }).success).toBe(false);
      expect(schema.safeParse({ simulatorUuid: null, profile: 'wifi' }).success).toBe(false);
      expect(schema.safeParse({ simulatorUuid: 'test-uuid' }).success).toBe(false);
      expect(schema.safeParse({ profile: 'wifi' }).success).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle successful network condition setting', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: null,
      });

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Network condition set successfully',
        error: '',
      });

      const result = await setNetworkCondition.handler({
        simulatorUuid: 'test-uuid-123',
        profile: 'wifi',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Successfully set simulator test-uuid-123 network condition to wifi profile',
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

      const result = await setNetworkCondition.handler({ simulatorUuid: '', profile: 'wifi' });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'simulatorUuid is required',
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

      const result = await setNetworkCondition.handler({
        simulatorUuid: 'invalid-uuid',
        profile: '3g',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to set network condition: Simulator not found',
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

      const result = await setNetworkCondition.handler({
        simulatorUuid: 'test-uuid-123',
        profile: 'edge',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to set network condition: Connection failed',
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

      const result = await setNetworkCondition.handler({
        simulatorUuid: 'test-uuid-123',
        profile: 'dsl',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to set network condition: String error',
          },
        ],
      });
    });
  });
});
