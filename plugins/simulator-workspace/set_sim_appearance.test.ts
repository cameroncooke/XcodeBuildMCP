import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import setSimAppearancePlugin from './set_sim_appearance.js';
import { registerSetSimulatorAppearanceTool } from '../../src/tools/simulator/index.js';

// Mock the executeCommand utility  
vi.mock('../../src/utils/command.js', () => ({
  executeCommand: vi.fn(),
}));

// Mock the log utility
vi.mock('../../src/utils/logger.js', () => ({
  log: vi.fn(),
}));

// Mock validation utilities
vi.mock('../../src/utils/validation.js', () => ({
  validateRequiredParam: vi.fn(),
}));

describe('set_sim_appearance plugin', () => {
  let mockExecuteCommand: MockedFunction<any>;
  let mockValidateRequiredParam: MockedFunction<any>;
  let mockServer: any;

  beforeEach(async () => {
    // Mock executeCommand
    const { executeCommand } = await import('../../src/utils/command.js');
    mockExecuteCommand = executeCommand as MockedFunction<any>;
    mockExecuteCommand.mockResolvedValue({
      success: true,
      output: '',
      error: '',
    });

    // Mock validation utilities
    const validationModule = await import('../../src/utils/validation.js');
    mockValidateRequiredParam = validationModule.validateRequiredParam as MockedFunction<any>;

    // Mock server object with tool method
    mockServer = {
      tool: vi.fn(),
    };

    // Default mock behaviors
    mockValidateRequiredParam.mockReturnValue({
      isValid: true,
      errorResponse: null,
    });

    vi.clearAllMocks();
  });

  it('should export correct structure', () => {
    expect(setSimAppearancePlugin).toHaveProperty('name');
    expect(setSimAppearancePlugin).toHaveProperty('description');
    expect(setSimAppearancePlugin).toHaveProperty('schema');
    expect(setSimAppearancePlugin).toHaveProperty('handler');
  });

  it('should have correct tool name', () => {
    expect(setSimAppearancePlugin.name).toBe('set_sim_appearance');
  });

  it('should have correct description', () => {
    expect(setSimAppearancePlugin.description).toBe('Sets the appearance mode (dark/light) of an iOS simulator.');
  });

  it('should have correct schema structure', () => {
    const schema = setSimAppearancePlugin.schema;
    expect(schema).toHaveProperty('simulatorUuid');
    expect(schema).toHaveProperty('mode');
    
    // Verify simulatorUuid schema
    expect(schema.simulatorUuid).toBeDefined();
    expect(schema.simulatorUuid._def.typeName).toBe('ZodString');
    
    // Verify mode schema  
    expect(schema.mode).toBeDefined();
    expect(schema.mode._def.typeName).toBe('ZodEnum');
    expect(schema.mode._def.values).toEqual(['dark', 'light']);
  });

  it('should have handler function', () => {
    expect(typeof setSimAppearancePlugin.handler).toBe('function');
  });

  it('should validate required parameters', () => {
    const schema = setSimAppearancePlugin.schema;
    
    // Test simulatorUuid validation - Note: Zod string allows empty strings by default
    expect(() => schema.simulatorUuid.parse('test-uuid')).not.toThrow();
    expect(() => schema.simulatorUuid.parse('')).not.toThrow(); // Empty string is valid for basic ZodString
    
    // Test mode validation
    expect(() => schema.mode.parse('dark')).not.toThrow();
    expect(() => schema.mode.parse('light')).not.toThrow();
    expect(() => schema.mode.parse('invalid')).toThrow();
  });

  describe('registerSetSimulatorAppearanceTool', () => {
    it('should register the set simulator appearance tool correctly', () => {
      registerSetSimulatorAppearanceTool(mockServer);

      expect(mockServer.tool).toHaveBeenCalledWith(
        'set_sim_appearance',
        'Sets the appearance mode (dark/light) of an iOS simulator.',
        expect.any(Object),
        expect.any(Function),
      );
    });

    it('should handle successful appearance change', async () => {
      registerSetSimulatorAppearanceTool(mockServer);

      const handlerCall = mockServer.tool.mock.calls.find(
        (call) => call[0] === 'set_sim_appearance',
      );
      const handler = handlerCall[3];

      // Mock successful execution
      mockExecuteCommand.mockResolvedValue({
        success: true,
        output: '',
        error: '',
      });

      const result = await handler({ 
        simulatorUuid: 'test-uuid-123',
        mode: 'dark'
      });

      expect(mockExecuteCommand).toHaveBeenCalledWith(
        ['xcrun', 'simctl', 'ui', 'test-uuid-123', 'appearance', 'dark'],
        'Set Simulator Appearance',
      );
      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: 'Successfully set simulator test-uuid-123 appearance to dark mode'
        }
      ]);
    });

    it('should handle appearance change failure', async () => {
      registerSetSimulatorAppearanceTool(mockServer);

      const handlerCall = mockServer.tool.mock.calls.find(
        (call) => call[0] === 'set_sim_appearance',
      );
      const handler = handlerCall[3];

      // Mock failed execution
      mockExecuteCommand.mockResolvedValue({
        success: false,
        output: '',
        error: 'Invalid device: invalid-uuid',
      });

      const result = await handler({ 
        simulatorUuid: 'invalid-uuid',
        mode: 'light'
      });

      expect(result.content).toEqual([
        { 
          type: 'text', 
          text: 'Failed to set simulator appearance: Invalid device: invalid-uuid'
        }
      ]);
    });
  });
});