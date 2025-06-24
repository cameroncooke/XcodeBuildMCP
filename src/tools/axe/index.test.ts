/**
 * Vitest tests for UI Testing Tools (AXe-based)
 *
 * Tests all UI automation tools from src/tools/axe.ts:
 * - describe_ui, tap, long_press, swipe, type_text, key_press, button, key_sequence, touch, gesture
 *
 * Tests actual production code, not mock implementations
 */

import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

// Mock external dependencies only
vi.mock('../utils/command.js', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('../utils/axe-helpers.js', () => ({
  areAxeToolsAvailable: vi.fn(() => true),
  createAxeNotAvailableResponse: vi.fn(() => ({
    content: [{ type: 'text', text: 'AXe tools not available' }],
    isError: true,
  })),
  getAxePath: vi.fn(() => '/path/to/axe'),
  getBundledAxeEnvironment: vi.fn(() => ({})),
}));

vi.mock('../utils/logger.js', () => ({
  log: vi.fn(),
}));

vi.mock('../utils/validation.js', () => ({
  createTextResponse: vi.fn((text: string) => ({
    content: [{ type: 'text', text }],
  })),
  validateRequiredParam: vi.fn(),
}));

vi.mock('../utils/errors.js', () => ({
  DependencyError: class DependencyError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'DependencyError';
    }
  },
  AxeError: class AxeError extends Error {
    constructor(
      message: string,
      public command: string,
      public axeOutput: string,
      public simulatorUuid: string,
    ) {
      super(message);
      this.name = 'AxeError';
    }
  },
  SystemError: class SystemError extends Error {
    constructor(
      message: string,
      public originalError?: Error,
    ) {
      super(message);
      this.name = 'SystemError';
    }
  },
  createErrorResponse: vi.fn((message: string, details?: string, errorType?: string) => ({
    content: [{ type: 'text', text: message }],
    isError: true,
  })),
}));

// Import production code
import { registerAxeTools } from './axe.js';
import { executeCommand } from '../../utils/command.js';
import { areAxeToolsAvailable } from '../../utils/axe-helpers.js';
import { validateRequiredParam } from '../../utils/validation.js';

// Create mock server for tool registration
const mockServer = {
  tool: vi.fn(),
} as any;

const mockExecuteCommand = executeCommand as MockedFunction<typeof executeCommand>;
const mockAreAxeToolsAvailable = areAxeToolsAvailable as MockedFunction<
  typeof areAxeToolsAvailable
>;
const mockValidateRequiredParam = validateRequiredParam as MockedFunction<
  typeof validateRequiredParam
>;

// Test fixtures
const validSimulatorUuid = 'B8F5B8E7-1234-4567-8901-123456789ABC';

const mockUIHierarchy = {
  type: 'Application',
  frame: { x: 0, y: 0, width: 414, height: 896 },
  children: [
    {
      type: 'Button',
      frame: { x: 100, y: 200, width: 80, height: 44 },
      label: 'Submit',
      enabled: true,
    },
  ],
};

// Store registered tools for testing
let registeredTools: Map<string, any> = new Map();

