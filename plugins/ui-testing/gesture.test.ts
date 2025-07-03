/**
 * Tests for gesture tool plugin
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import gesturePlugin from './gesture.ts';
import { ToolResponse } from '../../src/types/common.ts';

// Mock the dependencies
vi.mock('../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

vi.mock('../../src/utils/command.ts', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('../../src/utils/axe-helpers.ts', () => ({
  areAxeToolsAvailable: vi.fn(() => true),
  getAxePath: vi.fn(() => '/usr/local/bin/axe'),
  getBundledAxeEnvironment: vi.fn(() => ({})),
  createAxeNotAvailableResponse: vi.fn(() => ({
    content: [{ type: 'text', text: 'AXe tools not available' }],
    isError: true,
  })),
}));

vi.mock('../../src/utils/validation.ts', () => ({
  validateRequiredParam: vi.fn((name: string, value: any) => {
    if (value === undefined || value === null || value === '') {
      return {
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: `Missing required parameter: ${name}` }],
          isError: true,
        },
      };
    }
    return { isValid: true };
  }),
  createTextResponse: vi.fn((text: string) => ({
    content: [{ type: 'text', text }],
    isError: false,
  })),
}));

vi.mock('../../src/utils/errors.ts', () => ({
  DependencyError: class DependencyError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'DependencyError';
    }
  },
  AxeError: class AxeError extends Error {
    constructor(message: string, public commandName: string, public axeOutput: string, public simulatorUuid: string) {
      super(message);
      this.name = 'AxeError';
    }
  },
  SystemError: class SystemError extends Error {
    constructor(message: string, public originalError?: Error) {
      super(message);
      this.name = 'SystemError';
    }
  },
  createErrorResponse: vi.fn((message: string, details?: string, errorType?: string) => ({
    content: [{ type: 'text', text: `Error: ${message}` }],
    isError: true,
  })),
}));

describe('Gesture Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Plugin Structure', () => {
    it('should export correct plugin structure', () => {
      expect(gesturePlugin).toHaveProperty('name');
      expect(gesturePlugin).toHaveProperty('description');
      expect(gesturePlugin).toHaveProperty('schema');
      expect(gesturePlugin).toHaveProperty('handler');
    });

    it('should have correct tool name', () => {
      expect(gesturePlugin.name).toBe('gesture');
    });

    it('should have meaningful description', () => {
      expect(gesturePlugin.description).toContain('gesture');
      expect(gesturePlugin.description).toContain('preset');
      expect(gesturePlugin.description).toContain('simulator');
    });

    it('should have valid schema structure', () => {
      expect(gesturePlugin.schema).toHaveProperty('simulatorUuid');
      expect(gesturePlugin.schema).toHaveProperty('preset');
      expect(gesturePlugin.schema).toHaveProperty('screenWidth');
      expect(gesturePlugin.schema).toHaveProperty('screenHeight');
      expect(gesturePlugin.schema).toHaveProperty('duration');
      expect(gesturePlugin.schema).toHaveProperty('delta');
      expect(gesturePlugin.schema).toHaveProperty('preDelay');
      expect(gesturePlugin.schema).toHaveProperty('postDelay');
    });

    it('should have async handler function', () => {
      expect(typeof gesturePlugin.handler).toBe('function');
      expect(gesturePlugin.handler.constructor.name).toBe('AsyncFunction');
    });
  });

  describe('Schema Validation', () => {
    const schema = z.object(gesturePlugin.schema);

    it('should validate required parameters', () => {
      const validParams = {
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        preset: 'scroll-up',
      };

      expect(() => schema.parse(validParams)).not.toThrow();
    });

    it('should require simulatorUuid', () => {
      const invalidParams = {
        preset: 'scroll-up',
      };

      expect(() => schema.parse(invalidParams)).toThrow();
    });

    it('should validate simulatorUuid format', () => {
      const invalidParams = {
        simulatorUuid: 'invalid-uuid',
        preset: 'scroll-up',
      };

      expect(() => schema.parse(invalidParams)).toThrow();
    });

    it('should require preset parameter', () => {
      const invalidParams = {
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      };

      expect(() => schema.parse(invalidParams)).toThrow();
    });

    it('should validate preset enum values', () => {
      const validPresets = [
        'scroll-up',
        'scroll-down',
        'scroll-left',
        'scroll-right',
        'swipe-from-left-edge',
        'swipe-from-right-edge',
        'swipe-from-top-edge',
        'swipe-from-bottom-edge',
      ];

      validPresets.forEach(preset => {
        const params = {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          preset,
        };
        expect(() => schema.parse(params)).not.toThrow();
      });
    });

    it('should reject invalid preset values', () => {
      const invalidParams = {
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        preset: 'invalid-preset',
      };

      expect(() => schema.parse(invalidParams)).toThrow();
    });

    it('should validate optional screen dimensions', () => {
      const validParams = {
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        preset: 'scroll-up',
        screenWidth: 375,
        screenHeight: 667,
      };

      expect(() => schema.parse(validParams)).not.toThrow();
    });

    it('should reject negative screen dimensions', () => {
      const invalidWidth = {
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        preset: 'scroll-up',
        screenWidth: 0,
      };

      const invalidHeight = {
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        preset: 'scroll-up',
        screenHeight: 0,
      };

      expect(() => schema.parse(invalidWidth)).toThrow();
      expect(() => schema.parse(invalidHeight)).toThrow();
    });

    it('should validate optional timing parameters', () => {
      const validParams = {
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        preset: 'scroll-up',
        duration: 1.5,
        delta: 100,
        preDelay: 0.5,
        postDelay: 0.2,
      };

      expect(() => schema.parse(validParams)).not.toThrow();
    });

    it('should reject negative timing parameters', () => {
      const testCases = [
        { duration: -1 },
        { delta: -1 },
        { preDelay: -1 },
        { postDelay: -1 },
      ];

      testCases.forEach(params => {
        const invalidParams = {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          preset: 'scroll-up',
          ...params,
        };

        expect(() => schema.parse(invalidParams)).toThrow();
      });
    });

    it('should accept zero values for timing parameters', () => {
      const validParams = {
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        preset: 'scroll-up',
        duration: 0,
        delta: 0,
        preDelay: 0,
        postDelay: 0,
      };

      expect(() => schema.parse(validParams)).not.toThrow();
    });
  });

  describe('Handler Integration', () => {
    it('should return error for missing simulatorUuid', async () => {
      const params = {
        preset: 'scroll-up',
      };

      const result = await gesturePlugin.handler(params as any);
      expect(result.isError).toBe(true);
    });

    it('should return error for missing preset', async () => {
      const params = {
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      };

      const result = await gesturePlugin.handler(params as any);
      expect(result.isError).toBe(true);
    });

    it('should handle valid gesture execution', async () => {
      // Mock successful command execution
      const { executeCommand } = await import('../../src/utils/command.ts');
      (executeCommand as any).mockResolvedValue({
        success: true,
        output: 'gesture completed',
        error: '',
      });

      const params = {
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        preset: 'scroll-up',
      };

      const result = await gesturePlugin.handler(params);
      expect(result.isError).toBe(false);
    });

    it('should handle gesture execution with all optional parameters', async () => {
      // Mock successful command execution
      const { executeCommand } = await import('../../src/utils/command.ts');
      (executeCommand as any).mockResolvedValue({
        success: true,
        output: 'gesture completed',
        error: '',
      });

      const params = {
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        preset: 'swipe-from-left-edge',
        screenWidth: 375,
        screenHeight: 667,
        duration: 1.0,
        delta: 50,
        preDelay: 0.1,
        postDelay: 0.2,
      };

      const result = await gesturePlugin.handler(params);
      expect(result.isError).toBe(false);
    });
  });

  describe('Preset Gesture Types', () => {
    const schema = z.object(gesturePlugin.schema);

    it('should support all scroll gestures', () => {
      const scrollGestures = ['scroll-up', 'scroll-down', 'scroll-left', 'scroll-right'];
      
      scrollGestures.forEach(preset => {
        const params = {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          preset,
        };
        expect(() => schema.parse(params)).not.toThrow();
      });
    });

    it('should support all edge swipe gestures', () => {
      const edgeSwipes = [
        'swipe-from-left-edge',
        'swipe-from-right-edge',
        'swipe-from-top-edge',
        'swipe-from-bottom-edge',
      ];
      
      edgeSwipes.forEach(preset => {
        const params = {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          preset,
        };
        expect(() => schema.parse(params)).not.toThrow();
      });
    });

    it('should have exactly 8 preset options', () => {
      const presetEnum = gesturePlugin.schema.preset;
      // Get the enum options from zod schema
      expect(presetEnum._def.values).toHaveLength(8);
    });
  });
});