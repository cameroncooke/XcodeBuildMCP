import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import plugin from './stop_app_sim.ts';

vi.mock('../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

vi.mock('../../src/utils/command.ts', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('../../src/utils/validation.ts', () => ({
  validateRequiredParam: vi.fn(),
}));

describe('stop_app_sim plugin', () => {
  let mockExecuteCommand: MockedFunction<any>;
  let mockValidateRequiredParam: MockedFunction<any>;

  beforeEach(async () => {
    const { executeCommand } = await import('../../src/utils/command.ts');
    mockExecuteCommand = executeCommand as MockedFunction<any>;

    const validationModule = await import('../../src/utils/validation.ts');
    mockValidateRequiredParam = validationModule.validateRequiredParam as MockedFunction<any>;

    mockValidateRequiredParam.mockReturnValue({
      isValid: true,
      errorResponse: null,
    });

    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name field', () => {
      expect(plugin.name).toBe('stop_app_sim');
    });

    it('should have correct description field', () => {
      expect(plugin.description).toBe(
        'Stops an app running in an iOS simulator. Requires simulatorUuid and bundleId.',
      );
    });

    it('should have handler function', () => {
      expect(typeof plugin.handler).toBe('function');
    });

    it('should have correct schema validation', () => {
      const schema = z.object(plugin.schema);

      expect(
        schema.safeParse({
          simulatorUuid: 'abc123',
          bundleId: 'com.example.app',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          simulatorUuid: 123,
          bundleId: 'com.example.app',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          simulatorUuid: 'abc123',
          bundleId: 123,
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          simulatorUuid: 'abc123',
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should stop app successfully', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
      });

      const result = await plugin.handler({
        simulatorUuid: 'test-uuid',
        bundleId: 'com.example.App',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ App com.example.App stopped successfully in simulator test-uuid',
          },
        ],
      });
    });

    it('should handle command failure', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Simulator not found',
      });

      const result = await plugin.handler({
        simulatorUuid: 'invalid-uuid',
        bundleId: 'com.example.App',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Stop app in simulator operation failed: Simulator not found',
          },
        ],
        isError: true,
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

      const result = await plugin.handler({ bundleId: 'com.example.App' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'simulatorUuid is required' }],
        isError: true,
      });
    });

    it('should handle missing bundleId', async () => {
      mockValidateRequiredParam.mockReturnValueOnce({ isValid: true }).mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'bundleId is required' }],
          isError: true,
        },
      });

      const result = await plugin.handler({ simulatorUuid: 'test-uuid' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'bundleId is required' }],
        isError: true,
      });
    });

    it('should handle exception during execution', async () => {
      mockExecuteCommand.mockRejectedValue(new Error('Unexpected error'));

      const result = await plugin.handler({
        simulatorUuid: 'test-uuid',
        bundleId: 'com.example.App',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Stop app in simulator operation failed: Unexpected error',
          },
        ],
        isError: true,
      });
    });

    it('should call correct command', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
      });

      await plugin.handler({
        simulatorUuid: 'test-uuid',
        bundleId: 'com.example.App',
      });

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        ['xcrun', 'simctl', 'terminate', 'test-uuid', 'com.example.App'],
        'Stop App in Simulator',
      );
    });
  });
});
