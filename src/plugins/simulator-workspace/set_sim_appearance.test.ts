import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import setSimAppearancePlugin from './set_sim_appearance.ts';

vi.mock('../../src/utils/command.ts', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

vi.mock('../../src/utils/validation.ts', () => ({
  validateRequiredParam: vi.fn(),
}));

describe('set_sim_appearance plugin', () => {
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
      expect(setSimAppearancePlugin.name).toBe('set_sim_appearance');
    });

    it('should have correct description field', () => {
      expect(setSimAppearancePlugin.description).toBe(
        'Sets the appearance mode (dark/light) of an iOS simulator.',
      );
    });

    it('should have handler function', () => {
      expect(typeof setSimAppearancePlugin.handler).toBe('function');
    });

    it('should have correct schema validation', () => {
      const schema = z.object(setSimAppearancePlugin.schema);

      expect(
        schema.safeParse({
          simulatorUuid: 'abc123',
          mode: 'dark',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          simulatorUuid: 'abc123',
          mode: 'light',
        }).success,
      ).toBe(true);

      expect(
        schema.safeParse({
          simulatorUuid: 'abc123',
          mode: 'invalid',
        }).success,
      ).toBe(false);

      expect(
        schema.safeParse({
          simulatorUuid: 123,
          mode: 'dark',
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should handle successful appearance change', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: '',
        error: '',
      });

      const result = await setSimAppearancePlugin.handler({
        simulatorUuid: 'test-uuid-123',
        mode: 'dark',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Successfully set simulator test-uuid-123 appearance to dark mode',
          },
        ],
      });
    });

    it('should handle appearance change failure', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Invalid device: invalid-uuid',
      });

      const result = await setSimAppearancePlugin.handler({
        simulatorUuid: 'invalid-uuid',
        mode: 'light',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to set simulator appearance: Invalid device: invalid-uuid',
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

      const result = await setSimAppearancePlugin.handler({ mode: 'dark' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'simulatorUuid is required' }],
        isError: true,
      });
    });

    it('should handle exception during execution', async () => {
      mockExecuteCommand.mockRejectedValue(new Error('Network error'));

      const result = await setSimAppearancePlugin.handler({
        simulatorUuid: 'test-uuid-123',
        mode: 'dark',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Failed to set simulator appearance: Network error',
          },
        ],
      });
    });

    it('should call correct command', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: '',
        error: '',
      });

      await setSimAppearancePlugin.handler({
        simulatorUuid: 'test-uuid-123',
        mode: 'dark',
      });

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        ['xcrun', 'simctl', 'ui', 'test-uuid-123', 'appearance', 'dark'],
        'Set Simulator Appearance',
      );
    });
  });
});