describe('AXe UI Testing Tools', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    registeredTools.clear();

    // Reset axe tools availability to true by default
    mockAreAxeToolsAvailable.mockReturnValue(true);

    // Set default successful command execution
    mockExecuteCommand.mockResolvedValue({
      success: true,
      output: JSON.stringify(mockUIHierarchy),
      error: '',
    });

    // Set default mock behavior for validation (will be overridden per test)
    mockValidateRequiredParam.mockReturnValue({ isValid: true });

    // Mock the server.tool method to capture tool registrations
    mockServer.tool.mockImplementation(
      (name: string, description: string, schema: any, handler: any) => {
        registeredTools.set(name, {
          name,
          description,
          schema,
          handler,
        });
      },
    );

    // Register the tools
    registerAxeTools(mockServer);
  });

  describe('describe_ui tool', () => {
    it('should reject missing simulatorUuid', async () => {
      const tool = registeredTools.get('describe_ui');
      expect(tool).toBeDefined();

      // Mock validation failure for missing simulatorUuid
      mockValidateRequiredParam.mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [
            {
              type: 'text',
              text: '❌ Required field: simulatorUuid',
            },
          ],
          isError: true,
        },
      });

      const params = {};
      const result = await tool.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('❌ Required field: simulatorUuid');
      expect(mockValidateRequiredParam).toHaveBeenCalledWith('simulatorUuid', undefined);
    });

    it('should accept invalid UUID format (production behavior)', async () => {
      const tool = registeredTools.get('describe_ui');
      expect(tool).toBeDefined();

      // Production code doesn't validate UUID format beyond checking it's provided
      const params = { simulatorUuid: 'invalid-uuid' };
      const result = await tool.handler(params);

      // Production executes the command even with invalid UUID
      expect(result.isError).toBeUndefined();
      expect(result.content).toEqual([
        {
          type: 'text',
          text:
            'Accessibility hierarchy retrieved successfully:\n```json\n' +
            JSON.stringify(mockUIHierarchy) +
            '\n```',
        },
        {
          type: 'text',
          text: 'Next Steps:\n- Use frame coordinates for tap/swipe (center: x+width/2, y+height/2)\n- Re-run describe_ui after layout changes\n- Screenshots are for visual verification only',
        },
      ]);
    });

    it('should return UI hierarchy successfully', async () => {
      const tool = registeredTools.get('describe_ui');
      expect(tool).toBeDefined();

      const params = { simulatorUuid: validSimulatorUuid };
      const result = await tool.handler(params);

      expect(result.isError).toBeUndefined();
      expect(result.content).toEqual([
        {
          type: 'text',
          text:
            'Accessibility hierarchy retrieved successfully:\n```json\n' +
            JSON.stringify(mockUIHierarchy) +
            '\n```',
        },
        {
          type: 'text',
          text: 'Next Steps:\n- Use frame coordinates for tap/swipe (center: x+width/2, y+height/2)\n- Re-run describe_ui after layout changes\n- Screenshots are for visual verification only',
        },
      ]);
    });

    it('should handle axe execution error', async () => {
      const tool = registeredTools.get('describe_ui');
      expect(tool).toBeDefined();

      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Simulator not found',
      });

      const params = { simulatorUuid: validSimulatorUuid };
      const result = await tool.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Failed to get accessibility hierarchy/);
    });
  });

  describe('tap tool', () => {
    it('should reject missing coordinates', async () => {
      const tool = registeredTools.get('tap');
      expect(tool).toBeDefined();

      // Mock validation success for simulatorUuid, then failure for x
      mockValidateRequiredParam
        .mockReturnValueOnce({ isValid: true }) // simulatorUuid passes
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [
              {
                type: 'text',
                text: '❌ Required field: x',
              },
            ],
            isError: true,
          },
        }); // x fails

      const params = { simulatorUuid: validSimulatorUuid };
      const result = await tool.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('❌ Required field: x');
      expect(mockValidateRequiredParam).toHaveBeenCalledWith('simulatorUuid', validSimulatorUuid);
      expect(mockValidateRequiredParam).toHaveBeenCalledWith('x', undefined);
    });

    it('should execute tap command successfully', async () => {
      const tool = registeredTools.get('tap');
      expect(tool).toBeDefined();

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Tap executed',
        error: '',
      });

      const params = {
        simulatorUuid: validSimulatorUuid,
        x: 200,
        y: 300,
      };
      const result = await tool.handler(params);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('Tap at (200, 300) simulated successfully.');
    });

    it('should handle optional delay parameters', async () => {
      const tool = registeredTools.get('tap');
      expect(tool).toBeDefined();

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Tap executed',
        error: '',
      });

      const params = {
        simulatorUuid: validSimulatorUuid,
        x: 150,
        y: 250,
        preDelay: 0.5,
        postDelay: 1.0,
      };
      const result = await tool.handler(params);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('Tap at (150, 250) simulated successfully.');
    });

    it('should accept negative delay parameter (production behavior)', async () => {
      const tool = registeredTools.get('tap');
      expect(tool).toBeDefined();

      // Production code doesn't validate delay ranges beyond checking they're numbers
      const params = {
        simulatorUuid: validSimulatorUuid,
        x: 100,
        y: 200,
        preDelay: -0.1,
      };
      const result = await tool.handler(params);

      // Production executes the command even with negative delay
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('Tap at (100, 200) simulated successfully.');
    });
  });

  describe('long_press tool', () => {
    it('should require duration parameter', async () => {
      const tool = registeredTools.get('long_press');
      expect(tool).toBeDefined();

      // Mock validation success for simulatorUuid, x, y, then failure for duration
      mockValidateRequiredParam
        .mockReturnValueOnce({ isValid: true }) // simulatorUuid passes
        .mockReturnValueOnce({ isValid: true }) // x passes
        .mockReturnValueOnce({ isValid: true }) // y passes
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [
              {
                type: 'text',
                text: '❌ Required field: duration',
              },
            ],
            isError: true,
          },
        }); // duration fails

      const params = {
        simulatorUuid: validSimulatorUuid,
        x: 100,
        y: 200,
      };
      const result = await tool.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('❌ Required field: duration');
      expect(mockValidateRequiredParam).toHaveBeenCalledWith('duration', undefined);
    });

    it('should execute long press successfully', async () => {
      const tool = registeredTools.get('long_press');
      expect(tool).toBeDefined();

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Long press executed',
        error: '',
      });

      const params = {
        simulatorUuid: validSimulatorUuid,
        x: 100,
        y: 200,
        duration: 1500,
      };
      const result = await tool.handler(params);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        'Long press at (100, 200) for 1500ms simulated successfully.',
      );
    });

    it('should accept negative duration (production behavior)', async () => {
      const tool = registeredTools.get('long_press');
      expect(tool).toBeDefined();

      // Production code doesn't validate duration being positive
      const params = {
        simulatorUuid: validSimulatorUuid,
        x: 100,
        y: 200,
        duration: -100,
      };
      const result = await tool.handler(params);

      // Production executes the command even with negative duration
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        'Long press at (100, 200) for -100ms simulated successfully.',
      );
    });
  });

  describe('swipe tool', () => {
    it('should require start and end coordinates', async () => {
      const tool = registeredTools.get('swipe');
      expect(tool).toBeDefined();

      // Mock validation success for simulatorUuid, x1, y1, then failure for x2
      mockValidateRequiredParam
        .mockReturnValueOnce({ isValid: true }) // simulatorUuid passes
        .mockReturnValueOnce({ isValid: true }) // x1 passes
        .mockReturnValueOnce({ isValid: true }) // y1 passes
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [
              {
                type: 'text',
                text: '❌ Required field: x2',
              },
            ],
            isError: true,
          },
        }); // x2 fails

      const params = {
        simulatorUuid: validSimulatorUuid,
        x1: 100,
        y1: 200,
      };
      const result = await tool.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('❌ Required field: x2');
      expect(mockValidateRequiredParam).toHaveBeenCalledWith('x2', undefined);
    });

    it('should execute swipe successfully', async () => {
      const tool = registeredTools.get('swipe');
      expect(tool).toBeDefined();

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Swipe executed',
        error: '',
      });

      const params = {
        simulatorUuid: validSimulatorUuid,
        x1: 100,
        y1: 200,
        x2: 300,
        y2: 400,
      };
      const result = await tool.handler(params);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        'Swipe from (100, 200) to (300, 400) simulated successfully.',
      );
    });

    it('should handle optional parameters', async () => {
      const tool = registeredTools.get('swipe');
      expect(tool).toBeDefined();

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Swipe executed',
        error: '',
      });

      const params = {
        simulatorUuid: validSimulatorUuid,
        x1: 100,
        y1: 200,
        x2: 300,
        y2: 400,
        duration: 2.0,
        delta: 5,
        preDelay: 0.5,
        postDelay: 1.0,
      };
      const result = await tool.handler(params);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        'Swipe from (100, 200) to (300, 400) duration=2s simulated successfully.',
      );
    });
  });

  describe('type_text tool', () => {
    it('should require text parameter', async () => {
      const tool = registeredTools.get('type_text');
      expect(tool).toBeDefined();

      // Mock validation success for simulatorUuid, then failure for text
      mockValidateRequiredParam
        .mockReturnValueOnce({ isValid: true }) // simulatorUuid passes
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [
              {
                type: 'text',
                text: '❌ Required field: text',
              },
            ],
            isError: true,
          },
        }); // text fails

      const params = { simulatorUuid: validSimulatorUuid };
      const result = await tool.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('❌ Required field: text');
      expect(mockValidateRequiredParam).toHaveBeenCalledWith('text', undefined);
    });

    it('should execute text typing successfully', async () => {
      const tool = registeredTools.get('type_text');
      expect(tool).toBeDefined();

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Text typed',
        error: '',
      });

      const params = {
        simulatorUuid: validSimulatorUuid,
        text: 'Hello World',
      };
      const result = await tool.handler(params);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('Text typing simulated successfully.');
    });

    it('should accept empty text (production behavior)', async () => {
      const tool = registeredTools.get('type_text');
      expect(tool).toBeDefined();

      const params = {
        simulatorUuid: validSimulatorUuid,
        text: '',
      };
      const result = await tool.handler(params);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('Text typing simulated successfully.');
    });
  });

  describe('key_press tool', () => {
    it('should require keyCode parameter', async () => {
      const tool = registeredTools.get('key_press');
      expect(tool).toBeDefined();

      // Mock validation success for simulatorUuid, then failure for keyCode
      mockValidateRequiredParam
        .mockReturnValueOnce({ isValid: true }) // simulatorUuid passes
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [
              {
                type: 'text',
                text: '❌ Required field: keyCode',
              },
            ],
            isError: true,
          },
        }); // keyCode fails

      const params = { simulatorUuid: validSimulatorUuid };
      const result = await tool.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('❌ Required field: keyCode');
      expect(mockValidateRequiredParam).toHaveBeenCalledWith('keyCode', undefined);
    });

    it('should execute key press successfully', async () => {
      const tool = registeredTools.get('key_press');
      expect(tool).toBeDefined();

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Key pressed',
        error: '',
      });

      const params = {
        simulatorUuid: validSimulatorUuid,
        keyCode: 40, // Return key
      };
      const result = await tool.handler(params);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('Key press (code: 40) simulated successfully.');
    });

    it('should accept out of range keyCode (production behavior)', async () => {
      const tool = registeredTools.get('key_press');
      expect(tool).toBeDefined();

      // Production code doesn't validate keyCode range
      const params = {
        simulatorUuid: validSimulatorUuid,
        keyCode: 256, // Out of range
      };
      const result = await tool.handler(params);

      // Production executes the command even with out of range keyCode
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('Key press (code: 256) simulated successfully.');
    });
  });

  describe('button tool', () => {
    it('should require buttonType parameter', async () => {
      const tool = registeredTools.get('button');
      expect(tool).toBeDefined();

      // Mock validation success for simulatorUuid, then failure for buttonType
      mockValidateRequiredParam
        .mockReturnValueOnce({ isValid: true }) // simulatorUuid passes
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [
              {
                type: 'text',
                text: '❌ Required field: buttonType',
              },
            ],
            isError: true,
          },
        }); // buttonType fails

      const params = { simulatorUuid: validSimulatorUuid };
      const result = await tool.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('❌ Required field: buttonType');
      expect(mockValidateRequiredParam).toHaveBeenCalledWith('buttonType', undefined);
    });

    it('should execute button press successfully', async () => {
      const tool = registeredTools.get('button');
      expect(tool).toBeDefined();

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Button pressed',
        error: '',
      });

      const params = {
        simulatorUuid: validSimulatorUuid,
        buttonType: 'home',
      };
      const result = await tool.handler(params);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe("Hardware button 'home' pressed successfully.");
    });

    it('should accept invalid buttonType enum (production behavior)', async () => {
      const tool = registeredTools.get('button');
      expect(tool).toBeDefined();

      // Production code doesn't validate buttonType enum values
      const params = {
        simulatorUuid: validSimulatorUuid,
        buttonType: 'invalid-button',
      };
      const result = await tool.handler(params);

      // Production executes the command even with invalid buttonType
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe("Hardware button 'invalid-button' pressed successfully.");
    });
  });

  describe('key_sequence tool', () => {
    it('should require keyCodes parameter', async () => {
      const tool = registeredTools.get('key_sequence');
      expect(tool).toBeDefined();

      // Mock validation success for simulatorUuid, then failure for keyCodes
      mockValidateRequiredParam
        .mockReturnValueOnce({ isValid: true }) // simulatorUuid passes
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [
              {
                type: 'text',
                text: '❌ Required field: keyCodes',
              },
            ],
            isError: true,
          },
        }); // keyCodes fails

      const params = { simulatorUuid: validSimulatorUuid };
      const result = await tool.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('❌ Required field: keyCodes');
      expect(mockValidateRequiredParam).toHaveBeenCalledWith('keyCodes', undefined);
    });

    it('should execute key sequence successfully', async () => {
      const tool = registeredTools.get('key_sequence');
      expect(tool).toBeDefined();

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Key sequence executed',
        error: '',
      });

      const params = {
        simulatorUuid: validSimulatorUuid,
        keyCodes: [40, 42, 44], // Return, Backspace, Space
      };
      const result = await tool.handler(params);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('Key sequence [40,42,44] executed successfully.');
    });

    it('should handle optional delay parameter', async () => {
      const tool = registeredTools.get('key_sequence');
      expect(tool).toBeDefined();

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Key sequence executed',
        error: '',
      });

      const params = {
        simulatorUuid: validSimulatorUuid,
        keyCodes: [40, 42],
        delay: 0.5,
      };
      const result = await tool.handler(params);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('Key sequence [40,42] executed successfully.');
    });
  });

  describe('touch tool', () => {
    it('should require coordinates', async () => {
      const tool = registeredTools.get('touch');
      expect(tool).toBeDefined();

      // Mock validation success for simulatorUuid, then failure for x
      mockValidateRequiredParam
        .mockReturnValueOnce({ isValid: true }) // simulatorUuid passes
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [
              {
                type: 'text',
                text: '❌ Required field: x',
              },
            ],
            isError: true,
          },
        }); // x fails

      const params = { simulatorUuid: validSimulatorUuid };
      const result = await tool.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('❌ Required field: x');
      expect(mockValidateRequiredParam).toHaveBeenCalledWith('x', undefined);
    });

    it('should execute touch down successfully', async () => {
      const tool = registeredTools.get('touch');
      expect(tool).toBeDefined();

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Touch executed',
        error: '',
      });

      const params = {
        simulatorUuid: validSimulatorUuid,
        x: 100,
        y: 200,
        down: true,
      };
      const result = await tool.handler(params);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        'Touch event (touch down) at (100, 200) executed successfully.',
      );
    });

    it('should execute touch up successfully', async () => {
      const tool = registeredTools.get('touch');
      expect(tool).toBeDefined();

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Touch executed',
        error: '',
      });

      const params = {
        simulatorUuid: validSimulatorUuid,
        x: 100,
        y: 200,
        up: true,
      };
      const result = await tool.handler(params);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        'Touch event (touch up) at (100, 200) executed successfully.',
      );
    });

    it('should execute touch down+up successfully', async () => {
      const tool = registeredTools.get('touch');
      expect(tool).toBeDefined();

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Touch executed',
        error: '',
      });

      const params = {
        simulatorUuid: validSimulatorUuid,
        x: 100,
        y: 200,
        down: true,
        up: true,
      };
      const result = await tool.handler(params);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe(
        'Touch event (touch down+up) at (100, 200) executed successfully.',
      );
    });

    it('should require at least one of down or up', async () => {
      const tool = registeredTools.get('touch');
      expect(tool).toBeDefined();

      const params = {
        simulatorUuid: validSimulatorUuid,
        x: 100,
        y: 200,
        // Neither down nor up specified
      };
      const result = await tool.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('At least one of "down" or "up" must be true');
    });
  });

  describe('gesture tool', () => {
    it('should require preset parameter', async () => {
      const tool = registeredTools.get('gesture');
      expect(tool).toBeDefined();

      // Mock validation success for simulatorUuid, then failure for preset
      mockValidateRequiredParam
        .mockReturnValueOnce({ isValid: true }) // simulatorUuid passes
        .mockReturnValueOnce({
          isValid: false,
          errorResponse: {
            content: [
              {
                type: 'text',
                text: '❌ Required field: preset',
              },
            ],
            isError: true,
          },
        }); // preset fails

      const params = { simulatorUuid: validSimulatorUuid };
      const result = await tool.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('❌ Required field: preset');
      expect(mockValidateRequiredParam).toHaveBeenCalledWith('preset', undefined);
    });

    it('should execute gesture successfully', async () => {
      const tool = registeredTools.get('gesture');
      expect(tool).toBeDefined();

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Gesture executed',
        error: '',
      });

      const params = {
        simulatorUuid: validSimulatorUuid,
        preset: 'scroll-up',
      };
      const result = await tool.handler(params);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe("Gesture 'scroll-up' executed successfully.");
    });

    it('should handle optional screen dimensions', async () => {
      const tool = registeredTools.get('gesture');
      expect(tool).toBeDefined();

      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: 'Gesture executed',
        error: '',
      });

      const params = {
        simulatorUuid: validSimulatorUuid,
        preset: 'swipe-from-left-edge',
        screenWidth: 414,
        screenHeight: 896,
      };
      const result = await tool.handler(params);

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe("Gesture 'swipe-from-left-edge' executed successfully.");
    });

    it('should accept invalid preset enum (production behavior)', async () => {
      const tool = registeredTools.get('gesture');
      expect(tool).toBeDefined();

      // Production code doesn't validate preset enum values
      const params = {
        simulatorUuid: validSimulatorUuid,
        preset: 'invalid-gesture',
      };
      const result = await tool.handler(params);

      // Production executes the command even with invalid preset
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe("Gesture 'invalid-gesture' executed successfully.");
    });
  });

  describe('error handling', () => {
    it('should handle missing axe tools', async () => {
      mockAreAxeToolsAvailable.mockReturnValue(false);

      // Clear and re-register tools with axe unavailable
      registeredTools.clear();
      mockServer.tool.mockClear();
      registerAxeTools(mockServer);

      // Should not register any tools when axe is unavailable
      expect(mockServer.tool).not.toHaveBeenCalled();
      expect(registeredTools.size).toBe(0);
    });

    it('should handle command execution failures', async () => {
      const tool = registeredTools.get('tap');
      expect(tool).toBeDefined();

      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Simulator not responding',
      });

      const params = {
        simulatorUuid: validSimulatorUuid,
        x: 100,
        y: 200,
      };
      const result = await tool.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Failed to simulate tap/);
    });

    it('should handle command execution exceptions', async () => {
      const tool = registeredTools.get('describe_ui');
      expect(tool).toBeDefined();

      mockExecuteCommand.mockRejectedValue(new Error('System error'));

      const params = { simulatorUuid: validSimulatorUuid };
      const result = await tool.handler(params);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/System error/);
    });
  });

  describe('tool registration validation', () => {
    it('should register all expected UI testing tools', () => {
      const expectedTools = [
        'describe_ui',
        'tap',
        'long_press',
        'swipe',
        'type_text',
        'key_press',
        'button',
        'key_sequence',
        'touch',
        'gesture',
      ];

      expectedTools.forEach((toolName) => {
        expect(registeredTools.has(toolName)).toBe(true);
      });

      expect(registeredTools.size).toBe(expectedTools.length);
    });

    it('should have proper tool descriptions', () => {
      const describeUITool = registeredTools.get('describe_ui');
      expect(describeUITool.description).toMatch(/Gets entire view hierarchy/);

      const tapTool = registeredTools.get('tap');
      expect(tapTool.description).toMatch(/Tap at specific coordinates/);

      const swipeTool = registeredTools.get('swipe');
      expect(swipeTool.description).toMatch(/Swipe from one point to another/);
    });

    it('should have valid schema for each tool', () => {
      registeredTools.forEach((tool, name) => {
        expect(tool.schema).toBeDefined();
        expect(typeof tool.handler).toBe('function');
        expect(tool.name).toBe(name);
      });
    });
  });
});
