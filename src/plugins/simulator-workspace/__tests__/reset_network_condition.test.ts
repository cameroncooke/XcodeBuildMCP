import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import resetNetworkConditionPlugin from '../reset_network_condition.ts';

describe('reset_network_condition plugin', () => {
  let mockExecutor: ReturnType<typeof createMockExecutor>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(resetNetworkConditionPlugin.name).toBe('reset_network_condition');
    });

    it('should have correct description field', () => {
      expect(resetNetworkConditionPlugin.description).toBe(
        'Resets network conditions to default in the simulator.',
      );
    });

    it('should have handler function', () => {
      expect(typeof resetNetworkConditionPlugin.handler).toBe('function');
    });

    it('should have correct schema validation', () => {
      const schema = z.object(resetNetworkConditionPlugin.schema);

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
    it('should successfully reset network condition', async () => {
      mockExecutor = createMockExecutor({
        success: true,
        output: 'Network condition reset successfully',
      });

      const result = await resetNetworkConditionPlugin.handler(
        {
          simulatorUuid: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Successfully reset simulator test-uuid-123 network conditions.',
          },
        ],
      });
    });

    it('should handle command failure', async () => {
      mockExecutor = createMockExecutor({
        success: false,
        error: 'Command failed',
      });

      const result = await resetNetworkConditionPlugin.handler(
        {
          simulatorUuid: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to reset network condition: Command failed',
          },
        ],
      });
    });

    it('should handle missing simulatorUuid', async () => {
      mockExecutor = createMockExecutor({ success: true });

      const result = await resetNetworkConditionPlugin.handler(
        { simulatorUuid: undefined },
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

    it('should handle exception during execution', async () => {
      mockExecutor = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await resetNetworkConditionPlugin.handler(
        {
          simulatorUuid: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to reset network condition: Network error',
          },
        ],
      });
    });

    it('should call correct command', async () => {
      mockExecutor = vi.fn().mockResolvedValue({
        success: true,
        output: 'Network condition reset successfully',
      });

      await resetNetworkConditionPlugin.handler(
        {
          simulatorUuid: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(mockExecutor).toHaveBeenCalledWith(
        ['xcrun', 'simctl', 'status_bar', 'test-uuid-123', 'clear'],
        'Reset Network Condition',
        true,
        undefined,
      );
    });
  });
});
