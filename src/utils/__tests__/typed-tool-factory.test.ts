/**
 * Tests for the createTypedTool factory
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createTypedTool } from '../typed-tool-factory.ts';
import { createMockExecutor } from '../../test-utils/mock-executors.ts';
import { ToolResponse } from '../../types/common.ts';

// Test schema and types
const testSchema = z.object({
  requiredParam: z.string().describe('A required string parameter'),
  optionalParam: z.number().optional().describe('An optional number parameter'),
});

type TestParams = z.infer<typeof testSchema>;

// Mock logic function for testing
async function testLogic(params: TestParams): Promise<ToolResponse> {
  return {
    content: [{ type: 'text', text: `Logic executed with: ${params.requiredParam}` }],
    isError: false,
  };
}

describe('createTypedTool', () => {
  describe('Type Safety and Validation', () => {
    it('should accept valid parameters and call logic function', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'test' });
      const handler = createTypedTool(testSchema, testLogic, () => mockExecutor);

      const result = await handler({
        requiredParam: 'valid-value',
        optionalParam: 42,
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Logic executed with: valid-value');
    });

    it('should reject parameters with missing required fields', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'test' });
      const handler = createTypedTool(testSchema, testLogic, () => mockExecutor);

      const result = await handler({
        // Missing requiredParam
        optionalParam: 42,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('requiredParam');
    });

    it('should reject parameters with wrong types', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'test' });
      const handler = createTypedTool(testSchema, testLogic, () => mockExecutor);

      const result = await handler({
        requiredParam: 123, // Should be string, not number
        optionalParam: 42,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Parameter validation failed');
      expect(result.content[0].text).toContain('requiredParam');
    });

    it('should accept parameters with only required fields', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'test' });
      const handler = createTypedTool(testSchema, testLogic, () => mockExecutor);

      const result = await handler({
        requiredParam: 'valid-value',
        // optionalParam omitted
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Logic executed with: valid-value');
    });

    it('should provide detailed validation error messages', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'test' });
      const handler = createTypedTool(testSchema, testLogic, () => mockExecutor);

      const result = await handler({
        requiredParam: 123, // Wrong type
        optionalParam: 'should-be-number', // Wrong type
      });

      expect(result.isError).toBe(true);
      const errorText = result.content[0].text;
      expect(errorText).toContain('Parameter validation failed');
      expect(errorText).toContain('requiredParam');
      expect(errorText).toContain('optionalParam');
    });
  });

  describe('Error Handling', () => {
    it('should re-throw non-Zod errors from logic function', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'test' });

      // Logic function that throws a non-Zod error
      async function errorLogic(): Promise<ToolResponse> {
        throw new Error('Unexpected error');
      }

      const handler = createTypedTool(testSchema, errorLogic, () => mockExecutor);

      await expect(handler({ requiredParam: 'valid' })).rejects.toThrow('Unexpected error');
    });
  });

  describe('Executor Integration', () => {
    it('should pass the provided executor to logic function', async () => {
      const mockExecutor = createMockExecutor({ success: true, output: 'test' });

      async function executorTestLogic(params: TestParams, executor: any): Promise<ToolResponse> {
        // Verify executor is passed correctly
        expect(executor).toBe(mockExecutor);
        return {
          content: [{ type: 'text', text: 'Executor passed correctly' }],
          isError: false,
        };
      }

      const handler = createTypedTool(testSchema, executorTestLogic, () => mockExecutor);

      const result = await handler({ requiredParam: 'valid' });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe('Executor passed correctly');
    });
  });
});
