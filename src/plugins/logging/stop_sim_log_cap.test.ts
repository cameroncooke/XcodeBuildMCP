/**
 * stop_sim_log_cap Plugin Tests - Test coverage for stop_sim_log_cap plugin
 *
 * This test file provides complete coverage for the stop_sim_log_cap plugin:
 * - Plugin structure validation
 * - Handler functionality (stop log capture session and retrieve captured logs)
 * - Error handling for validation and log capture failures
 *
 * Tests follow the canonical testing patterns from CLAUDE.md with deterministic
 * response validation and comprehensive parameter testing.
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';
import stopSimLogCap from './stop_sim_log_cap.ts';

// ✅ CORRECT: Mock log capture utilities
vi.mock('../../src/utils/log_capture.ts', () => ({
  stopLogCapture: vi.fn(),
}));

// ✅ CORRECT: Mock validation utilities
vi.mock('../../src/utils/validation.ts', () => ({
  validateRequiredParam: vi.fn(),
}));

// ✅ CORRECT: Mock common tools utilities
vi.mock('../../src/tools/common/index.ts', () => ({
  createTextContent: vi.fn(),
}));

describe('stop_sim_log_cap plugin', () => {
  let mockStopLogCapture: MockedFunction<any>;
  let mockValidateRequiredParam: MockedFunction<any>;
  let mockCreateTextContent: MockedFunction<any>;

  beforeEach(async () => {
    // Import and setup mocked log capture
    const logCaptureModule = await import('../../src/utils/log_capture.ts');
    mockStopLogCapture = logCaptureModule.stopLogCapture as MockedFunction<any>;

    // Import and setup mocked validation
    const validationModule = await import('../../src/utils/validation.ts');
    mockValidateRequiredParam = validationModule.validateRequiredParam as MockedFunction<any>;

    // Import and setup mocked common tools
    const commonModule = await import('../../src/tools/common/index.ts');
    mockCreateTextContent = commonModule.createTextContent as MockedFunction<any>;

    // Default mock behavior
    mockCreateTextContent.mockImplementation((text: string) => ({ type: 'text', text }));

    // Setup default validation mock
    mockValidateRequiredParam.mockReturnValue({
      isValid: true,
      errorResponse: null,
    });

    mockStopLogCapture.mockResolvedValue({
      logContent: 'Log content here',
      error: null,
    });

    vi.clearAllMocks();
  });

  describe('plugin structure', () => {
    it('should have correct plugin structure', () => {
      expect(stopSimLogCap).toHaveProperty('name');
      expect(stopSimLogCap).toHaveProperty('description');
      expect(stopSimLogCap).toHaveProperty('schema');
      expect(stopSimLogCap).toHaveProperty('handler');

      expect(stopSimLogCap.name).toBe('stop_sim_log_cap');
      expect(stopSimLogCap.description).toBe(
        'Stops an active simulator log capture session and returns the captured logs.',
      );
      expect(typeof stopSimLogCap.handler).toBe('function');
      expect(typeof stopSimLogCap.schema).toBe('object');
    });

    it('should have correct schema structure', () => {
      expect(stopSimLogCap.schema).toHaveProperty('logSessionId');
      expect(stopSimLogCap.schema.logSessionId).toHaveProperty('_def');
    });
  });

  describe('handler functionality', () => {
    it('should handle successful log capture stop', async () => {
      const params = { logSessionId: 'test-session-id' };

      // ✅ Test actual plugin handler
      const result = await stopSimLogCap.handler(params);

      expect(mockValidateRequiredParam).toHaveBeenCalledWith('logSessionId', params.logSessionId);
      expect(mockStopLogCapture).toHaveBeenCalledWith(params.logSessionId);
      expect(result.content).toEqual([
        {
          type: 'text',
          text: expect.stringContaining('Log capture session test-session-id stopped successfully'),
        },
      ]);
      expect(result.isError).toBeUndefined();
    });

    it('should handle validation errors', async () => {
      // Mock validation failure
      mockValidateRequiredParam.mockReturnValue({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: "Required parameter 'logSessionId' is missing." }],
          isError: true,
        },
      });

      const params = { logSessionId: '' };

      // ✅ Test actual plugin error handling
      const result = await stopSimLogCap.handler(params);

      expect(result.content).toEqual([
        { type: 'text', text: "Required parameter 'logSessionId' is missing." },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should handle log capture stop errors', async () => {
      // Mock stop log capture failure
      mockStopLogCapture.mockResolvedValue({
        logContent: null,
        error: 'Failed to stop log capture',
      });

      const params = { logSessionId: 'test-session-id' };

      // ✅ Test actual plugin error handling
      const result = await stopSimLogCap.handler(params);

      expect(result.content).toEqual([
        {
          type: 'text',
          text: 'Error stopping log capture session test-session-id: Failed to stop log capture',
        },
      ]);
      expect(result.isError).toBe(true);
    });

    it('should include log content in successful response', async () => {
      mockStopLogCapture.mockResolvedValue({
        logContent: 'Detailed log output with timestamps',
        error: null,
      });

      const params = { logSessionId: 'test-session-id' };

      // ✅ Test actual plugin handler
      const result = await stopSimLogCap.handler(params);

      expect(result.content[0].text).toContain('Detailed log output with timestamps');
      expect(result.content[0].text).toContain(
        'Log capture session test-session-id stopped successfully',
      );
    });
  });
});
