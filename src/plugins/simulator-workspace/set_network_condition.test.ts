import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../utils/command.js';

// Import the plugin
import setNetworkCondition from './set_network_condition.ts';

describe('set_network_condition tool', () => {
  beforeEach(() => {
    // Clean setup for each test
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
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Network condition set successfully',
      });

      const result = await setNetworkCondition.handler(
        {
          simulatorUuid: 'test-uuid-123',
          profile: 'wifi',
        },
        mockExecutor,
      );

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
      const result = await setNetworkCondition.handler({
        simulatorUuid: undefined,
        profile: 'wifi',
      });

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

    it('should handle command failure', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Simulator not found',
      });

      const result = await setNetworkCondition.handler(
        {
          simulatorUuid: 'invalid-uuid',
          profile: '3g',
        },
        mockExecutor,
      );

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
      const mockExecutor = createMockExecutor(new Error('Connection failed'));

      const result = await setNetworkCondition.handler(
        {
          simulatorUuid: 'test-uuid-123',
          profile: 'edge',
        },
        mockExecutor,
      );

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
      const mockExecutor = createMockExecutor('String error');

      const result = await setNetworkCondition.handler(
        {
          simulatorUuid: 'test-uuid-123',
          profile: 'dsl',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to set network condition: String error',
          },
        ],
      });
    });

    it('should verify command generation with mock executor', async () => {
      const calls: any[] = [];
      const mockExecutor = (...args: any[]) => {
        calls.push(args);
        return Promise.resolve({
          success: true,
          output: 'Network condition set successfully',
          error: undefined,
          process: { pid: 12345 },
        });
      };

      await setNetworkCondition.handler(
        {
          simulatorUuid: 'test-uuid-123',
          profile: 'wifi',
        },
        mockExecutor,
      );

      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual([
        ['xcrun', 'simctl', 'status_bar', 'test-uuid-123', 'override', '--dataNetwork', 'wifi'],
        'Set Network Condition',
        true,
        undefined,
      ]);
    });
  });
});
