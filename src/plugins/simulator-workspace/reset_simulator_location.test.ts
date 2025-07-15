/**
 * Test for reset_simulator_location plugin
 * NO VITEST MOCKING ALLOWED - Only createMockExecutor and manual stubs
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import resetSimulatorLocationPlugin from './reset_simulator_location.ts';

describe('reset_simulator_location plugin', () => {
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

  describe('Command Generation', () => {
    it('should call correct command with valid parameters', async () => {
      // Track executeCommand calls
      const executeCommandCalls: any[] = [];
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Location reset successfully',
      });

      // Override executeCommand to track calls
      const originalExecuteCommand = (await import('../../../utils/command.js')).executeCommand;

      // Create a tracking wrapper
      const trackingExecuteCommand = async (
        command: string[],
        description: string,
        enableLogging?: boolean,
        options?: Record<string, any>,
        executor?: any,
      ) => {
        executeCommandCalls.push({ command, description, enableLogging, options, executor });
        return originalExecuteCommand(
          command,
          description,
          enableLogging,
          options,
          executor || mockExecutor,
        );
      };

      // Monkey patch for this test
      const utilsModule = await import('../../../utils/command.js');
      const originalExec = utilsModule.executeCommand;
      (utilsModule as any).executeCommand = trackingExecuteCommand;

      try {
        await resetSimulatorLocationPlugin.handler({
          simulatorUuid: 'test-uuid-123',
        });

        expect(executeCommandCalls).toHaveLength(1);
        expect(executeCommandCalls[0].command).toEqual([
          'xcrun',
          'simctl',
          'location',
          'test-uuid-123',
          'clear',
        ]);
        expect(executeCommandCalls[0].description).toBe('Reset Simulator Location');
      } finally {
        // Restore original
        (utilsModule as any).executeCommand = originalExec;
      }
    });
  });

  describe('Response Processing', () => {
    it('should successfully reset simulator location', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Location reset successfully',
      });

      const result = await resetSimulatorLocationPlugin.handler(
        {
          simulatorUuid: 'test-uuid-123',
        },
        mockExecutor,
      );

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
      const mockExecutor = createMockExecutor({
        success: false,
        error: 'Command failed',
      });

      const result = await resetSimulatorLocationPlugin.handler(
        {
          simulatorUuid: 'test-uuid-123',
        },
        mockExecutor,
      );

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
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'Location reset successfully',
      });

      const result = await resetSimulatorLocationPlugin.handler({}, mockExecutor);

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
      const mockExecutor = createMockExecutor(new Error('Network error'));

      const result = await resetSimulatorLocationPlugin.handler(
        {
          simulatorUuid: 'test-uuid-123',
        },
        mockExecutor,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to reset simulator location: Network error',
          },
        ],
      });
    });
  });
});
