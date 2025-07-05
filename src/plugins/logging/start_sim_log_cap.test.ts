/**
 * Tests for start_sim_log_cap plugin
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import plugin from './start_sim_log_cap.ts';

// Mock the log capture utility
vi.mock('../../src/utils/log_capture.ts', () => ({
  startLogCapture: vi.fn(),
}));

// Mock validation
vi.mock('../../src/utils/validation.ts', () => ({
  validateRequiredParam: vi.fn(),
}));

import { startLogCapture } from '../../utils/log_capture.ts';
import { validateRequiredParam } from '../../utils/validation.ts';

describe('start_sim_log_cap plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Plugin Structure', () => {
    it('should export an object with required properties', () => {
      expect(plugin).toHaveProperty('name');
      expect(plugin).toHaveProperty('description');
      expect(plugin).toHaveProperty('schema');
      expect(plugin).toHaveProperty('handler');
    });

    it('should have correct tool name', () => {
      expect(plugin.name).toBe('start_sim_log_cap');
    });

    it('should have correct description', () => {
      expect(plugin.description).toBe(
        'Starts capturing logs from a specified simulator. Returns a session ID. By default, captures only structured logs.',
      );
    });

    it('should have correct schema structure', () => {
      expect(plugin.schema).toHaveProperty('simulatorUuid');
      expect(plugin.schema).toHaveProperty('bundleId');
      expect(plugin.schema).toHaveProperty('captureConsole');
    });

    it('should have handler as a function', () => {
      expect(typeof plugin.handler).toBe('function');
    });
  });

  describe('Handler Functionality', () => {
    it('should return error when simulatorUuid validation fails', async () => {
      const mockErrorResponse = {
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'simulatorUuid is required' }],
          isError: true,
        },
      };

      vi.mocked(validateRequiredParam).mockReturnValue(mockErrorResponse);

      const result = await plugin.handler({
        simulatorUuid: '',
        bundleId: 'com.example.app',
      });

      expect(validateRequiredParam).toHaveBeenCalledWith('simulatorUuid', '');
      expect(result).toEqual(mockErrorResponse.errorResponse);
    });

    it('should return error when log capture fails', async () => {
      vi.mocked(validateRequiredParam).mockReturnValue({ isValid: true });
      vi.mocked(startLogCapture).mockResolvedValue({
        error: 'Failed to start log capture',
      });

      const result = await plugin.handler({
        simulatorUuid: 'test-uuid',
        bundleId: 'com.example.app',
      });

      expect(startLogCapture).toHaveBeenCalledWith({
        simulatorUuid: 'test-uuid',
        bundleId: 'com.example.app',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(
        'Error starting log capture: Failed to start log capture',
      );
    });

    it('should return success with session ID when log capture starts successfully', async () => {
      vi.mocked(validateRequiredParam).mockReturnValue({ isValid: true });
      vi.mocked(startLogCapture).mockResolvedValue({
        sessionId: 'test-session-123',
      });

      const result = await plugin.handler({
        simulatorUuid: 'test-uuid',
        bundleId: 'com.example.app',
      });

      expect(startLogCapture).toHaveBeenCalledWith({
        simulatorUuid: 'test-uuid',
        bundleId: 'com.example.app',
      });
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain(
        'Log capture started successfully. Session ID: test-session-123',
      );
      expect(result.content[0].text).toContain('Note: Only structured logs are being captured.');
    });

    it('should indicate console capture when captureConsole is true', async () => {
      vi.mocked(validateRequiredParam).mockReturnValue({ isValid: true });
      vi.mocked(startLogCapture).mockResolvedValue({
        sessionId: 'test-session-123',
      });

      const result = await plugin.handler({
        simulatorUuid: 'test-uuid',
        bundleId: 'com.example.app',
        captureConsole: true,
      });

      expect(startLogCapture).toHaveBeenCalledWith({
        simulatorUuid: 'test-uuid',
        bundleId: 'com.example.app',
        captureConsole: true,
      });
      expect(result.content[0].text).toContain(
        'Note: Your app was relaunched to capture console output.',
      );
    });

    it('should include next steps in success message', async () => {
      vi.mocked(validateRequiredParam).mockReturnValue({ isValid: true });
      vi.mocked(startLogCapture).mockResolvedValue({
        sessionId: 'test-session-123',
      });

      const result = await plugin.handler({
        simulatorUuid: 'test-uuid',
        bundleId: 'com.example.app',
      });

      expect(result.content[0].text).toContain('Next Steps:');
      expect(result.content[0].text).toContain(
        "Use 'stop_sim_log_cap' with session ID 'test-session-123'",
      );
    });
  });
});
