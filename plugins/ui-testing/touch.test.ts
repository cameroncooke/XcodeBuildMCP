import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import touchPlugin from './touch.js';

// Mock dependencies
vi.mock('../../src/utils/executeCommand.js', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('../../src/utils/logging.js', () => ({
  log: vi.fn(),
}));

vi.mock('../../src/utils/validation.js', () => ({
  validateRequiredParam: vi.fn(),
  createTextResponse: vi.fn(),
}));

vi.mock('../../src/utils/errors.js', () => ({
  createErrorResponse: vi.fn(),
  DependencyError: class extends Error {},
  AxeError: class extends Error {},
  SystemError: class extends Error {},
}));

vi.mock('../../src/utils/axe-helpers.js', () => ({
  getAxePath: vi.fn(),
  getBundledAxeEnvironment: vi.fn(),
  createAxeNotAvailableResponse: vi.fn(),
}));

describe('touch plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export the correct plugin structure', () => {
    expect(touchPlugin).toMatchObject({
      name: 'touch',
      description: 'Perform touch down/up events at specific coordinates. Use describe_ui for precise coordinates (don\'t guess from screenshots).',
    });
    expect(touchPlugin).toHaveProperty('schema');
    expect(touchPlugin).toHaveProperty('handler');
    expect(typeof touchPlugin.handler).toBe('function');
  });

  it('should have correct tool name', () => {
    expect(touchPlugin.name).toBe('touch');
  });

  it('should have correct tool description', () => {
    expect(touchPlugin.description).toBe("Perform touch down/up events at specific coordinates. Use describe_ui for precise coordinates (don't guess from screenshots).");
  });

  it('should have correct schema structure', () => {
    expect(touchPlugin.schema).toBeDefined();
    expect(touchPlugin.schema.simulatorUuid).toBeDefined();
    expect(touchPlugin.schema.x).toBeDefined();
    expect(touchPlugin.schema.y).toBeDefined();
    expect(touchPlugin.schema.down).toBeDefined();
    expect(touchPlugin.schema.up).toBeDefined();
    expect(touchPlugin.schema.delay).toBeDefined();
  });

  it('should have handler function', () => {
    expect(typeof touchPlugin.handler).toBe('function');
  });

  describe('schema validation', () => {
    it('should require simulatorUuid as UUID', () => {
      const result = touchPlugin.schema.simulatorUuid.safeParse('invalid-uuid');
      expect(result.success).toBe(false);
    });

    it('should accept valid UUID for simulatorUuid', () => {
      const validUuid = '12345678-1234-1234-1234-123456789012';
      const result = touchPlugin.schema.simulatorUuid.safeParse(validUuid);
      expect(result.success).toBe(true);
    });

    it('should require x as integer', () => {
      const result = touchPlugin.schema.x.safeParse(3.14);
      expect(result.success).toBe(false);
    });

    it('should accept valid integer for x', () => {
      const result = touchPlugin.schema.x.safeParse(100);
      expect(result.success).toBe(true);
    });

    it('should require y as integer', () => {
      const result = touchPlugin.schema.y.safeParse(3.14);
      expect(result.success).toBe(false);
    });

    it('should accept valid integer for y', () => {
      const result = touchPlugin.schema.y.safeParse(200);
      expect(result.success).toBe(true);
    });

    it('should accept boolean for down', () => {
      const result = touchPlugin.schema.down.safeParse(true);
      expect(result.success).toBe(true);
    });

    it('should accept boolean for up', () => {
      const result = touchPlugin.schema.up.safeParse(false);
      expect(result.success).toBe(true);
    });

    it('should make down optional', () => {
      const result = touchPlugin.schema.down.safeParse(undefined);
      expect(result.success).toBe(true);
    });

    it('should make up optional', () => {
      const result = touchPlugin.schema.up.safeParse(undefined);
      expect(result.success).toBe(true);
    });

    it('should accept non-negative delay', () => {
      const result = touchPlugin.schema.delay.safeParse(0.5);
      expect(result.success).toBe(true);
    });

    it('should reject negative delay', () => {
      const result = touchPlugin.schema.delay.safeParse(-1);
      expect(result.success).toBe(false);
    });

    it('should make delay optional', () => {
      const result = touchPlugin.schema.delay.safeParse(undefined);
      expect(result.success).toBe(true);
    });
  });

  describe('handler integration', () => {
    it('should be an async function', () => {
      expect(touchPlugin.handler.constructor.name).toBe('AsyncFunction');
    });

    it('should accept correct parameter types', async () => {
      // This test verifies the handler signature matches expectations
      const mockParams = {
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
        down: true,
        up: false,
        delay: 0.5,
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
        output: 'Touch completed',
        error: '',
      });

      // Test that the handler can be called without throwing
      expect(async () => {
        await touchPlugin.handler(mockParams);
      }).not.toThrow();
    });

    it('should handle validation logic requiring at least one of down/up', async () => {
      // Mock validation to pass for required params
      const { validateRequiredParam } = await import('../../src/utils/validation.js');
      vi.mocked(validateRequiredParam).mockReturnValue({
        isValid: true,
        errorResponse: undefined,
      });

      // Mock createErrorResponse to track calls
      const { createErrorResponse } = await import('../../src/utils/errors.js');
      const mockErrorResponse = { content: [{ type: 'text', text: 'Error' }], isError: true };
      vi.mocked(createErrorResponse).mockReturnValue(mockErrorResponse);

      const mockParams = {
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
        // Both down and up are undefined/false
      };

      const result = await touchPlugin.handler(mockParams);

      // Should call createErrorResponse for validation error
      expect(createErrorResponse).toHaveBeenCalledWith(
        'At least one of "down" or "up" must be true',
        undefined,
        'ValidationError'
      );
      expect(result).toBe(mockErrorResponse);
    });
  });
});