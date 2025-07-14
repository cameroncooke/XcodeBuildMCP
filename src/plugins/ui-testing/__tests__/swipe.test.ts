/**
 * Tests for swipe tool plugin
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createMockExecutor } from '../../../utils/command.js';
import { SystemError, DependencyError } from '../../../utils/index.js';

// Import the plugin module to test
import swipePlugin from '../swipe.ts';

describe('Swipe Plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(swipePlugin.name).toBe('swipe');
    });

    it('should have correct description', () => {
      expect(swipePlugin.description).toBe(
        "Swipe from one point to another. Use describe_ui for precise coordinates (don't guess from screenshots). Supports configurable timing.",
      );
    });

    it('should have handler function', () => {
      expect(typeof swipePlugin.handler).toBe('function');
    });

    it('should validate schema fields with safeParse', () => {
      const schema = z.object(swipePlugin.schema);

      // Valid case
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
        }).success,
      ).toBe(true);

      // Invalid simulatorUuid
      expect(
        schema.safeParse({
          simulatorUuid: 'invalid-uuid',
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
        }).success,
      ).toBe(false);

      // Invalid x1 (not integer)
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 100.5,
          y1: 200,
          x2: 300,
          y2: 400,
        }).success,
      ).toBe(false);

      // Valid with optional parameters
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
          duration: 1.5,
          delta: 10,
          preDelay: 0.5,
          postDelay: 0.2,
        }).success,
      ).toBe(true);

      // Invalid duration (negative)
      expect(
        schema.safeParse({
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
          duration: -1,
        }).success,
      ).toBe(false);
    });
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return error for missing simulatorUuid', async () => {
      const result = await swipePlugin.handler({ x1: 100, y1: 200, x2: 300, y2: 400 });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'simulatorUuid' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return error for missing x1', async () => {
      const result = await swipePlugin.handler({
        simulatorUuid: '12345678-1234-1234-1234-123456789012',
        y1: 200,
        x2: 300,
        y2: 400,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'x1' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return success for valid swipe execution', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'swipe completed',
        error: '',
      });

      const mockDependencies = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'AXe tools not available' }],
          isError: true,
        }),
      };

      const result = await swipePlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
        },
        mockExecutor,
        mockDependencies,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Swipe from (100, 200) to (300, 400) simulated successfully.\n\nWarning: describe_ui has not been called yet. Consider using describe_ui for precise coordinates instead of guessing from screenshots.',
          },
        ],
        isError: false,
      });
    });

    it('should return success for swipe with duration', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'swipe completed',
        error: '',
      });

      const mockDependencies = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'AXe tools not available' }],
          isError: true,
        }),
      };

      const result = await swipePlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
          duration: 1.5,
        },
        mockExecutor,
        mockDependencies,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Swipe from (100, 200) to (300, 400) duration=1.5s simulated successfully.\n\nWarning: describe_ui has not been called yet. Consider using describe_ui for precise coordinates instead of guessing from screenshots.',
          },
        ],
        isError: false,
      });
    });

    it('should handle DependencyError when axe is not available', async () => {
      const mockExecutor = createMockExecutor({
        success: true,
        output: 'swipe completed',
        error: '',
      });

      const mockDependencies = {
        getAxePath: () => null, // Simulate axe not available
        getBundledAxeEnvironment: () => ({}),
        createAxeNotAvailableResponse: () => ({
          content: [
            {
              type: 'text',
              text: 'AXe tools are not available. Please install AXe tools using the install_axe tool.',
            },
          ],
          isError: true,
        }),
      };

      const result = await swipePlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
        },
        mockExecutor,
        mockDependencies,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'AXe tools are not available. Please install AXe tools using the install_axe tool.',
          },
        ],
        isError: true,
      });
    });

    it('should handle AxeError from failed command execution', async () => {
      const mockExecutor = createMockExecutor({
        success: false,
        output: '',
        error: 'axe command failed',
      });

      const mockDependencies = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'AXe tools not available' }],
          isError: true,
        }),
      };

      const result = await swipePlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
        },
        mockExecutor,
        mockDependencies,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Error: Failed to simulate swipe: axe command 'swipe' failed.\nDetails: axe command failed",
          },
        ],
        isError: true,
      });
    });

    it('should handle SystemError from command execution', async () => {
      // Override the executor to throw SystemError for this test
      const systemErrorExecutor = async () => {
        throw new SystemError('System error occurred');
      };

      const mockDependencies = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'AXe tools not available' }],
          isError: true,
        }),
      };

      const result = await swipePlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
        },
        systemErrorExecutor,
        mockDependencies,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain(
        'Error: System error executing axe: Failed to execute axe command: System error occurred',
      );
      expect(result.content[0].text).toContain('Details: SystemError: System error occurred');
    });

    it('should handle unexpected Error objects', async () => {
      // Override the executor to throw an unexpected Error for this test
      const unexpectedErrorExecutor = async () => {
        throw new Error('Unexpected error');
      };

      const mockDependencies = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'AXe tools not available' }],
          isError: true,
        }),
      };

      const result = await swipePlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
        },
        unexpectedErrorExecutor,
        mockDependencies,
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain(
        'Error: System error executing axe: Failed to execute axe command: Unexpected error',
      );
      expect(result.content[0].text).toContain('Details: Error: Unexpected error');
    });

    it('should handle unexpected string errors', async () => {
      // Override the executor to throw a string error for this test
      const stringErrorExecutor = async () => {
        throw 'String error';
      };

      const mockDependencies = {
        getAxePath: () => '/usr/local/bin/axe',
        getBundledAxeEnvironment: () => ({}),
        createAxeNotAvailableResponse: () => ({
          content: [{ type: 'text', text: 'AXe tools not available' }],
          isError: true,
        }),
      };

      const result = await swipePlugin.handler(
        {
          simulatorUuid: '12345678-1234-1234-1234-123456789012',
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 400,
        },
        stringErrorExecutor,
        mockDependencies,
      );

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: System error executing axe: Failed to execute axe command: String error',
          },
        ],
        isError: true,
      });
    });
  });
});
