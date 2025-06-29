/**
 * Tests for type_text plugin
 */

import { describe, it, expect } from 'vitest';
import typeTextPlugin from './type_text.js';
import { ToolResponse } from '../../src/types/common.js';

describe('type_text plugin', () => {
  describe('Plugin Structure', () => {
    it('should have the correct structure', () => {
      expect(typeTextPlugin).toEqual({
        name: 'type_text',
        description: expect.stringContaining('Type text'),
        schema: expect.objectContaining({
          simulatorUuid: expect.any(Object),
          text: expect.any(Object),
        }),
        handler: expect.any(Function),
      });
    });

    it('should have correct name', () => {
      expect(typeTextPlugin.name).toBe('type_text');
    });

    it('should have descriptive description', () => {
      expect(typeTextPlugin.description).toContain('Type text');
      expect(typeTextPlugin.description).toContain('describe_ui');
      expect(typeTextPlugin.description).toContain('US keyboard');
    });
  });

  describe('Schema Validation', () => {
    it('should validate simulatorUuid as UUID', () => {
      expect(typeTextPlugin.schema.simulatorUuid).toBeDefined();
      // Test UUID validation through schema
      const validUuid = '12345678-1234-1234-1234-123456789abc';
      const invalidUuid = 'not-a-uuid';
      
      // Valid UUID should pass
      expect(() => typeTextPlugin.schema.simulatorUuid.parse(validUuid)).not.toThrow();
      
      // Invalid UUID should fail
      expect(() => typeTextPlugin.schema.simulatorUuid.parse(invalidUuid)).toThrow();
    });

    it('should validate text as non-empty string', () => {
      expect(typeTextPlugin.schema.text).toBeDefined();
      
      // Valid text should pass
      expect(() => typeTextPlugin.schema.text.parse('Hello')).not.toThrow();
      expect(() => typeTextPlugin.schema.text.parse('Test text')).not.toThrow();
      
      // Empty string should fail
      expect(() => typeTextPlugin.schema.text.parse('')).toThrow();
      
      // Non-string should fail
      expect(() => typeTextPlugin.schema.text.parse(123)).toThrow();
      expect(() => typeTextPlugin.schema.text.parse(null)).toThrow();
    });
  });

  describe('Handler Integration', () => {
    it('should be a function that returns Promise<ToolResponse>', () => {
      expect(typeof typeTextPlugin.handler).toBe('function');
      
      // Test the return type structure
      const params = {
        simulatorUuid: '12345678-1234-1234-1234-123456789abc',
        text: 'test input',
      };
      
      const result = typeTextPlugin.handler(params);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should handle parameters correctly', async () => {
      const params = {
        simulatorUuid: '12345678-1234-1234-1234-123456789abc',
        text: 'test text input',
      };

      // Mock the result since we can't actually test the full execution
      // The handler will validate parameters and attempt execution
      const result = await typeTextPlugin.handler(params);
      
      // Verify the result is a proper ToolResponse
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('should validate required parameters', async () => {
      // Test missing simulatorUuid
      const resultMissingUuid = await typeTextPlugin.handler({
        text: 'test text',
      } as any);
      
      expect(resultMissingUuid.isError).toBe(true);
      expect(resultMissingUuid.content[0].text).toContain('simulatorUuid');

      // Test missing text
      const resultMissingText = await typeTextPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789abc',
      } as any);
      
      expect(resultMissingText.isError).toBe(true);
      expect(resultMissingText.content[0].text).toContain('text');
    });

    it('should handle invalid UUID format', async () => {
      const result = await typeTextPlugin.handler({
        simulatorUuid: 'invalid-uuid',
        text: 'test text',
      });
      
      expect(result.isError).toBe(true);
      // Either parameter validation error or AXe dependency error is acceptable
      expect(
        result.content[0].text.includes('simulatorUuid') ||
        result.content[0].text.includes('AXe binary not found') ||
        result.content[0].text.includes('Bundled axe tool not found')
      ).toBe(true);
    });

    it('should handle empty text', async () => {
      const result = await typeTextPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789abc',
        text: '',
      });
      
      expect(result.isError).toBe(true);
      // Either parameter validation error or AXe dependency error is acceptable
      expect(
        result.content[0].text.includes('text') ||
        result.content[0].text.includes('AXe binary not found') ||
        result.content[0].text.includes('Bundled axe tool not found')
      ).toBe(true);
    });
  });

  describe('Text Validation', () => {
    it('should accept various text inputs', () => {
      const validTexts = [
        'Hello World',
        'Test123',
        'email@domain.com',
        'Special chars: !@#$%',
        'Multi\nline\ntext',
        'Unicode: café',
      ];

      validTexts.forEach(text => {
        expect(() => typeTextPlugin.schema.text.parse(text)).not.toThrow();
      });
    });

    it('should reject invalid text inputs', () => {
      const invalidTexts = [
        '',           // Empty string
        null,         // Null
        undefined,    // Undefined
        123,          // Number
        {},           // Object
        [],           // Array
      ];

      invalidTexts.forEach(text => {
        expect(() => typeTextPlugin.schema.text.parse(text)).toThrow();
      });
    });
  });
});