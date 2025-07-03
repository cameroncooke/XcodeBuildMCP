import { describe, it, expect, vi, beforeEach } from 'vitest';
import plugin from './describe_ui.ts';

// Mock all dependencies
vi.mock('../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

vi.mock('../../src/utils/validation.ts', () => ({
  validateRequiredParam: vi.fn(),
  createTextResponse: vi.fn(),
}));

vi.mock('../../src/utils/errors.ts', () => ({
  DependencyError: class DependencyError extends Error {},
  AxeError: class AxeError extends Error {
    constructor(message: string, command: string, output: string, simulatorUuid: string) {
      super(message);
      this.axeOutput = output;
      this.name = 'AxeError';
    }
    axeOutput: string;
  },
  SystemError: class SystemError extends Error {
    constructor(message: string, originalError?: Error) {
      super(message);
      this.originalError = originalError;
      this.name = 'SystemError';
    }
    originalError?: Error;
  },
  createErrorResponse: vi.fn(),
}));

vi.mock('../../src/utils/command.ts', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('../../src/utils/axe-helpers.ts', () => ({
  createAxeNotAvailableResponse: vi.fn(),
  getAxePath: vi.fn(),
  getBundledAxeEnvironment: vi.fn(),
  areAxeToolsAvailable: vi.fn(),
}));

describe('describe_ui plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('plugin structure', () => {
    it('should have the correct structure', () => {
      expect(plugin).toHaveProperty('name');
      expect(plugin).toHaveProperty('description');
      expect(plugin).toHaveProperty('schema');
      expect(plugin).toHaveProperty('handler');
    });

    it('should have correct name', () => {
      expect(plugin.name).toBe('describe_ui');
    });

    it('should have correct description', () => {
      expect(plugin.description).toBe('Gets entire view hierarchy with precise frame coordinates (x, y, width, height) for all visible elements. Use this before UI interactions or after layout changes - do NOT guess coordinates from screenshots. Returns JSON tree with frame data for accurate automation.');
    });

    it('should have correct schema structure', () => {
      expect(plugin.schema).toHaveProperty('simulatorUuid');
    });

    it('should have handler as async function', () => {
      expect(typeof plugin.handler).toBe('function');
      expect(plugin.handler.constructor.name).toBe('AsyncFunction');
    });
  });

  describe('plugin functionality', () => {
    const mockParams = {
      simulatorUuid: '12345678-1234-1234-1234-123456789abc',
    };

    it('should handle valid parameters', async () => {
      const { validateRequiredParam } = await import('../../src/utils/validation.ts');
      const { executeCommand } = await import('../../src/utils/command.ts');
      const { getAxePath } = await import('../../src/utils/axe-helpers.ts');

      vi.mocked(validateRequiredParam).mockReturnValue({ isValid: true });
      vi.mocked(getAxePath).mockReturnValue('/path/to/axe');
      vi.mocked(executeCommand).mockResolvedValue({
        success: true,
        output: '{"root": {"elements": []}}',
        error: '',
      });

      const result = await plugin.handler(mockParams);

      expect(validateRequiredParam).toHaveBeenCalledWith('simulatorUuid', mockParams.simulatorUuid);
      expect(executeCommand).toHaveBeenCalledWith(
        ['/path/to/axe', 'describe-ui', '--udid', mockParams.simulatorUuid],
        expect.any(String),
        false,
        undefined
      );
      expect(result).toHaveProperty('content');
    });

    it('should handle validation errors', async () => {
      const { validateRequiredParam } = await import('../../src/utils/validation.ts');
      const mockErrorResponse = { isError: true };

      vi.mocked(validateRequiredParam).mockReturnValue({
        isValid: false,
        errorResponse: mockErrorResponse,
      });

      const result = await plugin.handler(mockParams);

      expect(result).toBe(mockErrorResponse);
    });

    it('should handle dependency errors', async () => {
      const { validateRequiredParam } = await import('../../src/utils/validation.ts');
      const { getAxePath } = await import('../../src/utils/axe-helpers.ts');
      const { createAxeNotAvailableResponse } = await import('../../src/utils/axe-helpers.ts');

      const mockErrorResponse = { isError: true, content: [{ type: 'text', text: 'AXe not available' }] };

      vi.mocked(validateRequiredParam).mockReturnValue({ isValid: true });
      vi.mocked(getAxePath).mockReturnValue(null);
      vi.mocked(createAxeNotAvailableResponse).mockReturnValue(mockErrorResponse);

      const result = await plugin.handler(mockParams);

      expect(result).toBe(mockErrorResponse);
      expect(createAxeNotAvailableResponse).toHaveBeenCalled();
    });
  });
});