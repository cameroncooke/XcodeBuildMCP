/**
 * Tests for launch_mac_app plugin
 * Following CLAUDE.md testing standards with literal validation
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';
import launchMacApp from './launch_mac_app.ts';

// Mock external dependencies
vi.mock('../../src/utils/index.js', () => ({
  log: vi.fn(),
  validateRequiredParam: vi.fn(),
  validateFileExists: vi.fn(),
}));

vi.mock('util', () => ({
  promisify: vi.fn(() => vi.fn()),
}));

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

describe('launch_mac_app plugin', () => {
  describe('Export Field Validation (Literal)', () => {
    it('should have correct name', () => {
      expect(launchMacApp.name).toBe('launch_mac_app');
    });

    it('should have correct description', () => {
      expect(launchMacApp.description).toBe(
        "Launches a macOS application. IMPORTANT: You MUST provide the appPath parameter. Example: launch_mac_app({ appPath: '/path/to/your/app.app' }) Note: In some environments, this tool may be prefixed as mcp0_launch_macos_app.",
      );
    });

    it('should have handler function', () => {
      expect(typeof launchMacApp.handler).toBe('function');
    });

    it('should validate schema correctly', () => {
      // Test required fields
      expect(launchMacApp.schema.appPath.safeParse('/Applications/Calculator.app').success).toBe(
        true,
      );

      // Test optional fields
      expect(launchMacApp.schema.args.safeParse(['--verbose', '--debug']).success).toBe(true);
      expect(launchMacApp.schema.args.safeParse(undefined).success).toBe(true);

      // Test invalid inputs
      expect(launchMacApp.schema.appPath.safeParse(null).success).toBe(false);
      expect(launchMacApp.schema.appPath.safeParse(null).success).toBe(false);
      expect(launchMacApp.schema.args.safeParse('not-array').success).toBe(false);
      expect(launchMacApp.schema.args.safeParse([123]).success).toBe(false);
    });
  });

  let mockValidateRequiredParam: MockedFunction<any>;
  let mockValidateFileExists: MockedFunction<any>;
  let mockExecPromise: MockedFunction<any>;

  beforeEach(async () => {
    const utils = await import('../../src/utils/index.js');
    const utilModule = await import('util');

    mockValidateRequiredParam = utils.validateRequiredParam as MockedFunction<any>;
    mockValidateFileExists = utils.validateFileExists as MockedFunction<any>;
    mockExecPromise = utilModule.promisify() as MockedFunction<any>;

    vi.clearAllMocks();
  });

  describe('Handler Behavior (Complete Literal Returns)', () => {
    it('should return exact validation error for missing appPath', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: false,
        errorResponse: {
          content: [
            {
              type: 'text',
              text: "Required parameter 'appPath' is missing. Please provide a value for this parameter.",
            },
          ],
          isError: true,
        },
      });

      const result = await launchMacApp.handler({});

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Required parameter 'appPath' is missing. Please provide a value for this parameter.",
          },
        ],
        isError: true,
      });
    });

    it('should return exact validation error for non-existent file', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockValidateFileExists.mockResolvedValue({
        isValid: false,
        errorResponse: {
          content: [
            {
              type: 'text',
              text: 'File does not exist: /Applications/NonExistent.app',
            },
          ],
          isError: true,
        },
      });

      const result = await launchMacApp.handler({
        appPath: '/Applications/NonExistent.app',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'File does not exist: /Applications/NonExistent.app',
          },
        ],
        isError: true,
      });
    });

    it('should return exact successful launch response', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockValidateFileExists.mockResolvedValue({ isValid: true });
      mockExecPromise.mockResolvedValue({ stdout: '', stderr: '' });

      const result = await launchMacApp.handler({
        appPath: '/Applications/Calculator.app',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS app launched successfully: /Applications/Calculator.app',
          },
        ],
      });
    });

    it('should return exact successful launch response with args', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockValidateFileExists.mockResolvedValue({ isValid: true });
      mockExecPromise.mockResolvedValue({ stdout: '', stderr: '' });

      const result = await launchMacApp.handler({
        appPath: '/Applications/MyApp.app',
        args: ['--verbose', '--debug'],
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS app launched successfully: /Applications/MyApp.app',
          },
        ],
      });
    });

    it('should handle launch command execution', async () => {
      mockValidateRequiredParam.mockReturnValue({ isValid: true });
      mockValidateFileExists.mockResolvedValue({ isValid: true });

      const result = await launchMacApp.handler({
        appPath: '/Applications/Calculator.app',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '✅ macOS app launched successfully: /Applications/Calculator.app',
          },
        ],
      });
    });
  });
});
