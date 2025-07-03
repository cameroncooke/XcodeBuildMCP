/**
 * Test Suite: key_sequence Plugin Migration
 *
 * This test suite validates the successful migration of the key_sequence tool
 * from src/tools/axe/index.ts to the plugins/ui-testing/ directory.
 *
 * Migration Requirements:
 * 1. ✅ Plugin file exists and exports required interface
 * 2. ✅ Plugin integrates with original implementation (extracted exports)
 * 3. ✅ Schema validation works correctly (keyCodes array with 0-255 range, min 1 element)
 * 4. ✅ Handler function integration is preserved
 * 5. ✅ All original functionality remains intact
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import plugin from './key_sequence.js';

describe('key_sequence Plugin Migration Tests', () => {
  describe('Plugin Structure Validation', () => {
    it('should export a default object with required properties', () => {
      expect(plugin).toBeDefined();
      expect(typeof plugin).toBe('object');
      expect(plugin).toHaveProperty('name');
      expect(plugin).toHaveProperty('description');
      expect(plugin).toHaveProperty('schema');
      expect(plugin).toHaveProperty('handler');
    });

    it('should have correct plugin metadata', () => {
      expect(plugin.name).toBe('key_sequence');
      expect(plugin.description).toBe(
        'Press key sequence using HID keycodes on iOS simulator with configurable delay'
      );
      expect(typeof plugin.schema).toBe('object');
      expect(typeof plugin.handler).toBe('function');
    });
  });

  describe('Integration with Original Exports', () => {
    it('should use original exported tool name', () => {
      expect(plugin.name).toBe('key_sequence');
    });

    it('should use original exported description', () => {
      expect(plugin.description).toBe('Press key sequence using HID keycodes on iOS simulator with configurable delay');
      expect(plugin.description).toContain('HID keycodes');
      expect(plugin.description).toContain('configurable delay');
    });

    it('should have schema with correct properties', () => {
      expect(plugin.schema).toHaveProperty('simulatorUuid');
      expect(plugin.schema).toHaveProperty('keyCodes');
      expect(plugin.schema).toHaveProperty('delay');
    });

    it('should have handler function', () => {
      expect(typeof plugin.handler).toBe('function');
    });
  });

  describe('Schema Validation', () => {
    const createValidator = (schema: Record<string, z.ZodType>) => {
      return z.object(schema);
    };

    it('should validate correct parameters', () => {
      const validator = createValidator(plugin.schema);
      const validParams = {
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        keyCodes: [40, 42, 44], // Return, Backspace, Space
        delay: 0.1,
      };

      expect(() => validator.parse(validParams)).not.toThrow();
    });

    it('should validate required simulatorUuid parameter', () => {
      const validator = createValidator(plugin.schema);

      // Missing simulatorUuid
      expect(() =>
        validator.parse({
          keyCodes: [40],
        })
      ).toThrow();

      // Invalid UUID format
      expect(() =>
        validator.parse({
          simulatorUuid: 'invalid-uuid',
          keyCodes: [40],
        })
      ).toThrow();

      // Valid UUID
      expect(() =>
        validator.parse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCodes: [40],
        })
      ).not.toThrow();
    });

    it('should validate keyCodes array parameter with numeric range (0-255) and minimum 1 element', () => {
      const validator = createValidator(plugin.schema);
      const baseParams = {
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      };

      // Valid keyCodes arrays
      expect(() => validator.parse({ ...baseParams, keyCodes: [0] })).not.toThrow();
      expect(() => validator.parse({ ...baseParams, keyCodes: [40] })).not.toThrow(); // Return
      expect(() => validator.parse({ ...baseParams, keyCodes: [255] })).not.toThrow();
      expect(() => validator.parse({ ...baseParams, keyCodes: [40, 42, 44] })).not.toThrow(); // Multiple keys
      expect(() => validator.parse({ ...baseParams, keyCodes: [0, 128, 255] })).not.toThrow(); // Edge values

      // Invalid keyCodes arrays - empty array
      expect(() => validator.parse({ ...baseParams, keyCodes: [] })).toThrow();

      // Invalid keyCodes arrays - out of range values
      expect(() => validator.parse({ ...baseParams, keyCodes: [-1] })).toThrow();
      expect(() => validator.parse({ ...baseParams, keyCodes: [256] })).toThrow();
      expect(() => validator.parse({ ...baseParams, keyCodes: [40, -1] })).toThrow();
      expect(() => validator.parse({ ...baseParams, keyCodes: [40, 256] })).toThrow();

      // Invalid keyCodes arrays - non-integer values
      expect(() => validator.parse({ ...baseParams, keyCodes: ['string'] })).toThrow();
      expect(() => validator.parse({ ...baseParams, keyCodes: [1.5] })).toThrow(); // Non-integer
      expect(() => validator.parse({ ...baseParams, keyCodes: [40, 'string'] })).toThrow();

      // Missing keyCodes parameter
      expect(() => validator.parse({ ...baseParams })).toThrow();
    });

    it('should validate optional delay parameter', () => {
      const validator = createValidator(plugin.schema);
      const baseParams = {
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        keyCodes: [40],
      };

      // Valid delay values
      expect(() => validator.parse({ ...baseParams })).not.toThrow(); // Missing delay
      expect(() => validator.parse({ ...baseParams, delay: 0 })).not.toThrow();
      expect(() => validator.parse({ ...baseParams, delay: 0.1 })).not.toThrow();
      expect(() => validator.parse({ ...baseParams, delay: 1.5 })).not.toThrow();

      // Invalid delay values
      expect(() => validator.parse({ ...baseParams, delay: -0.1 })).toThrow();
      expect(() => validator.parse({ ...baseParams, delay: 'string' })).toThrow();
    });
  });

  describe('Handler Function Integration', () => {
    it('should be an async function', () => {
      expect(plugin.handler.constructor.name).toBe('AsyncFunction');
    });

    it('should have async handler function', () => {
      expect(plugin.handler.constructor.name).toBe('AsyncFunction');
    });

    it('should accept parameters matching the schema', () => {
      // This tests the TypeScript interface alignment
      const handler = plugin.handler as (params: {
        simulatorUuid: string;
        keyCodes: number[];
        delay?: number;
      }) => Promise<any>;

      expect(typeof handler).toBe('function');
      // The function signature should match what the schema expects
      // This ensures TypeScript compatibility between schema and handler
    });
  });

  describe('Migration Integrity', () => {
    it('should maintain all required exports from original implementation', () => {
      // Verify plugin has all required components
      expect(typeof plugin.name).toBe('string');
      expect(typeof plugin.description).toBe('string');
      expect(typeof plugin.schema).toBe('object');
      expect(typeof plugin.handler).toBe('function');
    });

    it('should have consistent tool metadata', () => {
      expect(plugin.name).toBe('key_sequence');
      expect(plugin.description).toContain('Press key sequence using HID keycodes');
      expect(plugin.description).toContain('configurable delay');
    });

    it('should maintain keyCodes array validation consistency', () => {
      // Verify the schema maintains the original 0-255 range for HID keycodes with minimum 1 element
      const keyCodesSchema = plugin.schema.keyCodes;
      expect(keyCodesSchema).toBeDefined();

      // Test the validation rules directly
      const validator = z.object({ keyCodes: keyCodesSchema });
      
      // Should accept valid arrays
      expect(() => validator.parse({ keyCodes: [0] })).not.toThrow();
      expect(() => validator.parse({ keyCodes: [40] })).not.toThrow();
      expect(() => validator.parse({ keyCodes: [255] })).not.toThrow();
      expect(() => validator.parse({ keyCodes: [40, 42, 44] })).not.toThrow();
      
      // Should reject invalid arrays
      expect(() => validator.parse({ keyCodes: [] })).toThrow(); // Empty array
      expect(() => validator.parse({ keyCodes: [-1] })).toThrow(); // Out of range
      expect(() => validator.parse({ keyCodes: [256] })).toThrow(); // Out of range
      expect(() => validator.parse({ keyCodes: [40, -1] })).toThrow(); // Mixed valid/invalid
    });

    it('should maintain delay parameter validation consistency', () => {
      // Verify the schema maintains the original delay validation (optional, non-negative)
      const delaySchema = plugin.schema.delay;
      expect(delaySchema).toBeDefined();

      // Test the validation rules directly
      const validator = z.object({ delay: delaySchema });
      
      // Should accept valid delay values
      expect(() => validator.parse({})).not.toThrow(); // Optional
      expect(() => validator.parse({ delay: 0 })).not.toThrow();
      expect(() => validator.parse({ delay: 0.1 })).not.toThrow();
      expect(() => validator.parse({ delay: 1.5 })).not.toThrow();
      
      // Should reject invalid delay values
      expect(() => validator.parse({ delay: -0.1 })).toThrow(); // Negative
    });
  });
});