/**
 * Plugin test for screenshot - Tests the plugin structure and integration
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import screenshotPlugin from './screenshot.js';

// Mock dependencies
vi.mock('../../src/utils/command.js', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('../../src/utils/logger.js', () => ({
  log: vi.fn(),
}));

vi.mock('../../src/utils/validation.js', () => ({
  validateRequiredParam: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid'),
}));

vi.mock('os', () => ({
  tmpdir: vi.fn(() => '/tmp'),
}));

// Import mocked functions for assertions
import { executeCommand } from '../../src/utils/command.js';
import { log } from '../../src/utils/logger.js';
import { validateRequiredParam } from '../../src/utils/validation.js';
import * as fs from 'fs/promises';

const mockExecuteCommand = vi.mocked(executeCommand);
const mockLog = vi.mocked(log);
const mockValidateRequiredParam = vi.mocked(validateRequiredParam);
const mockReadFile = vi.mocked(fs.readFile);
const mockUnlink = vi.mocked(fs.unlink);

describe('Screenshot Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Plugin Structure', () => {
    it('should have correct plugin structure', () => {
      expect(screenshotPlugin).toBeDefined();
      expect(screenshotPlugin.name).toBe('screenshot');
      expect(screenshotPlugin.description).toContain('Captures screenshot for visual verification');
      expect(screenshotPlugin.schema).toBeDefined();
      expect(screenshotPlugin.handler).toBeTypeOf('function');
    });

    it('should have valid schema with simulatorUuid', () => {
      expect(screenshotPlugin.schema).toHaveProperty('simulatorUuid');
      expect(screenshotPlugin.schema.simulatorUuid).toBeDefined();
    });
  });

  describe('Handler Integration', () => {
    it('should handle successful screenshot capture', async () => {
      const mockImageBuffer = Buffer.from('mock-image-data');
      
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: undefined,
      });
      
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Screenshot saved',
        error: null,
      });
      
      mockReadFile.mockResolvedValue(mockImageBuffer);
      mockUnlink.mockResolvedValue(undefined);

      const params = {
        simulatorUuid: '12345678-1234-1234-1234-123456789abc',
      };

      const result = await screenshotPlugin.handler(params);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toMatchObject({
        type: 'image',
        mimeType: 'image/png',
      });
      expect(result.content[0].data).toBe(mockImageBuffer.toString('base64'));
    });

    it('should handle invalid simulator UUID', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: false,
        errorResponse: {
          content: [
            {
              type: 'text',
              text: 'Invalid Simulator UUID format. Expected format: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
            },
          ],
          isError: true,
        },
      });

      const params = {
        simulatorUuid: 'invalid-uuid',
      };

      const result = await screenshotPlugin.handler(params);

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
    });

    it('should handle screenshot command failure', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: undefined,
      });
      
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Simulator not found',
      });

      const params = {
        simulatorUuid: '12345678-1234-1234-1234-123456789abc',
      };

      const result = await screenshotPlugin.handler(params);

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
    });

    it('should handle file read errors', async () => {
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: undefined,
      });
      
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Screenshot saved',
        error: null,
      });
      
      mockReadFile.mockRejectedValue(new Error('File read error'));

      const params = {
        simulatorUuid: '12345678-1234-1234-1234-123456789abc',
      };

      const result = await screenshotPlugin.handler(params);

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content).toBeDefined();
    });

    it('should construct correct simctl command', async () => {
      const mockImageBuffer = Buffer.from('mock-image-data');
      
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: undefined,
      });
      
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Screenshot saved',
        error: null,
      });
      
      mockReadFile.mockResolvedValue(mockImageBuffer);
      mockUnlink.mockResolvedValue(undefined);

      const params = {
        simulatorUuid: '12345678-1234-1234-1234-123456789abc',
      };

      await screenshotPlugin.handler(params);

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        expect.arrayContaining([
          'xcrun',
          'simctl',
          'io',
          '12345678-1234-1234-1234-123456789abc',
          'screenshot',
          expect.stringContaining('/tmp/screenshot_'),
        ]),
        expect.stringContaining('screenshot'),
        false
      );
    });

    it('should log appropriate messages', async () => {
      const mockImageBuffer = Buffer.from('mock-image-data');
      
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: undefined,
      });
      
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Screenshot saved',
        error: null,
      });
      
      mockReadFile.mockResolvedValue(mockImageBuffer);
      mockUnlink.mockResolvedValue(undefined);

      const params = {
        simulatorUuid: '12345678-1234-1234-1234-123456789abc',
      };

      await screenshotPlugin.handler(params);

      expect(mockLog).toHaveBeenCalledWith(
        'info',
        expect.stringContaining('[Screenshot]/screenshot: Starting capture')
      );
      expect(mockLog).toHaveBeenCalledWith(
        'info',
        expect.stringContaining('[Screenshot]/screenshot: Success for')
      );
      expect(mockLog).toHaveBeenCalledWith(
        'info',
        expect.stringContaining('[Screenshot]/screenshot: Successfully encoded image as Base64')
      );
    });

    it('should clean up temporary files', async () => {
      const mockImageBuffer = Buffer.from('mock-image-data');
      
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: undefined,
      });
      
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Screenshot saved',
        error: null,
      });
      
      mockReadFile.mockResolvedValue(mockImageBuffer);
      mockUnlink.mockResolvedValue(undefined);

      const params = {
        simulatorUuid: '12345678-1234-1234-1234-123456789abc',
      };

      await screenshotPlugin.handler(params);

      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringContaining('/tmp/screenshot_mock-uuid.png')
      );
    });

    it('should handle cleanup failures gracefully', async () => {
      const mockImageBuffer = Buffer.from('mock-image-data');
      
      mockValidateRequiredParam.mockReturnValue({
        isValid: true,
        errorResponse: undefined,
      });
      
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Screenshot saved',
        error: null,
      });
      
      mockReadFile.mockResolvedValue(mockImageBuffer);
      mockUnlink.mockRejectedValue(new Error('Cleanup failed'));

      const params = {
        simulatorUuid: '12345678-1234-1234-1234-123456789abc',
      };

      const result = await screenshotPlugin.handler(params);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]).toMatchObject({
        type: 'image',
        mimeType: 'image/png',
      });
      expect(mockLog).toHaveBeenCalledWith(
        'warning',
        expect.stringContaining('Failed to delete temporary file')
      );
    });
  });
});