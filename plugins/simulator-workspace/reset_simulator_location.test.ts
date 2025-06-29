/**
 * @file Test suite for reset_simulator_location plugin
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import resetSimulatorLocationPlugin from './reset_simulator_location.js';

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

vi.mock('../../src/utils/simctl.js', () => ({
  executeSimctlCommandAndRespond: vi.fn(),
}));

describe('reset_simulator_location plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export correct plugin structure', () => {
    expect(resetSimulatorLocationPlugin).toHaveProperty('name');
    expect(resetSimulatorLocationPlugin).toHaveProperty('description');
    expect(resetSimulatorLocationPlugin).toHaveProperty('schema');
    expect(resetSimulatorLocationPlugin).toHaveProperty('handler');
  });

  it('should have correct tool name', () => {
    expect(resetSimulatorLocationPlugin.name).toBe('reset_simulator_location');
  });

  it('should have correct description', () => {
    expect(resetSimulatorLocationPlugin.description).toBe("Resets the simulator's location to default.");
  });

  it('should have correct schema structure', () => {
    expect(resetSimulatorLocationPlugin.schema).toHaveProperty('simulatorUuid');
  });

  it('should have handler function', () => {
    expect(typeof resetSimulatorLocationPlugin.handler).toBe('function');
  });

  it('should export all required properties', () => {
    const expectedKeys = ['name', 'description', 'schema', 'handler'];
    expect(Object.keys(resetSimulatorLocationPlugin)).toEqual(expect.arrayContaining(expectedKeys));
    expect(Object.keys(resetSimulatorLocationPlugin)).toHaveLength(expectedKeys.length);
  });
});