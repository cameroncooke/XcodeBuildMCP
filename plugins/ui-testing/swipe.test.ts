import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import swipePlugin from './swipe.js';

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

describe('swipe plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export the correct plugin structure', () => {
    expect(swipePlugin).toMatchObject({
      name: 'swipe',
      description: 'Swipe from one point to another. Use describe_ui for precise coordinates (don\'t guess from screenshots). Supports configurable timing.',
    });
    expect(swipePlugin).toHaveProperty('schema');
    expect(swipePlugin).toHaveProperty('handler');
    expect(typeof swipePlugin.handler).toBe('function');
  });

  it('should have correct tool name', () => {
    expect(swipePlugin.name).toBe('swipe');
  });

  it('should have correct tool description', () => {
    expect(swipePlugin.description).toBe("Swipe from one point to another. Use describe_ui for precise coordinates (don't guess from screenshots). Supports configurable timing.");
  });

  it('should have correct schema structure', () => {
    expect(swipePlugin.schema).toBeDefined();
    expect(swipePlugin.schema.simulatorUuid).toBeDefined();
    expect(swipePlugin.schema.x1).toBeDefined();
    expect(swipePlugin.schema.y1).toBeDefined();
    expect(swipePlugin.schema.x2).toBeDefined();
    expect(swipePlugin.schema.y2).toBeDefined();
    expect(swipePlugin.schema.duration).toBeDefined();
    expect(swipePlugin.schema.delta).toBeDefined();
    expect(swipePlugin.schema.preDelay).toBeDefined();
    expect(swipePlugin.schema.postDelay).toBeDefined();
  });

  it('should have handler function', () => {
    expect(typeof swipePlugin.handler).toBe('function');
  });

  describe('schema validation', () => {
    it('should require simulatorUuid as UUID', () => {
      const result = swipePlugin.schema.simulatorUuid.safeParse('invalid-uuid');
      expect(result.success).toBe(false);
    });

    it('should accept valid UUID for simulatorUuid', () => {
      const validUuid = '12345678-1234-1234-1234-123456789012';
      const result = swipePlugin.schema.simulatorUuid.safeParse(validUuid);
      expect(result.success).toBe(true);
    });

    it('should require x1 as integer', () => {
      const result = swipePlugin.schema.x1.safeParse(3.14);
      expect(result.success).toBe(false);
    });

    it('should accept valid integer for x1', () => {
      const result = swipePlugin.schema.x1.safeParse(100);
      expect(result.success).toBe(true);
    });

    it('should require y1 as integer', () => {
      const result = swipePlugin.schema.y1.safeParse(3.14);
      expect(result.success).toBe(false);
    });

    it('should accept valid integer for y1', () => {
      const result = swipePlugin.schema.y1.safeParse(200);
      expect(result.success).toBe(true);
    });

    it('should require x2 as integer', () => {
      const result = swipePlugin.schema.x2.safeParse(3.14);
      expect(result.success).toBe(false);
    });

    it('should accept valid integer for x2', () => {
      const result = swipePlugin.schema.x2.safeParse(300);
      expect(result.success).toBe(true);
    });

    it('should require y2 as integer', () => {
      const result = swipePlugin.schema.y2.safeParse(3.14);
      expect(result.success).toBe(false);
    });

    it('should accept valid integer for y2', () => {
      const result = swipePlugin.schema.y2.safeParse(400);
      expect(result.success).toBe(true);
    });

    it('should accept non-negative duration', () => {
      const result = swipePlugin.schema.duration.safeParse(0.5);
      expect(result.success).toBe(true);
    });

    it('should accept zero duration', () => {
      const result = swipePlugin.schema.duration.safeParse(0);
      expect(result.success).toBe(true);
    });

    it('should reject negative duration', () => {
      const result = swipePlugin.schema.duration.safeParse(-1);
      expect(result.success).toBe(false);
    });

    it('should accept non-negative delta', () => {
      const result = swipePlugin.schema.delta.safeParse(1.0);
      expect(result.success).toBe(true);
    });

    it('should accept zero delta', () => {
      const result = swipePlugin.schema.delta.safeParse(0);
      expect(result.success).toBe(true);
    });

    it('should reject negative delta', () => {
      const result = swipePlugin.schema.delta.safeParse(-1);
      expect(result.success).toBe(false);
    });

    it('should accept non-negative preDelay', () => {
      const result = swipePlugin.schema.preDelay.safeParse(0.5);
      expect(result.success).toBe(true);
    });

    it('should accept zero preDelay', () => {
      const result = swipePlugin.schema.preDelay.safeParse(0);
      expect(result.success).toBe(true);
    });

    it('should reject negative preDelay', () => {
      const result = swipePlugin.schema.preDelay.safeParse(-1);
      expect(result.success).toBe(false);
    });

    it('should accept non-negative postDelay', () => {
      const result = swipePlugin.schema.postDelay.safeParse(1.0);
      expect(result.success).toBe(true);
    });

    it('should accept zero postDelay', () => {
      const result = swipePlugin.schema.postDelay.safeParse(0);
      expect(result.success).toBe(true);
    });

    it('should reject negative postDelay', () => {
      const result = swipePlugin.schema.postDelay.safeParse(-1);
      expect(result.success).toBe(false);
    });

    it('should make duration optional', () => {
      const result = swipePlugin.schema.duration.safeParse(undefined);
      expect(result.success).toBe(true);
    });

    it('should make delta optional', () => {
      const result = swipePlugin.schema.delta.safeParse(undefined);
      expect(result.success).toBe(true);
    });

    it('should make preDelay optional', () => {
      const result = swipePlugin.schema.preDelay.safeParse(undefined);
      expect(result.success).toBe(true);
    });

    it('should make postDelay optional', () => {
      const result = swipePlugin.schema.postDelay.safeParse(undefined);
      expect(result.success).toBe(true);
    });
  });

  describe('handler integration', () => {
    it('should be an async function', () => {
      expect(swipePlugin.handler.constructor.name).toBe('AsyncFunction');
    });

    it('should accept correct parameter types', async () => {
      // This test verifies the handler signature matches expectations
      const mockParams = {
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x1: 100,
        y1: 200,
        x2: 300,
        y2: 400,
        duration: 0.5,
        delta: 1.0,
        preDelay: 0.2,
        postDelay: 0.3,
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
        output: 'Swipe completed',
        error: '',
      });

      // Mock response creation
      const { createTextResponse } = await import('../../src/utils/response.js');
      vi.mocked(createTextResponse).mockReturnValue({
        content: [{ type: 'text', text: 'Success' }],
      });

      // Should not throw when called with proper parameters
      await expect(swipePlugin.handler(mockParams)).resolves.toBeDefined();
    });

    it('should accept minimal required parameters only', async () => {
      // Test with only required parameters (no optional timing parameters)
      const mockParams = {
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x1: 100,
        y1: 200,
        x2: 300,
        y2: 400,
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
        output: 'Swipe completed',
        error: '',
      });

      // Mock response creation
      const { createTextResponse } = await import('../../src/utils/response.js');
      vi.mocked(createTextResponse).mockReturnValue({
        content: [{ type: 'text', text: 'Success' }],
      });

      // Should not throw when called with only required parameters
      await expect(swipePlugin.handler(mockParams)).resolves.toBeDefined();
    });
  });

  describe('compatibility with original exports', () => {
    it('should have the correct name', () => {
      expect(swipePlugin.name).toBe('swipe');
    });

    it('should have the correct description', () => {
      expect(swipePlugin.description).toBe('Swipe from one point to another. Use describe_ui for precise coordinates (don\'t guess from screenshots). Supports configurable timing.');
    });

    it('should have the correct schema structure', () => {
      expect(typeof swipePlugin.schema).toBe('object');
      expect(Object.keys(swipePlugin.schema)).toEqual(['simulatorUuid', 'x1', 'y1', 'x2', 'y2', 'duration', 'delta', 'preDelay', 'postDelay']);
    });

    it('should have the correct handler type', () => {
      expect(typeof swipePlugin.handler).toBe('function');
    });
  });
});