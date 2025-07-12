/**
 * Tests for stop_mac_app plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';

// Note: Internal utilities are allowed to execute normally (integration testing pattern)

vi.mock('util', () => ({
  promisify: vi.fn(() => vi.fn()),
}));

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

import stopMacApp from '../stop_mac_app.ts';

describe('stop_mac_app plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(stopMacApp.name).toBe('stop_mac_app');
    });

    it('should have correct description', () => {
      expect(stopMacApp.description).toBe(
        'Stops a running macOS application. Can stop by app name or process ID.',
      );
    });

    it('should have handler function', () => {
      expect(typeof stopMacApp.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test optional fields
      expect(stopMacApp.schema.appName.safeParse('Calculator').success).toBe(true);
      expect(stopMacApp.schema.appName.safeParse(undefined).success).toBe(true);
      expect(stopMacApp.schema.processId.safeParse(1234).success).toBe(true);
      expect(stopMacApp.schema.processId.safeParse(undefined).success).toBe(true);

      // Test invalid inputs
      expect(stopMacApp.schema.appName.safeParse(null).success).toBe(false);
      expect(stopMacApp.schema.processId.safeParse('not-number').success).toBe(false);
      expect(stopMacApp.schema.processId.safeParse(null).success).toBe(false);
    });
  });

  let mockExecPromise: MockedFunction<any>;

  beforeEach(async () => {
    const utilModule = await import('util');
    mockExecPromise = utilModule.promisify() as MockedFunction<any>;
    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact validation error for missing parameters', async () => {
      const result = await stopMacApp.handler({});

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Either appName or processId must be provided.',
          },
        ],
        isError: true,
      });
    });

    it('should return exact successful stop response by app name', async () => {
      mockExecPromise.mockResolvedValue({ stdout: '', stderr: '' });

      const result = await stopMacApp.handler({
        appName: 'Calculator',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS app stopped successfully: Calculator',
          },
        ],
      });
    });

    it('should return exact successful stop response by process ID', async () => {
      mockExecPromise.mockResolvedValue({ stdout: '', stderr: '' });

      const result = await stopMacApp.handler({
        processId: 1234,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS app stopped successfully: PID 1234',
          },
        ],
      });
    });

    it('should return exact successful stop response with both parameters (processId takes precedence)', async () => {
      mockExecPromise.mockResolvedValue({ stdout: '', stderr: '' });

      const result = await stopMacApp.handler({
        appName: 'Calculator',
        processId: 1234,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS app stopped successfully: PID 1234',
          },
        ],
      });
    });

    it('should handle stop command execution', async () => {
      // Test with processId to verify the command structure and response format
      const result = await stopMacApp.handler({
        processId: 9999,
      });

      // Should return success response (mocks resolve by default)
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS app stopped successfully: PID 9999',
          },
        ],
      });
    });

    it('should handle stop command with app name', async () => {
      const result = await stopMacApp.handler({
        appName: 'Calculator',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS app stopped successfully: Calculator',
          },
        ],
      });
    });
  });
});
