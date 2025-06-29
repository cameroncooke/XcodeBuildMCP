/**
 * @file screenshot.test.ts
 * @description Comprehensive tests for the screenshot plugin
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import screenshotPlugin from './screenshot.js';
import * as commandModule from '../../src/utils/command.js';
import * as fs from 'fs/promises';

// Mock the command module
vi.mock('../../src/utils/command.js');
const mockExecuteCommand = commandModule.executeCommand as MockedFunction<typeof commandModule.executeCommand>;

// Mock fs module
vi.mock('fs/promises');
const mockReadFile = fs.readFile as MockedFunction<typeof fs.readFile>;
const mockUnlink = fs.unlink as MockedFunction<typeof fs.unlink>;

describe('Screenshot Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Plugin Structure', () => {
    it('should export the correct plugin structure', () => {
      expect(screenshotPlugin).toHaveProperty('name');
      expect(screenshotPlugin).toHaveProperty('description');
      expect(screenshotPlugin).toHaveProperty('schema');
      expect(screenshotPlugin).toHaveProperty('handler');
    });

    it('should have correct tool name', () => {
      expect(screenshotPlugin.name).toBe('screenshot');
    });

    it('should have descriptive description', () => {
      expect(screenshotPlugin.description).toContain('screenshot');
      expect(screenshotPlugin.description).toContain('visual verification');
    });

    it('should export handler as a function', () => {
      expect(typeof screenshotPlugin.handler).toBe('function');
    });
  });

  describe('Schema Validation', () => {
    it('should define simulatorUuid schema', () => {
      expect(screenshotPlugin.schema).toHaveProperty('simulatorUuid');
    });

    it('should validate simulatorUuid as UUID format', () => {
      const simulatorUuidSchema = screenshotPlugin.schema.simulatorUuid;
      
      // Valid UUID should pass
      expect(() => simulatorUuidSchema.parse('550e8400-e29b-41d4-a716-446655440000')).not.toThrow();
      
      // Invalid UUID should fail
      expect(() => simulatorUuidSchema.parse('invalid-uuid')).toThrow();
      expect(() => simulatorUuidSchema.parse('')).toThrow();
      expect(() => simulatorUuidSchema.parse('12345')).toThrow();
    });
  });

  describe('Handler Integration', () => {
    const validParams = {
      simulatorUuid: '550e8400-e29b-41d4-a716-446655440000'
    };

    it('should return error for missing simulatorUuid', async () => {
      const result = await screenshotPlugin.handler({});
      
      expect(result).toHaveProperty('isError', true);
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0].text).toContain('simulatorUuid');
    });

    it('should return error for invalid simulatorUuid', async () => {
      // Mock the executeCommand to fail so we don't get undefined 'success' property
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Invalid UUID format',
        exitCode: 1
      });

      const result = await screenshotPlugin.handler({ simulatorUuid: 'invalid-uuid' });
      
      expect(result).toHaveProperty('isError', true);
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0].text).toContain('Failed to capture screenshot');
    });

    it('should handle command execution failure', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: 'Command failed',
        error: 'Simulator not found',
        exitCode: 1
      });

      const result = await screenshotPlugin.handler(validParams);
      
      expect(result).toHaveProperty('isError', true);
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0].text).toContain('Failed to capture screenshot');
    });

    it('should handle successful screenshot capture', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data', 'utf8');
      const expectedBase64 = mockImageBuffer.toString('base64');

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Screenshot saved',
        error: '',
        exitCode: 0
      });

      mockReadFile.mockResolvedValue(mockImageBuffer);
      mockUnlink.mockResolvedValue(undefined);

      const result = await screenshotPlugin.handler(validParams);
      
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'image');
      expect(result.content[0]).toHaveProperty('data', expectedBase64);
      expect(result.content[0]).toHaveProperty('mimeType', 'image/png');
    });

    it('should handle file reading errors', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Screenshot saved',
        error: '',
        exitCode: 0
      });

      mockReadFile.mockRejectedValue(new Error('File not found'));

      const result = await screenshotPlugin.handler(validParams);
      
      expect(result).toHaveProperty('isError', true);
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0].text).toContain('failed to process image file');
    });

    it('should execute correct simctl command', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data', 'utf8');

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Screenshot saved',
        error: '',
        exitCode: 0
      });

      mockReadFile.mockResolvedValue(mockImageBuffer);
      mockUnlink.mockResolvedValue(undefined);

      await screenshotPlugin.handler(validParams);
      
      expect(mockExecuteCommand).toHaveBeenCalledWith(
        expect.arrayContaining([
          'xcrun',
          'simctl',
          'io',
          validParams.simulatorUuid,
          'screenshot',
          expect.stringMatching(/screenshot_.*\.png$/)
        ]),
        expect.stringContaining('screenshot'),
        false
      );
    });

    it('should clean up temporary file after successful capture', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data', 'utf8');

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Screenshot saved',
        error: '',
        exitCode: 0
      });

      mockReadFile.mockResolvedValue(mockImageBuffer);
      mockUnlink.mockResolvedValue(undefined);

      await screenshotPlugin.handler(validParams);
      
      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringMatching(/screenshot_.*\.png$/)
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data', 'utf8');

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Screenshot saved',
        error: '',
        exitCode: 0
      });

      mockReadFile.mockResolvedValue(mockImageBuffer);
      mockUnlink.mockRejectedValue(new Error('Permission denied'));

      const result = await screenshotPlugin.handler(validParams);
      
      // Should still return successful result despite cleanup failure
      expect(result).toHaveProperty('content');
      expect(result.content[0]).toHaveProperty('type', 'image');
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors', async () => {
      mockExecuteCommand.mockRejectedValue(new Error('Unexpected error'));

      const result = await screenshotPlugin.handler({
        simulatorUuid: '550e8400-e29b-41d4-a716-446655440000'
      });
      
      expect(result).toHaveProperty('isError', true);
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0].text).toContain('unexpected error');
    });

    it('should preserve error details in response', async () => {
      const errorMessage = 'Custom error message';
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: errorMessage,
        exitCode: 1
      });

      const result = await screenshotPlugin.handler({
        simulatorUuid: '550e8400-e29b-41d4-a716-446655440000'
      });
      
      expect(result).toHaveProperty('isError', true);
      expect(result.content[0].text).toContain(errorMessage);
    });
  });
});