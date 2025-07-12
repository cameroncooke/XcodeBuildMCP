/**
 * Tests for type_text plugin
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { EventEmitter } from 'events';

// Mock only child_process.spawn at the lowest level
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'child_process';

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 12345;
}

import { z } from 'zod';
import typeTextPlugin from '../type_text.ts';

// Mock all utilities from the index module
// Import mocked functions
describe('Type Text Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProcess = new MockChildProcess();
    vi.mocked(spawn).mockReturnValue(mockProcess as any);
    vi.clearAllMocks();
  });

  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(typeTextPlugin.name).toBe('type_text');
    });

    it('should have correct description', () => {
      expect(typeTextPlugin.description).toBe(
        'Type text (supports US keyboard characters). Use describe_ui to find text field, tap to focus, then type.',
      );
    });

    it('should have handler function', () => {
      expect(typeof typeTextPlugin.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(typeTextPlugin.schema);

      // Valid case
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          text: 'Hello World',
        }).success,
      ).toBe(true);

      // Invalid simulatorUuid
      expect(
        schema.safeParse({
          simulatorUuid: 'invalid-uuid',
          text: 'Hello World',
        }).success,
      ).toBe(false);

      // Invalid text - empty string
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          text: '',
        }).success,
      ).toBe(false);

      // Invalid text - non-string
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          text: 123,
        }).success,
      ).toBe(false);

      // Missing required fields
      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return error for missing simulatorUuid', async () => {
      // TODO: Remove mocked utility - test integration flow instead

      const result = await typeTextPlugin.handler({
        text: 'Hello World',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: simulatorUuid' }],
        isError: true,
      });
    });

    it('should return error for missing text', async () => {
      // TODO: Remove mocked utility - test integration flow instead

      const result = await typeTextPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Missing required parameter: text' }],
        isError: true,
      });
    });

    it('should return success for valid text typing', async () => {
      // TODO: Remove mocked utility - test integration flow instead
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/path/to/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        { AXE_PATH: '/path/to/axe' },
      );
      // TODO: Remove mocked utility - test integration flow instead
      (createTextResponse as MockedFunction<typeof createTextResponse>).mockReturnValue({
        content: [{ type: 'text', text: 'Text typing simulated successfully.' }],
      });

      const result = await typeTextPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        text: 'Hello World',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Text typing simulated successfully.' }],
      });
    });

    it('should handle DependencyError when axe binary not found', async () => {
      // TODO: Remove mocked utility - test integration flow instead
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue(null);
      (
        createAxeNotAvailableResponse as MockedFunction<typeof createAxeNotAvailableResponse>
      ).mockReturnValue({
        content: [
          {
            type: 'text',
            text: 'AXe binary not found. Please install AXe to use UI testing features.',
          },
        ],
        isError: true,
      });

      const result = await typeTextPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        text: 'Hello World',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'AXe binary not found. Please install AXe to use UI testing features.',
          },
        ],
        isError: true,
      });
    });

    it('should handle AxeError from command execution', async () => {
      // TODO: Remove mocked utility - test integration flow instead
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/path/to/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        { AXE_PATH: '/path/to/axe' },
      );
      // TODO: Remove mocked utility - test integration flow instead
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [
          { type: 'text', text: "Failed to simulate text typing: axe command 'type' failed." },
        ],
        isError: true,
      });

      const result = await typeTextPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        text: 'Hello World',
      });

      expect(result).toEqual({
        content: [
          { type: 'text', text: "Failed to simulate text typing: axe command 'type' failed." },
        ],
        isError: true,
      });
    });

    it('should handle SystemError from command execution', async () => {
      // TODO: Remove mocked utility - test integration flow instead
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/path/to/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        { AXE_PATH: '/path/to/axe' },
      );
      // TODO: Remove mocked utility - test integration flow instead
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [{ type: 'text', text: 'System error executing axe: System error occurred' }],
        isError: true,
      });

      const result = await typeTextPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        text: 'Hello World',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'System error executing axe: System error occurred' }],
        isError: true,
      });
    });

    it('should handle unexpected Error objects', async () => {
      // TODO: Remove mocked utility - test integration flow instead
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/path/to/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        { AXE_PATH: '/path/to/axe' },
      );
      // TODO: Remove mocked utility - test integration flow instead
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [{ type: 'text', text: 'An unexpected error occurred: Unexpected error' }],
        isError: true,
      });

      const result = await typeTextPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        text: 'Hello World',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'An unexpected error occurred: Unexpected error' }],
        isError: true,
      });
    });

    it('should handle unexpected string errors', async () => {
      // TODO: Remove mocked utility - test integration flow instead
      (getAxePath as MockedFunction<typeof getAxePath>).mockReturnValue('/path/to/axe');
      (getBundledAxeEnvironment as MockedFunction<typeof getBundledAxeEnvironment>).mockReturnValue(
        { AXE_PATH: '/path/to/axe' },
      );
      // TODO: Remove mocked utility - test integration flow instead
      (createErrorResponse as MockedFunction<typeof createErrorResponse>).mockReturnValue({
        content: [{ type: 'text', text: 'An unexpected error occurred: String error' }],
        isError: true,
      });

      const result = await typeTextPlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        text: 'Hello World',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'An unexpected error occurred: String error' }],
        isError: true,
      });
    });
  });
});
