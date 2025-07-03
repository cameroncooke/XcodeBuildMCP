import { describe, it, expect, vi, beforeEach } from 'vitest';
import buttonPlugin from './button.ts';
import {
  buttonToolName,
  buttonToolDescription,
  buttonToolSchema,
  buttonToolHandler,
} from '../../src/tools/axe/index.ts';

// Mock dependencies
vi.mock('../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

vi.mock('../../src/utils/command.ts', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('../../src/utils/axe-helpers.ts', () => ({
  getAxePath: vi.fn().mockReturnValue('/usr/local/bin/axe'),
  getBundledAxeEnvironment: vi.fn().mockReturnValue({}),
  createAxeNotAvailableResponse: vi.fn().mockReturnValue({
    content: [{ type: 'text', text: 'AXe not available' }],
    isError: true,
  }),
}));

describe('Button Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Plugin Structure', () => {
    it('should have correct plugin structure', () => {
      expect(buttonPlugin).toHaveProperty('name');
      expect(buttonPlugin).toHaveProperty('description');
      expect(buttonPlugin).toHaveProperty('schema');
      expect(buttonPlugin).toHaveProperty('handler');
    });


    it('should have correct tool name', () => {
      expect(buttonPlugin.name).toBe('button');
    });

    it('should have descriptive description', () => {
      expect(buttonPlugin.description).toContain('Press hardware button');
      expect(buttonPlugin.description).toContain('iOS simulator');
      expect(buttonPlugin.description).toContain('apple-pay');
      expect(buttonPlugin.description).toContain('home');
      expect(buttonPlugin.description).toContain('lock');
      expect(buttonPlugin.description).toContain('side-button');
      expect(buttonPlugin.description).toContain('siri');
    });
  });

  describe('Schema Validation', () => {
    it('should require simulatorUuid', () => {
      expect(buttonPlugin.schema).toHaveProperty('simulatorUuid');
      expect(buttonPlugin.schema.simulatorUuid._def.typeName).toBe('ZodString');
    });

    it('should require buttonType with enum validation', () => {
      expect(buttonPlugin.schema).toHaveProperty('buttonType');
      expect(buttonPlugin.schema.buttonType._def.typeName).toBe('ZodEnum');
      expect(buttonPlugin.schema.buttonType._def.values).toEqual([
        'apple-pay',
        'home',
        'lock',
        'side-button',
        'siri',
      ]);
    });

    it('should have optional duration parameter', () => {
      expect(buttonPlugin.schema).toHaveProperty('duration');
      expect(buttonPlugin.schema.duration._def.typeName).toBe('ZodOptional');
      expect(buttonPlugin.schema.duration._def.innerType._def.typeName).toBe('ZodNumber');
    });

    it('should validate UUID format for simulatorUuid', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const invalidUuid = 'invalid-uuid';

      const validResult = buttonPlugin.schema.simulatorUuid.safeParse(validUuid);
      const invalidResult = buttonPlugin.schema.simulatorUuid.safeParse(invalidUuid);

      expect(validResult.success).toBe(true);
      expect(invalidResult.success).toBe(false);
    });

    it('should validate buttonType enum values', () => {
      const validButtons = ['apple-pay', 'home', 'lock', 'side-button', 'siri'];
      const invalidButton = 'invalid-button';

      validButtons.forEach((button) => {
        const result = buttonPlugin.schema.buttonType.safeParse(button);
        expect(result.success).toBe(true);
      });

      const invalidResult = buttonPlugin.schema.buttonType.safeParse(invalidButton);
      expect(invalidResult.success).toBe(false);
    });

    it('should validate duration as non-negative number', () => {
      const validDurations = [0, 1, 5.5, 10];
      const invalidDurations = [-1, -0.1, 'invalid'];

      validDurations.forEach((duration) => {
        const result = buttonPlugin.schema.duration.safeParse(duration);
        expect(result.success).toBe(true);
      });

      invalidDurations.forEach((duration) => {
        const result = buttonPlugin.schema.duration.safeParse(duration);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Handler Integration', () => {
    let mockExecuteCommand: any;

    beforeEach(async () => {
      const { executeCommand } = await import('../../src/utils/command.ts');
      mockExecuteCommand = vi.mocked(executeCommand);
    });


    it('should handle basic button press successfully', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Button pressed successfully',
        error: '',
      });

      const params = {
        simulatorUuid: '550e8400-e29b-41d4-a716-446655440000',
        buttonType: 'home' as const,
      };

      const result = await buttonPlugin.handler(params);

      expect(result.content).toBeDefined();
      expect(result.content[0]).toEqual({
        type: 'text',
        text: "Hardware button 'home' pressed successfully.",
      });
      expect(result.isError).toBeFalsy();
    });

    it('should handle button press with duration', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Long button press completed',
        error: '',
      });

      const params = {
        simulatorUuid: '550e8400-e29b-41d4-a716-446655440000',
        buttonType: 'side-button' as const,
        duration: 2.5,
      };

      const result = await buttonPlugin.handler(params);

      expect(result.content).toBeDefined();
      expect(result.content[0]).toEqual({
        type: 'text',
        text: "Hardware button 'side-button' pressed successfully.",
      });
      expect(result.isError).toBeFalsy();
    });

    it('should handle all supported button types', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Button pressed',
        error: '',
      });

      const buttonTypes = ['apple-pay', 'home', 'lock', 'side-button', 'siri'] as const;

      for (const buttonType of buttonTypes) {
        const params = {
          simulatorUuid: '550e8400-e29b-41d4-a716-446655440000',
          buttonType,
        };

        const result = await buttonPlugin.handler(params);

        expect(result.content).toBeDefined();
        expect(result.content[0]).toEqual({
          type: 'text',
          text: `Hardware button '${buttonType}' pressed successfully.`,
        });
        expect(result.isError).toBeFalsy();
      }
    });

    it('should return validation error for missing simulatorUuid', async () => {
      const params = {
        simulatorUuid: undefined as any, // Missing UUID
        buttonType: 'home' as const,
      };

      const result = await buttonPlugin.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Required parameter \'simulatorUuid\' is missing');
    });

    it('should return validation error for missing buttonType', async () => {
      const params = {
        simulatorUuid: '550e8400-e29b-41d4-a716-446655440000',
        buttonType: undefined as any,
      };

      const result = await buttonPlugin.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Required parameter \'buttonType\' is missing');
    });
  });
});