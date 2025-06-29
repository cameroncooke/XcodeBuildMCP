/**
 * Tests for stop_app_sim plugin
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import plugin from './stop_app_sim.js';

// Mock dependencies
vi.mock('../../src/utils/logger.js', () => ({
  log: vi.fn(),
}));

vi.mock('../../src/utils/command.js', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('../../src/utils/validation.js', () => ({
  validateRequiredParam: vi.fn(),
}));

describe('stop_app_sim plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct structure', () => {
    expect(plugin).toHaveProperty('name');
    expect(plugin).toHaveProperty('description');
    expect(plugin).toHaveProperty('schema');
    expect(plugin).toHaveProperty('handler');
  });

  it('should have correct name', () => {
    expect(plugin.name).toBe('stop_app_sim');
  });

  it('should have correct description', () => {
    expect(plugin.description).toBe(
      'Stops an app running in an iOS simulator. Requires simulatorUuid and bundleId.'
    );
  });

  it('should have correct schema with required parameters', () => {
    expect(plugin.schema).toHaveProperty('simulatorUuid');
    expect(plugin.schema).toHaveProperty('bundleId');
    
    // Check simulatorUuid schema
    expect(plugin.schema.simulatorUuid).toBeDefined();
    expect(plugin.schema.simulatorUuid._def).toBeDefined();
    expect(plugin.schema.simulatorUuid._def.typeName).toBe('ZodString');
    
    // Check bundleId schema
    expect(plugin.schema.bundleId).toBeDefined();
    expect(plugin.schema.bundleId._def).toBeDefined();
    expect(plugin.schema.bundleId._def.typeName).toBe('ZodString');
  });

  it('should have handler as a function', () => {
    expect(typeof plugin.handler).toBe('function');
  });

  it('should return error response for missing simulatorUuid', async () => {
    const { validateRequiredParam } = await import('../../src/utils/validation.js');
    
    vi.mocked(validateRequiredParam).mockReturnValueOnce({
      isValid: false,
      errorResponse: {
        content: [{ type: 'text', text: 'simulatorUuid is required' }],
        isError: true,
      },
    });

    const result = await plugin.handler({ bundleId: 'com.example.App' });
    
    expect(validateRequiredParam).toHaveBeenCalledWith('simulatorUuid', undefined);
    expect(result).toEqual({
      content: [{ type: 'text', text: 'simulatorUuid is required' }],
      isError: true,
    });
  });

  it('should return error response for missing bundleId', async () => {
    const { validateRequiredParam } = await import('../../src/utils/validation.js');
    
    vi.mocked(validateRequiredParam)
      .mockReturnValueOnce({ isValid: true })
      .mockReturnValueOnce({
        isValid: false,
        errorResponse: {
          content: [{ type: 'text', text: 'bundleId is required' }],
          isError: true,
        },
      });

    const result = await plugin.handler({ simulatorUuid: 'test-uuid' });
    
    expect(validateRequiredParam).toHaveBeenCalledWith('bundleId', undefined);
    expect(result).toEqual({
      content: [{ type: 'text', text: 'bundleId is required' }],
      isError: true,
    });
  });

  it('should stop app successfully', async () => {
    const { validateRequiredParam } = await import('../../src/utils/validation.js');
    const { executeCommand } = await import('../../src/utils/command.js');
    
    vi.mocked(validateRequiredParam).mockReturnValue({ isValid: true });
    vi.mocked(executeCommand).mockResolvedValue({
      success: true,
      stdout: '',
      stderr: '',
    });

    const params = {
      simulatorUuid: 'test-uuid',
      bundleId: 'com.example.App',
    };

    const result = await plugin.handler(params);
    
    expect(executeCommand).toHaveBeenCalledWith(
      ['xcrun', 'simctl', 'terminate', 'test-uuid', 'com.example.App'],
      'Stop App in Simulator'
    );
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: '✅ App com.example.App stopped successfully in simulator test-uuid',
        },
      ],
    });
  });

  it('should handle command failure', async () => {
    const { validateRequiredParam } = await import('../../src/utils/validation.js');
    const { executeCommand } = await import('../../src/utils/command.js');
    
    vi.mocked(validateRequiredParam).mockReturnValue({ isValid: true });
    vi.mocked(executeCommand).mockResolvedValue({
      success: false,
      error: 'Simulator not found',
      stdout: '',
      stderr: '',
    });

    const params = {
      simulatorUuid: 'invalid-uuid',
      bundleId: 'com.example.App',
    };

    const result = await plugin.handler(params);
    
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Stop app in simulator operation failed: Simulator not found',
        },
      ],
      isError: true,
    });
  });

  it('should handle unexpected errors', async () => {
    const { validateRequiredParam } = await import('../../src/utils/validation.js');
    const { executeCommand } = await import('../../src/utils/command.js');
    
    vi.mocked(validateRequiredParam).mockReturnValue({ isValid: true });
    vi.mocked(executeCommand).mockRejectedValue(new Error('Unexpected error'));

    const params = {
      simulatorUuid: 'test-uuid',
      bundleId: 'com.example.App',
    };

    const result = await plugin.handler(params);
    
    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: 'Stop app in simulator operation failed: Unexpected error',
        },
      ],
      isError: true,
    });
  });
});