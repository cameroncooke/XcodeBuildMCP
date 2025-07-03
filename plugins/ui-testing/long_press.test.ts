import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import longPressPlugin from './long_press.js';

// Mock dependencies
vi.mock('../../src/utils/executeCommand.js', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('../../src/utils/logging.js', () => ({
  log: vi.fn(),
}));

vi.mock('../../src/utils/validation.js', () => ({
  validateRequiredParam: vi.fn(),
}));

vi.mock('../../src/utils/response.js', () => ({
  createTextResponse: vi.fn(),
  createErrorResponse: vi.fn(),
}));

vi.mock('../../src/utils/axe-helpers.js', () => ({
  getAxePath: vi.fn(),
  getBundledAxeEnvironment: vi.fn(),
  createAxeNotAvailableResponse: vi.fn(),
}));

describe('long_press plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export the correct plugin structure', () => {
    expect(longPressPlugin).toMatchObject({
      name: 'long_press',
      description: 'Long press at specific coordinates for given duration (ms). Use describe_ui for precise coordinates (don\'t guess from screenshots).',
    });
    expect(longPressPlugin).toHaveProperty('schema');
    expect(longPressPlugin).toHaveProperty('handler');
    expect(typeof longPressPlugin.handler).toBe('function');
  });

  it('should have correct tool name', () => {
    expect(longPressPlugin.name).toBe('long_press');
  });

  it('should have correct tool description', () => {
    expect(longPressPlugin.description).toBe("Long press at specific coordinates for given duration (ms). Use describe_ui for precise coordinates (don't guess from screenshots).");
  });

  it('should have correct schema structure', () => {
    expect(longPressPlugin.schema).toBeDefined();
    expect(longPressPlugin.schema.simulatorUuid).toBeDefined();
    expect(longPressPlugin.schema.x).toBeDefined();
    expect(longPressPlugin.schema.y).toBeDefined();
    expect(longPressPlugin.schema.duration).toBeDefined();
  });

  it('should have handler function', () => {
    expect(typeof longPressPlugin.handler).toBe('function');
  });

  describe('schema validation', () => {
    it('should require simulatorUuid as UUID', () => {
      const result = longPressPlugin.schema.simulatorUuid.safeParse('invalid-uuid');
      expect(result.success).toBe(false);
    });

    it('should accept valid UUID for simulatorUuid', () => {
      const validUuid = '12345678-1234-1234-1234-123456789012';
      const result = longPressPlugin.schema.simulatorUuid.safeParse(validUuid);
      expect(result.success).toBe(true);
    });

    it('should require x as integer', () => {
      const result = longPressPlugin.schema.x.safeParse(3.14);
      expect(result.success).toBe(false);
    });

    it('should accept valid integer for x', () => {
      const result = longPressPlugin.schema.x.safeParse(100);
      expect(result.success).toBe(true);
    });

    it('should require y as integer', () => {
      const result = longPressPlugin.schema.y.safeParse(3.14);
      expect(result.success).toBe(false);
    });

    it('should accept valid integer for y', () => {
      const result = longPressPlugin.schema.y.safeParse(200);
      expect(result.success).toBe(true);
    });

    it('should require duration as positive number', () => {
      const result = longPressPlugin.schema.duration.safeParse(0);
      expect(result.success).toBe(false);
    });

    it('should accept positive duration', () => {
      const result = longPressPlugin.schema.duration.safeParse(1500);
      expect(result.success).toBe(true);
    });

    it('should reject negative duration', () => {
      const result = longPressPlugin.schema.duration.safeParse(-100);
      expect(result.success).toBe(false);
    });

    it('should accept decimal duration', () => {
      const result = longPressPlugin.schema.duration.safeParse(500.5);
      expect(result.success).toBe(true);
    });
  });

  describe('handler integration', () => {
    it('should be an async function', () => {
      expect(longPressPlugin.handler.constructor.name).toBe('AsyncFunction');
    });

    it('should accept correct parameter types', async () => {
      // This test verifies the handler signature matches expectations
      const mockParams = {
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
        duration: 1500,
      };

      // Mock the validation to pass
      const { validateRequiredParam } = await import('../../src/utils/validation.js');
      vi.mocked(validateRequiredParam).mockReturnValue({
        isValid: true,
        errorResponse: undefined,
      });

      // Mock axe helpers
      const { getAxePath } = await import('../../src/utils/axe-helpers.js');
      vi.mocked(getAxePath).mockReturnValue('/path/to/axe');

      // Mock executeCommand
      const { executeCommand } = await import('../../src/utils/executeCommand.js');
      vi.mocked(executeCommand).mockResolvedValue({
        success: true,
        output: 'Long press completed',
        error: '',
      });

      // Mock response creation
      const { createTextResponse } = await import('../../src/utils/response.js');
      vi.mocked(createTextResponse).mockReturnValue({
        content: [{ type: 'text', text: 'Success' }],
      });

      // Should not throw when called with proper parameters
      await expect(longPressPlugin.handler(mockParams)).resolves.toBeDefined();
    });

  });

  describe('compatibility with original exports', () => {
    it('should have the correct name', () => {
      expect(longPressPlugin.name).toBe('long_press');
    });

    it('should have the correct description', () => {
      expect(longPressPlugin.description).toBe('Long press at specific coordinates for given duration (ms). Use describe_ui for precise coordinates (don\'t guess from screenshots).');
    });

    it('should have the correct schema structure', () => {
      expect(typeof longPressPlugin.schema).toBe('object');
      expect(Object.keys(longPressPlugin.schema)).toEqual(['simulatorUuid', 'x', 'y', 'duration']);
    });

    it('should have the correct handler type', () => {
      expect(typeof longPressPlugin.handler).toBe('function');
    });
  });
});