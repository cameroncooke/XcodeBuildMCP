/**
 * @file Test suite for set_network_condition plugin
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import setNetworkConditionPlugin from './set_network_condition.ts';

// Mock dependencies
vi.mock('../../src/utils/logger.ts', () => ({
  log: vi.fn(),
}));

vi.mock('../../src/utils/command.ts', () => ({
  executeCommand: vi.fn(),
}));

vi.mock('../../src/utils/validation.ts', () => ({
  validateRequiredParam: vi.fn(),
}));

describe('set_network_condition plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export correct plugin structure', () => {
    expect(setNetworkConditionPlugin).toHaveProperty('name');
    expect(setNetworkConditionPlugin).toHaveProperty('description');
    expect(setNetworkConditionPlugin).toHaveProperty('schema');
    expect(setNetworkConditionPlugin).toHaveProperty('handler');
  });

  it('should have correct tool name', () => {
    expect(setNetworkConditionPlugin.name).toBe('set_network_condition');
  });

  it('should have correct description', () => {
    expect(setNetworkConditionPlugin.description).toBe(
      'Simulates different network conditions (e.g., wifi, 3g, edge, high-latency, dsl, 100%loss, 3g-lossy, very-lossy) in the simulator.'
    );
  });

  it('should have correct schema structure', () => {
    expect(setNetworkConditionPlugin.schema).toHaveProperty('simulatorUuid');
    expect(setNetworkConditionPlugin.schema).toHaveProperty('profile');
  });

  it('should have handler function', () => {
    expect(typeof setNetworkConditionPlugin.handler).toBe('function');
  });

  it('should export all required properties', () => {
    const expectedKeys = ['name', 'description', 'schema', 'handler'];
    expect(Object.keys(setNetworkConditionPlugin)).toEqual(expect.arrayContaining(expectedKeys));
    expect(Object.keys(setNetworkConditionPlugin)).toHaveLength(expectedKeys.length);
  });
});