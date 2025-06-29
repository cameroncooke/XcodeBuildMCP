import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import tapPlugin from './tap.js';
import { tapToolName, tapToolDescription, tapToolSchema, tapToolHandler } from '../../src/tools/axe/index.js';

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

describe('tap plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export the correct plugin structure', () => {
    expect(tapPlugin).toEqual({
      name: tapToolName,
      description: tapToolDescription,
      schema: tapToolSchema,
      handler: tapToolHandler,
    });
  });

  it('should have correct tool name', () => {
    expect(tapPlugin.name).toBe('tap');
  });

  it('should have correct tool description', () => {
    expect(tapPlugin.description).toBe("Tap at specific coordinates. Use describe_ui to get precise element coordinates (don't guess from screenshots). Supports optional timing delays.");
  });

  it('should have correct schema structure', () => {
    expect(tapPlugin.schema).toBeDefined();
    expect(tapPlugin.schema.simulatorUuid).toBeDefined();
    expect(tapPlugin.schema.x).toBeDefined();
    expect(tapPlugin.schema.y).toBeDefined();
    expect(tapPlugin.schema.preDelay).toBeDefined();
    expect(tapPlugin.schema.postDelay).toBeDefined();
  });

  it('should have handler function', () => {
    expect(typeof tapPlugin.handler).toBe('function');
  });

  describe('schema validation', () => {
    it('should require simulatorUuid as UUID', () => {
      const result = tapPlugin.schema.simulatorUuid.safeParse('invalid-uuid');
      expect(result.success).toBe(false);
    });

    it('should accept valid UUID for simulatorUuid', () => {
      const validUuid = '12345678-1234-1234-1234-123456789012';
      const result = tapPlugin.schema.simulatorUuid.safeParse(validUuid);
      expect(result.success).toBe(true);
    });

    it('should require x as integer', () => {
      const result = tapPlugin.schema.x.safeParse(3.14);
      expect(result.success).toBe(false);
    });

    it('should accept valid integer for x', () => {
      const result = tapPlugin.schema.x.safeParse(100);
      expect(result.success).toBe(true);
    });

    it('should require y as integer', () => {
      const result = tapPlugin.schema.y.safeParse(3.14);
      expect(result.success).toBe(false);
    });

    it('should accept valid integer for y', () => {
      const result = tapPlugin.schema.y.safeParse(200);
      expect(result.success).toBe(true);
    });

    it('should accept non-negative preDelay', () => {
      const result = tapPlugin.schema.preDelay.safeParse(0.5);
      expect(result.success).toBe(true);
    });

    it('should reject negative preDelay', () => {
      const result = tapPlugin.schema.preDelay.safeParse(-1);
      expect(result.success).toBe(false);
    });

    it('should accept non-negative postDelay', () => {
      const result = tapPlugin.schema.postDelay.safeParse(1.0);
      expect(result.success).toBe(true);
    });

    it('should reject negative postDelay', () => {
      const result = tapPlugin.schema.postDelay.safeParse(-1);
      expect(result.success).toBe(false);
    });

    it('should make preDelay optional', () => {
      const result = tapPlugin.schema.preDelay.safeParse(undefined);
      expect(result.success).toBe(true);
    });

    it('should make postDelay optional', () => {
      const result = tapPlugin.schema.postDelay.safeParse(undefined);
      expect(result.success).toBe(true);
    });
  });

  describe('handler integration', () => {
    it('should use the same handler as the original tool', () => {
      expect(tapPlugin.handler).toBe(tapToolHandler);
    });

    it('should be an async function', () => {
      expect(tapPlugin.handler.constructor.name).toBe('AsyncFunction');
    });

    it('should accept correct parameter types', async () => {
      // This test verifies the handler signature matches expectations
      const mockParams = {
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        x: 100,
        y: 200,
        preDelay: 0.5,
        postDelay: 1.0,
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
        output: 'Tap completed',
        error: '',
      });

      // Mock response creation
      const { createTextResponse } = await import('../../src/utils/response.js');
      vi.mocked(createTextResponse).mockReturnValue({
        content: [{ type: 'text', text: 'Success' }],
      });

      // Should not throw when called with proper parameters
      await expect(tapPlugin.handler(mockParams)).resolves.toBeDefined();
    });
  });

  describe('compatibility with original exports', () => {
    it('should use the same name as exported constant', () => {
      expect(tapPlugin.name).toBe(tapToolName);
    });

    it('should use the same description as exported constant', () => {
      expect(tapPlugin.description).toBe(tapToolDescription);
    });

    it('should use the same schema as exported constant', () => {
      expect(tapPlugin.schema).toBe(tapToolSchema);
    });

    it('should use the same handler as exported constant', () => {
      expect(tapPlugin.handler).toBe(tapToolHandler);
    });
  });
});