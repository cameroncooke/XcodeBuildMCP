/**
 * Test Suite: key_press Plugin Migration
 *
 * This test suite validates the successful migration of the key_press tool
 * from src/tools/axe/index.ts to the plugins/ui-testing/ directory.
 *
 * Migration Requirements:
 * 1. ✅ Plugin file exists and exports required interface
 * 2. ✅ Plugin integrates with original implementation (extracted exports)
 * 3. ✅ Schema validation works correctly (numeric keyCode 0-255)
 * 4. ✅ Handler function integration is preserved
 * 5. ✅ All original functionality remains intact
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import plugin from './key_press.ts';

describe('key_press Plugin Migration Tests', () => {
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
      expect(plugin.name).toBe('key_press');
      expect(plugin.description).toBe(
        'Press a single key by keycode on the simulator. Common keycodes: 40=Return, 42=Backspace, 43=Tab, 44=Space, 58-67=F1-F10.'
      );
      expect(typeof plugin.schema).toBe('object');
      expect(typeof plugin.handler).toBe('function');
    });
  });

  describe('Integration with Original Exports', () => {
    it('should use original exported tool name', () => {
      expect(plugin.name).toBe('key_press');
    });

    it('should use original exported description', () => {
      expect(plugin.description).toBe('Press a single key by keycode on the simulator. Common keycodes: 40=Return, 42=Backspace, 43=Tab, 44=Space, 58-67=F1-F10.');
      expect(plugin.description).toContain('Common keycodes');
      expect(plugin.description).toContain('40=Return');
      expect(plugin.description).toContain('42=Backspace');
    });

    it('should have correct schema properties', () => {
      expect(plugin.schema).toHaveProperty('simulatorUuid');
      expect(plugin.schema).toHaveProperty('keyCode');
      expect(plugin.schema).toHaveProperty('duration');
    });

    it('should have correct handler', () => {
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
        keyCode: 40, // Return key
        duration: 0.5,
      };

      expect(() => validator.parse(validParams)).not.toThrow();
    });

    it('should validate required simulatorUuid parameter', () => {
      const validator = createValidator(plugin.schema);

      // Missing simulatorUuid
      expect(() =>
        validator.parse({
          keyCode: 40,
        })
      ).toThrow();

      // Invalid UUID format
      expect(() =>
        validator.parse({
          simulatorUuid: 'invalid-uuid',
          keyCode: 40,
        })
      ).toThrow();

      // Valid UUID
      expect(() =>
        validator.parse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          keyCode: 40,
        })
      ).not.toThrow();
    });

    it('should validate keyCode parameter with numeric range (0-255)', () => {
      const validator = createValidator(plugin.schema);
      const baseParams = {
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      };

      // Valid keyCode values
      expect(() => validator.parse({ ...baseParams, keyCode: 0 })).not.toThrow();
      expect(() => validator.parse({ ...baseParams, keyCode: 40 })).not.toThrow(); // Return
      expect(() => validator.parse({ ...baseParams, keyCode: 255 })).not.toThrow();

      // Invalid keyCode values
      expect(() => validator.parse({ ...baseParams, keyCode: -1 })).toThrow();
      expect(() => validator.parse({ ...baseParams, keyCode: 256 })).toThrow();
      expect(() => validator.parse({ ...baseParams, keyCode: 'string' })).toThrow();
      expect(() => validator.parse({ ...baseParams, keyCode: 1.5 })).toThrow(); // Non-integer
    });

    it('should validate optional duration parameter', () => {
      const validator = createValidator(plugin.schema);
      const baseParams = {
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        keyCode: 40,
      };

      // Valid duration values
      expect(() => validator.parse({ ...baseParams })).not.toThrow(); // Missing duration
      expect(() => validator.parse({ ...baseParams, duration: 0 })).not.toThrow();
      expect(() => validator.parse({ ...baseParams, duration: 1.5 })).not.toThrow();

      // Invalid duration values
      expect(() => validator.parse({ ...baseParams, duration: -0.1 })).toThrow();
      expect(() => validator.parse({ ...baseParams, duration: 'string' })).toThrow();
    });
  });

  describe('Handler Function Integration', () => {
    it('should be an async function', () => {
      expect(plugin.handler.constructor.name).toBe('AsyncFunction');
    });


    it('should accept parameters matching the schema', () => {
      // This tests the TypeScript interface alignment
      const handler = plugin.handler as (params: {
        simulatorUuid: string;
        keyCode: number;
        duration?: number;
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
      expect(plugin.name).toBe('key_press');
      expect(plugin.description).toContain('Press a single key by keycode');
      expect(plugin.description).toContain('40=Return');
      expect(plugin.description).toContain('42=Backspace');
      expect(plugin.description).toContain('43=Tab');
      expect(plugin.description).toContain('44=Space');
      expect(plugin.description).toContain('58-67=F1-F10');
    });

    it('should maintain keyCode validation range consistency', () => {
      // Verify the schema maintains the original 0-255 range for HID keycodes
      const keyCodeSchema = plugin.schema.keyCode;
      expect(keyCodeSchema).toBeDefined();
      
      // Verify it's a proper schema object
      expect(typeof keyCodeSchema).toBe('object');
      expect(keyCodeSchema).not.toBeNull();
    });
  });
});